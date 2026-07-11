from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, F, DecimalField, ExpressionWrapper, Count
from django.utils import timezone
from decimal import Decimal
import datetime

# Explicit dependencies from your inventory module
from inventory.models import Branch, Vendor, Product, StoreStock, ShopStock, SupplyLog, InternalTransfer

# Explicit dependencies from your sales module models layer
from sales.models import (
    DailySession, SessionDigitalBalance, SessionExpense, 
    CustomerCredit, ManagerShortageLedger, 
    VendorCreditProfile, VendorSettlement
)

# Explicit dependencies from your employee module layers
from employee.models import EmployeeProfile, EmployeeLedgerEntry, PayslipRun




# DASHBOARD FOR THE INVENTORY APP

class InventoryAnalyticsView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            # =================================================================
            # 1. TOP-ROW STRATEGIC METRIC CARDS (AT-A-GLANCE KPIs)
            # =================================================================
            
            # --- Total Inventory Asset Valuation (ETB) ---
            # Formula: (StoreStock * pieces_per_pack * buying_price_per_piece) + (ShopStock * buying_price_per_piece)
            store_valuation = StoreStock.objects.aggregate(
                total=Sum(
                    F('quantity_in_packs') * 
                    F('product__pieces_per_pack') * 
                    F('product__buying_price_per_piece'),
                    output_field=DecimalField()
                )
            )['total'] or Decimal('0.00')

            shop_valuation = ShopStock.objects.aggregate(
                total=Sum(
                    F('quantity_in_pieces') * 
                    F('product__buying_price_per_piece'),
                    output_field=DecimalField()
                )
            )['total'] or Decimal('0.00')

            total_asset_valuation = store_valuation + shop_valuation

            # --- Active Vendor Debt (Unpaid Supplies) ---
            # Formula: Sum of SupplyLog where is_paid_to_vendor=False
            vendor_debt = SupplyLog.objects.filter(is_paid_to_vendor=False).aggregate(
                total=Sum(
                    F('packs_received') * 
                    F('product__pieces_per_pack') * 
                    F('product__buying_price_per_piece'),
                    output_field=DecimalField()
                )
            )['total'] or Decimal('0.00')

            # --- Critical Out-of-Stock / Low Stock Alerts ---
            # Corrected Formula: Scans all existing inventory positions to count products completely flat empty (0 packs AND 0 pieces) inside any branch assignment
            empty_stores = set(StoreStock.objects.filter(quantity_in_packs=0).values_list('branch_id', 'product_id'))
            empty_shops = set(ShopStock.objects.filter(quantity_in_pieces=0).values_list('branch_id', 'product_id'))
            
            # Intersection gives true local stockouts across your physical operating locations
            stockout_count = len(empty_stores.intersection(empty_shops))


            # =================================================================
            # 2. HIGH-IMPACT CHARTS & VISUALIZATIONS
            # =================================================================
            
            # --- Chart 1: Inventory Valuation Split by Branch (Donut Chart) ---
            branch_data = []
            for branch in Branch.objects.all():
                b_store = StoreStock.objects.filter(branch=branch).aggregate(
                    total=Sum(F('quantity_in_packs') * F('product__pieces_per_pack') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )['total'] or Decimal('0.00')
                
                b_shop = ShopStock.objects.filter(branch=branch).aggregate(
                    total=Sum(F('quantity_in_pieces') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )['total'] or Decimal('0.00')
                
                branch_data.append({
                    "branch_name": branch.name,
                    "valuation": b_store + b_shop
                })

            # --- Chart 2: Inventory Breakdown by Product Category (Bar Chart) ---
            category_data = []
            for cat_code, cat_name in Product.CATEGORY_CHOICES:
                c_store = StoreStock.objects.filter(product__category=cat_code).aggregate(
                    total=Sum(F('quantity_in_packs') * F('product__pieces_per_pack') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )['total'] or Decimal('0.00')
                
                c_shop = ShopStock.objects.filter(product__category=cat_code).aggregate(
                    total=Sum(F('quantity_in_pieces') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )['total'] or Decimal('0.00')
                
                category_data.append({
                    "category": cat_name,
                    "valuation": c_store + c_shop
                })

            # --- Chart 3: Product Flow & Refill Volatility (Line Chart) ---
            # Tracks daily volumes of InternalTransfer packs moved across the last 30 operational days
            thirty_days_ago = timezone.now() - datetime.timedelta(days=30)
            refill_logs = InternalTransfer.objects.filter(timestamp__gte=thirty_days_ago).values('timestamp__date').annotate(
                total_moves=Sum('packs_moved')
            ).order_by('timestamp__date')

            timeline_data = [
                {"date": log['timestamp__date'].strftime('%Y-%m-%d'), "packs_moved": log['total_moves']}
                for log in refill_logs
            ]


            # =================================================================
            # 3. 🌟 COMPLETE ALL-VENDORS AUDIT SHEET (Your custom preference)
            # =================================================================
            vendor_list_summary = []
            for vendor in Vendor.objects.all():
                # Normalized Total volume calculated straight in basic singular pieces unit parameters
                total_pieces_supplied = SupplyLog.objects.filter(product__vendor=vendor).aggregate(
                    vol=Sum(F('packs_received') * F('product__pieces_per_pack'))
                )['vol'] or 0
                
                # Pending debt calculations
                unpaid_balance = SupplyLog.objects.filter(product__vendor=vendor, is_paid_to_vendor=False).aggregate(
                    total=Sum(F('packs_received') * F('product__pieces_per_pack') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )['total'] or Decimal('0.00')
                
                vendor_list_summary.append({
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "contact_person": vendor.contact_person,
                    "total_pieces_received": int(total_pieces_supplied),
                    "pending_debt": unpaid_balance
                })
            
            # Returns ALL vendors cleanly categorized by debt exposure and supply scale volume
            vendor_list_summary = sorted(vendor_list_summary, key=lambda x: (x['pending_debt'], x['total_pieces_received']), reverse=True)


            # =================================================================
            # 4. JSON RESPONSE ENVELOPE STRUCTURING
            # =================================================================
            return Response({
                "metrics": {
                    "total_asset_valuation": total_asset_valuation,
                    "active_vendor_debt": vendor_debt,
                    "stockout_warning_count": stockout_count
                },
                "charts": {
                    "branch_valuation_split": branch_data,
                    "category_investment_split": category_data,
                    "refill_timeline_trends": timeline_data
                },
                "vendors_ledger": vendor_list_summary
            }, status=status.HTTP_200_OK)

        except Exception as err:
            return Response({"error": f"Analytics engine failed: {str(err)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)






# DASHBOARD FOR SALES APP 




class SalesAnalyticsView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            today = timezone.now().date()
            thirty_days_ago = today - datetime.timedelta(days=30)

            # =================================================================
            # 1. TOP-ROW STRATEGIC METRIC CARDS (AT-A-GLANCE KPIs)
            # =================================================================
            
            # --- Gross Revenue Generated Today ---
            today_sessions = DailySession.objects.filter(trading_date=today)
            gross_revenue_today = today_sessions.aggregate(total=Sum('total_sales'))['total'] or Decimal('0.00')

            # --- Total Active Accumulating Shortages Balance ---
            active_shortages = ManagerShortageLedger.objects.filter(
                payroll_cycle_date__isnull=True
            ).aggregate(total=Sum('shortage_amount'))['total'] or Decimal('0.00')

            # --- Total Outstanding Customer Credit Balance ---
            total_customer_debt = CustomerCredit.objects.aggregate(total=Sum('total_balance'))['total'] or Decimal('0.00')

            # --- Net Realized Cash Flow Intake Today ---
            cash_handed_over = today_sessions.aggregate(total=Sum('cash_handed_to_admin'))['total'] or Decimal('0.00')
            cash_retained = today_sessions.aggregate(total=Sum('cash_retained_for_change'))['total'] or Decimal('0.00')
            expenses_today = today_sessions.aggregate(total=Sum('total_expenses'))['total'] or Decimal('0.00')
            
            digital_delta_today = SessionDigitalBalance.objects.filter(
                session__trading_date=today
            ).aggregate(total=Sum('revenue_delta'))['total'] or Decimal('0.00')

            net_realized_cash_today = (cash_handed_over + cash_retained + digital_delta_today) - expenses_today

            # =================================================================
            # 2. HIGH-IMPACT CHARTS & VISUALIZATIONS
            # =================================================================
            
            # --- Chart 1: Revenue vs. Shortages Timeline Trend (30 Days) ---
            timeline_data = []
            for i in range(30, -1, -1):
                target_date = today - datetime.timedelta(days=i)
                day_sessions = DailySession.objects.filter(trading_date=target_date)
                
                day_sales = day_sessions.aggregate(total=Sum('total_sales'))['total'] or Decimal('0.00')
                day_shortages = ManagerShortageLedger.objects.filter(
                    session__trading_date=target_date
                ).aggregate(total=Sum('shortage_amount'))['total'] or Decimal('0.00')
                
                timeline_data.append({
                    "date": target_date.strftime('%Y-%m-%d'),
                    "gross_sales": day_sales,
                    "shortages_logged": day_shortages
                })

            # --- Chart 2: Branch Revenue Performance Rankings Leaderboard ---
            branch_performance = []
            for branch in Branch.objects.all():
                total_branch_sales = DailySession.objects.filter(
                    branch=branch
                ).aggregate(total=Sum('total_sales'))['total'] or Decimal('0.00')
                
                branch_performance.append({
                    "branch_name": branch.name,
                    "total_sales_revenue": total_branch_sales
                })
            branch_performance = sorted(branch_performance, key=lambda x: x['total_sales_revenue'], reverse=True)

            # --- Chart 3: Composition Component Split of Total Business Value Intake ---
            all_time_sales = DailySession.objects.aggregate(total=Sum('total_sales'))['total'] or Decimal('1.00') # prevent ZeroDivision
            total_cash_reconciled = DailySession.objects.aggregate(total=Sum('cash_handed_to_admin'))['total'] or Decimal('0.00')
            total_digital_collected = SessionDigitalBalance.objects.aggregate(total=Sum('revenue_delta'))['total'] or Decimal('0.00')
            total_credit_issued = DailySession.objects.aggregate(total=Sum('total_new_credit'))['total'] or Decimal('0.00')

            composition_split = {
                "physical_cash_percentage": round((total_cash_reconciled / all_time_sales) * 100, 2),
                "digital_wallet_percentage": round((total_digital_collected / all_time_sales) * 100, 2),
                "credit_payouts_percentage": round((total_credit_issued / all_time_sales) * 100, 2)
            }

            # =================================================================
            # 3. 🌟 COMPLETE VENDORS FINANCIAL CREDIT MATRIX GRID
            # =================================================================
            vendor_sales_summary = []
            for vendor in Vendor.objects.all():
                # Extract pre-payment advance deposit balance
                credit_profile = getattr(vendor, 'credit_profile', None)
                advance_float = credit_profile.current_advance_balance if credit_profile else Decimal('0.00')
                
                # Dynamic aggregated total settlement metrics definitions
                vendor_settlements = VendorSettlement.objects.filter(vendor=vendor)
                aggregated_debt = vendor_settlements.aggregate(total=Sum('remaining_debt'))['total'] or Decimal('0.00')
                
                unpaid_count = vendor_settlements.filter(payment_status='UNPAID').count()
                partial_count = vendor_settlements.filter(payment_status='PARTIAL').count()
                full_count = vendor_settlements.filter(payment_status='FULL').count()

                vendor_sales_summary.append({
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "advance_prepayment_balance": advance_float,
                    "total_outstanding_debt": aggregated_debt,
                    "settlements_status_metrics": {
                        "unpaid": unpaid_count,
                        "partial": partial_count,
                        "fully_paid": full_count
                    }
                })
            vendor_sales_summary = sorted(vendor_sales_summary, key=lambda x: x['total_outstanding_debt'], reverse=True)

            # =================================================================
            # 4. JSON RESPONSE PACKAGING
            # =================================================================
            return Response({
                "metrics": {
                    "gross_revenue_today": gross_revenue_today,
                    "active_shortages_unsettled": active_shortages,
                    "total_customer_debt": total_customer_debt,
                    "net_cash_intake_today": net_realized_cash_today
                },
                "charts": {
                    "revenue_shortage_timeline": timeline_data,
                    "branch_sales_leaderboard": branch_performance,
                    "revenue_composition_mix": composition_split
                },
                "vendors_credit_ledger": vendor_sales_summary
            }, status=status.HTTP_200_OK)

        except Exception as err:
            return Response({"error": f"Sales analytics pipeline error: {str(err)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)









# DASHBOARD FOR EMPLOYEE APP


class EmployeeAnalyticsView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            today = timezone.now().date()

            # =================================================================
            # 1. TOP-ROW STRATEGIC METRIC CARDS (AT-A-GLANCE KPIs)
            # =================================================================
            active_profiles = EmployeeProfile.objects.filter(status='ACTIVE')
            
            # --- Total Active Headcount ---
            total_active_staff = active_profiles.count()

            # --- Total Unsettled Advances & Fines Liability ---
            unsettled_ledger_total = EmployeeLedgerEntry.objects.filter(
                is_settled=False
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

            # --- Cumulative Disbursed Net Payroll (All-Time) ---
            cumulative_net_payout = PayslipRun.objects.aggregate(
                total=Sum('final_net_cash_payout')
            )['total'] or Decimal('0.00')

            # --- Next Estimated Gross Monthly Payroll Run Baseline ---
            projected_gross_payroll = active_profiles.aggregate(
                total=Sum('monthly_salary')
            )['total'] or Decimal('0.00')

            # =================================================================
            # 2. HIGH-IMPACT CHARTS & VISUALIZATIONS
            # =================================================================
            
            # --- Chart 1: Personnel Distribution by Job Function (Donut Chart) ---
            role_distribution = []
            for role_code, role_name in EmployeeProfile.JOB_ROLE_CHOICES:
                count = active_profiles.filter(job_role=role_code).count()
                role_distribution.append({
                    "role_display": role_name,
                    "staff_count": count
                })

            # --- Chart 2: Historical Corporate Payroll Outflows (Last 6 Months Trend) ---
            # Groups historical runs by month to show absolute cost pacing metrics
            six_months_ago = today - datetime.timedelta(days=180)
            historical_runs = PayslipRun.objects.filter(executed_at__date__gte=six_months_ago)
            
            # Extract historical items grouped cleanly by year-month intervals
            payroll_monthly_trends = []
            # Gather past six months dynamically
            for i in range(5, -1, -1):
                check_date = today - datetime.timedelta(days=i*30)
                month_start = check_date.replace(day=1)
                
                # Simple month name formatting
                month_label = month_start.strftime('%B %Y')
                
                monthly_payslips = PayslipRun.objects.filter(
                    executed_at__year=month_start.year,
                    executed_at__month=month_start.month
                )
                
                gross_snap = monthly_payslips.aggregate(total=Sum('base_salary_snapshot'))['total'] or Decimal('0.00')
                net_snap = monthly_payslips.aggregate(total=Sum('final_net_cash_payout'))['total'] or Decimal('0.00')
                
                payroll_monthly_trends.append({
                    "month": month_label,
                    "gross_expenditure": gross_snap,
                    "net_distribution": net_snap
                })

            # --- Chart 3: Outstanding Ledger Balances Split per Branch (Stacked Bar Chart) ---
            branch_liabilities = []
            for branch in Branch.objects.all():
                advances = EmployeeLedgerEntry.objects.filter(
                    employee__branch=branch, entry_type='ADVANCE', is_settled=False
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                adjustments = EmployeeLedgerEntry.objects.filter(
                    employee__branch=branch, entry_type='ADJUSTMENT', is_settled=False
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                # Only include branch if there are active staff or active liabilities
                if EmployeeProfile.objects.filter(branch=branch).exists() or (advances + adjustments) > 0:
                    branch_liabilities.append({
                        "branch_name": branch.name,
                        "cash_advances": advances,
                        "deduction_fines": adjustments
                    })

            # =================================================================
            # 3. 🌟 COMPLETE WORKFORCE PAYROLL & LIABILITY LEDGER GRID
            # =================================================================
            workforce_ledger = []
            for emp in EmployeeProfile.objects.all().order_by('full_name'):
                # Tenure counting mapping logic context
                tenure_days = max(0, (today - emp.job_start_date).days)
                
                # Active individual outstandings summaries splits
                emp_advances = EmployeeLedgerEntry.objects.filter(
                    employee=emp, entry_type='ADVANCE', is_settled=False
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                emp_fines = EmployeeLedgerEntry.objects.filter(
                    employee=emp, entry_type='ADJUSTMENT', is_settled=False
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                payslip_count = PayslipRun.objects.filter(employee=emp).count()

                workforce_ledger.append({
                    "employee_id": emp.id,
                    "full_name": emp.full_name,
                    "job_role": emp.get_job_role_display(),
                    "branch_name": emp.branch.name,
                    "status": emp.status,
                    "monthly_salary": emp.monthly_salary,
                    "tenure_days": tenure_days,
                    "outstanding_advances": emp_advances,
                    "outstanding_fines": emp_fines,
                    "completed_payslips_count": payslip_count
                })

            # =================================================================
            # 4. JSON METRICS PAYLOAD RESPONSE
            # =================================================================
            return Response({
                "metrics": {
                    "total_active_headcount": total_active_staff,
                    "unsettled_advances_total": unsettled_ledger_total,
                    "cumulative_net_payroll": cumulative_net_payout,
                    "projected_gross_monthly_payroll": projected_gross_payroll
                },
                "charts": {
                    "role_distribution_split": role_distribution,
                    "payroll_historical_trends": payroll_monthly_trends,
                    "branch_liability_breakdown": branch_liabilities
                },
                "workforce_audit_ledger": workforce_ledger
            }, status=status.HTTP_200_OK)

        except Exception as err:
            return Response({"error": f"Workforce analytics processing failure: {str(err)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)