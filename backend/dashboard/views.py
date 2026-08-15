from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, F, DecimalField, Count
from django.utils import timezone
from decimal import Decimal
import datetime

# Explicit dependencies from your inventory module
from inventory.models import Branch, Vendor, Product, StoreStock, ShopStock, SupplyLog, InternalTransfer

# Explicit dependencies from your sales module models layer
from sales.models import (
    DailySession, SessionDigitalBalance,
    CustomerCredit, ManagerShortageLedger,
    VendorCreditProfile, VendorSettlement
)

# Explicit dependencies from your employee module layers
from employee.models import EmployeeProfile, EmployeeLedgerEntry, PayslipRun

from core.permissions import IsAdmin

# DASHBOARD FOR THE INVENTORY APP

class InventoryAnalyticsView(APIView):
    permission_classes = [IsAdmin]

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
            # A (branch, product) position is a real stockout when its COMBINED store+shop
            # quantity is zero - checking each table in isolation misses direct-to-shop
            # products (Khat, Nuts) which never get a StoreStock row at all, and store-only
            # products that haven't been transferred to the shop floor yet.
            store_pieces_by_position = {}
            for row in StoreStock.objects.select_related('product'):
                key = (row.branch_id, row.product_id)
                pieces_per_pack = row.product.pieces_per_pack or 1
                store_pieces_by_position[key] = store_pieces_by_position.get(key, 0) + (row.quantity_in_packs or 0) * pieces_per_pack

            shop_pieces_by_position = {}
            for row in ShopStock.objects.all():
                key = (row.branch_id, row.product_id)
                shop_pieces_by_position[key] = shop_pieces_by_position.get(key, 0) + (row.quantity_in_pieces or 0)

            all_positions = set(store_pieces_by_position) | set(shop_pieces_by_position)
            stockout_count = sum(
                1 for key in all_positions
                if store_pieces_by_position.get(key, 0) + shop_pieces_by_position.get(key, 0) <= 0
            )


            # =================================================================
            # 2. HIGH-IMPACT CHARTS & VISUALIZATIONS
            # =================================================================
            
            # --- Chart 1: Inventory Valuation Split by Branch (Donut Chart) ---
            store_valuation_by_branch = {
                row['branch__name']: row['total'] or Decimal('0.00')
                for row in StoreStock.objects.values('branch__name').annotate(
                    total=Sum(F('quantity_in_packs') * F('product__pieces_per_pack') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )
            }
            shop_valuation_by_branch = {
                row['branch__name']: row['total'] or Decimal('0.00')
                for row in ShopStock.objects.values('branch__name').annotate(
                    total=Sum(F('quantity_in_pieces') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )
            }
            branch_data = [
                {
                    "branch_name": branch.name,
                    "valuation": store_valuation_by_branch.get(branch.name, Decimal('0.00')) + shop_valuation_by_branch.get(branch.name, Decimal('0.00'))
                }
                for branch in Branch.objects.all()
            ]

            # --- Chart 2: Inventory Breakdown by Product Category (Bar Chart) ---
            store_valuation_by_category = {
                row['product__category']: row['total'] or Decimal('0.00')
                for row in StoreStock.objects.values('product__category').annotate(
                    total=Sum(F('quantity_in_packs') * F('product__pieces_per_pack') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )
            }
            shop_valuation_by_category = {
                row['product__category']: row['total'] or Decimal('0.00')
                for row in ShopStock.objects.values('product__category').annotate(
                    total=Sum(F('quantity_in_pieces') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )
            }
            category_data = [
                {
                    "category": cat_name,
                    "valuation": store_valuation_by_category.get(cat_code, Decimal('0.00')) + shop_valuation_by_category.get(cat_code, Decimal('0.00'))
                }
                for cat_code, cat_name in Product.CATEGORY_CHOICES
            ]

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
            pieces_supplied_by_vendor = {
                row['product__vendor']: row['vol'] or 0
                for row in SupplyLog.objects.values('product__vendor').annotate(
                    vol=Sum(F('packs_received') * F('product__pieces_per_pack'))
                )
            }
            unpaid_balance_by_vendor = {
                row['product__vendor']: row['total'] or Decimal('0.00')
                for row in SupplyLog.objects.filter(is_paid_to_vendor=False).values('product__vendor').annotate(
                    total=Sum(F('packs_received') * F('product__pieces_per_pack') * F('product__buying_price_per_piece'), output_field=DecimalField())
                )
            }

            vendor_list_summary = []
            for vendor in Vendor.objects.all():
                vendor_list_summary.append({
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "contact_person": vendor.contact_person,
                    "total_pieces_received": int(round(pieces_supplied_by_vendor.get(vendor.id, 0))),
                    "pending_debt": unpaid_balance_by_vendor.get(vendor.id, Decimal('0.00'))
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
    permission_classes = [IsAdmin]

    def get(self, request, *args, **kwargs):
        try:
            today = timezone.now().date()

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
            # cash_handed_to_admin / cash_retained_for_change are already net of today's
            # expenses (they're the physical cash left after expenses were paid out of the
            # till during session reconciliation - see DailySessionViewSet.create), so
            # expenses must NOT be subtracted again here.
            cash_handed_over = today_sessions.aggregate(total=Sum('cash_handed_to_admin'))['total'] or Decimal('0.00')
            cash_retained = today_sessions.aggregate(total=Sum('cash_retained_for_change'))['total'] or Decimal('0.00')

            digital_delta_today = SessionDigitalBalance.objects.filter(
                session__trading_date=today
            ).aggregate(total=Sum('revenue_delta'))['total'] or Decimal('0.00')

            net_realized_cash_today = cash_handed_over + cash_retained + digital_delta_today

            # =================================================================
            # 2. HIGH-IMPACT CHARTS & VISUALIZATIONS
            # =================================================================
            
            # --- Chart 1: Revenue vs. Shortages Timeline Trend (30 Days) ---
            window_start = today - datetime.timedelta(days=29)
            sales_by_date = {
                row['trading_date']: row['total'] or Decimal('0.00')
                for row in DailySession.objects.filter(trading_date__gte=window_start, trading_date__lte=today)
                    .values('trading_date').annotate(total=Sum('total_sales'))
            }
            shortages_by_date = {
                row['session__trading_date']: row['total'] or Decimal('0.00')
                for row in ManagerShortageLedger.objects.filter(session__trading_date__gte=window_start, session__trading_date__lte=today)
                    .values('session__trading_date').annotate(total=Sum('shortage_amount'))
            }

            timeline_data = []
            for i in range(29, -1, -1):
                target_date = today - datetime.timedelta(days=i)
                timeline_data.append({
                    "date": target_date.strftime('%Y-%m-%d'),
                    "gross_sales": sales_by_date.get(target_date, Decimal('0.00')),
                    "shortages_logged": shortages_by_date.get(target_date, Decimal('0.00'))
                })

            # --- Chart 2: Branch Revenue Performance Rankings Leaderboard ---
            sales_by_branch_name = {
                row['branch__name']: row['total'] or Decimal('0.00')
                for row in DailySession.objects.values('branch__name').annotate(total=Sum('total_sales'))
            }
            branch_performance = sorted(
                [
                    {"branch_name": branch.name, "total_sales_revenue": sales_by_branch_name.get(branch.name, Decimal('0.00'))}
                    for branch in Branch.objects.all()
                ],
                key=lambda x: x['total_sales_revenue'], reverse=True
            )

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
            advance_balance_by_vendor = {
                cp.vendor_id: cp.current_advance_balance for cp in VendorCreditProfile.objects.all()
            }
            debt_by_vendor = {
                row['vendor']: row['total'] or Decimal('0.00')
                for row in VendorSettlement.objects.values('vendor').annotate(total=Sum('remaining_debt'))
            }
            status_counts_by_vendor = {}
            for row in VendorSettlement.objects.values('vendor', 'payment_status').annotate(cnt=Count('id')):
                status_counts_by_vendor.setdefault(row['vendor'], {})[row['payment_status']] = row['cnt']

            vendor_sales_summary = []
            for vendor in Vendor.objects.all():
                status_counts = status_counts_by_vendor.get(vendor.id, {})
                vendor_sales_summary.append({
                    "vendor_id": vendor.id,
                    "vendor_name": vendor.name,
                    "advance_prepayment_balance": advance_balance_by_vendor.get(vendor.id, Decimal('0.00')),
                    "total_outstanding_debt": debt_by_vendor.get(vendor.id, Decimal('0.00')),
                    "settlements_status_metrics": {
                        "unpaid": status_counts.get('UNPAID', 0),
                        "partial": status_counts.get('PARTIAL', 0),
                        "fully_paid": status_counts.get('FULL', 0)
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
    permission_classes = [IsAdmin]

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
            role_counts = {
                row['job_role']: row['cnt']
                for row in active_profiles.values('job_role').annotate(cnt=Count('id'))
            }
            role_distribution = [
                {"role_display": role_name, "staff_count": role_counts.get(role_code, 0)}
                for role_code, role_name in EmployeeProfile.JOB_ROLE_CHOICES
            ]

            # --- Chart 2: Historical Corporate Payroll Outflows (Last 6 Months Trend) ---
            # Steps back by real calendar months (not a i*30-day approximation, which can
            # skip or duplicate a calendar month depending where `today` falls in its month).
            month_starts = []
            year, month = today.year, today.month
            for i in range(5, -1, -1):
                m = month - i
                y = year
                while m <= 0:
                    m += 12
                    y -= 1
                month_starts.append(datetime.date(y, m, 1))

            payroll_monthly_trends = []
            for month_start in month_starts:
                monthly_payslips = PayslipRun.objects.filter(
                    executed_at__year=month_start.year,
                    executed_at__month=month_start.month
                )
                gross_snap = monthly_payslips.aggregate(total=Sum('base_salary_snapshot'))['total'] or Decimal('0.00')
                net_snap = monthly_payslips.aggregate(total=Sum('final_net_cash_payout'))['total'] or Decimal('0.00')

                payroll_monthly_trends.append({
                    "month": month_start.strftime('%B %Y'),
                    "gross_expenditure": gross_snap,
                    "net_distribution": net_snap
                })

            # --- Chart 3: Outstanding Ledger Balances Split per Branch (Stacked Bar Chart) ---
            advances_by_branch = {
                row['employee__branch']: row['total'] or Decimal('0.00')
                for row in EmployeeLedgerEntry.objects.filter(entry_type='ADVANCE', is_settled=False)
                    .values('employee__branch').annotate(total=Sum('amount'))
            }
            adjustments_by_branch = {
                row['employee__branch']: row['total'] or Decimal('0.00')
                for row in EmployeeLedgerEntry.objects.filter(entry_type='ADJUSTMENT', is_settled=False)
                    .values('employee__branch').annotate(total=Sum('amount'))
            }
            staffed_branch_ids = set(EmployeeProfile.objects.values_list('branch_id', flat=True))

            branch_liabilities = []
            for branch in Branch.objects.all():
                advances = advances_by_branch.get(branch.id, Decimal('0.00'))
                adjustments = adjustments_by_branch.get(branch.id, Decimal('0.00'))

                # Only include branch if there are active staff or active liabilities
                if branch.id in staffed_branch_ids or (advances + adjustments) > 0:
                    branch_liabilities.append({
                        "branch_name": branch.name,
                        "cash_advances": advances,
                        "deduction_fines": adjustments
                    })

            # =================================================================
            # 3. 🌟 COMPLETE WORKFORCE PAYROLL & LIABILITY LEDGER GRID
            # =================================================================
            advances_by_employee = {
                row['employee']: row['total'] or Decimal('0.00')
                for row in EmployeeLedgerEntry.objects.filter(entry_type='ADVANCE', is_settled=False)
                    .values('employee').annotate(total=Sum('amount'))
            }
            fines_by_employee = {
                row['employee']: row['total'] or Decimal('0.00')
                for row in EmployeeLedgerEntry.objects.filter(entry_type='ADJUSTMENT', is_settled=False)
                    .values('employee').annotate(total=Sum('amount'))
            }
            payslip_count_by_employee = {
                row['employee']: row['cnt']
                for row in PayslipRun.objects.values('employee').annotate(cnt=Count('id'))
            }

            workforce_ledger = []
            for emp in EmployeeProfile.objects.select_related('branch').order_by('full_name'):
                tenure_days = max(0, (today - emp.job_start_date).days)

                workforce_ledger.append({
                    "employee_id": emp.id,
                    "full_name": emp.full_name,
                    "job_role": emp.get_job_role_display(),
                    "branch_name": emp.branch.name,
                    "status": emp.status,
                    "monthly_salary": emp.monthly_salary,
                    "tenure_days": tenure_days,
                    "outstanding_advances": advances_by_employee.get(emp.id, Decimal('0.00')),
                    "outstanding_fines": fines_by_employee.get(emp.id, Decimal('0.00')),
                    "completed_payslips_count": payslip_count_by_employee.get(emp.id, 0)
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