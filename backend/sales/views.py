from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
import datetime
from decimal import Decimal

from .models import (
    DailySession, SessionProduct, SessionExpense, CustomerCredit,
    SessionCreditEntry, SessionCreditPayment, DigitalAccount,
    SessionDigitalBalance, ManualBankDeposit, DigitalAccountAdjustment,
    ManagerShortageLedger, VendorSettlement, VendorPaymentInstallment,
    VendorSettlementLine, VendorCreditProfile, VIPCustomer, VIPOrder, VIPPayment,
    PoorProductReport
)
from .serializers import (
    DailySessionSerializer,
    SessionDigitalBalanceSerializer,
    DigitalAccountSerializer,
    CustomerCreditSerializer,
    DigitalAccountAdjustmentSerializer,
    ManagerShortageSerializer,
    VendorSettlementSerializer,
    VIPCustomerSerializer,
    VIPOrderSerializer,
    VIPPaymentSerializer,
    PoorProductReportSerializer
)
from inventory.models import ShopStock, Product, SupplyLog, Vendor
from django.utils.dateparse import parse_date
from core.permissions import IsAdmin, branch_scoped_queryset, assert_branch_allowed







# --- 1. DIGITAL ACCOUNTS VIEWSET (FULL CRUD) ---
class DigitalAccountViewSet(viewsets.ModelViewSet):
    """Branch bank/digital account registration is an Admin-only function."""
    serializer_class = DigitalAccountSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = DigitalAccount.objects.all().order_by('name')
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        return queryset

    def list(self, request, *args, **kwargs):
        """ Overridden to dynamically calculate baseline historical values on the fly """
        response = super().list(request, *args, **kwargs)
        
        # Inject adjusted virtual values into array response instances
        for account_data in response.data:
            account_id = account_data.get('id')
            
            # Fetch last recorded closing instance if present
            last_balance_record = SessionDigitalBalance.objects.filter(
                account_id=account_id
            ).order_by('-session__trading_date').first()
            
            base_balance = 0.0
            window_start = None
            
            if last_balance_record:
                base_balance = float(last_balance_record.closing_balance)
                # Isolate the starting timestamp window boundary marker
                window_start = last_balance_record.session.created_at
            else:
                base_balance = float(account_data.get('initial_balance', 0))
                window_start = None

            # --- TARGETED WINDOW LIVE AD-HOC ADJUSTMENT LOOKUP ---
            adjustment_query = DigitalAccountAdjustment.objects.filter(account_id=account_id)
            if window_start:
                # ONLY pull adjustments recorded after the last manager settlement row entry
                adjustment_query = adjustment_query.filter(logged_at__gt=window_start)
            
            total_adjustments = 0.0
            reasons_list = []
            for adj in adjustment_query:
                total_adjustments += float(adj.amount)
                sign = "+" if adj.amount >= 0 else ""
                reasons_list.append(f"{sign}{adj.amount} ({adj.reason})")

            # Assign Virtual Balances to provide precise real-time dashboard tracking counters
            account_data['last_closing_balance'] = base_balance + total_adjustments
            account_data['adjustment_reasons'] = " | ".join(reasons_list) if reasons_list else "None"
                
        return response


# --- 2. CUSTOMER CREDIT VIEWSET (WITH SECURITY ROLE CONTROLS) ---
class CustomerCreditViewSet(viewsets.ModelViewSet):
    """
    Manages customer profiles and current debt balances.
    Features role-based access to restrict structural balance changes to admins.
    """
    serializer_class = CustomerCreditSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['customer_name'] 

    def get_queryset(self):
        queryset = branch_scoped_queryset(self.request.user, CustomerCredit.objects.all())
        branch_id = self.request.query_params.get('branch')
        active_only = self.request.query_params.get('active_only')

        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        if active_only == 'true':
            queryset = queryset.filter(total_balance__gt=0)

        return queryset

    def create(self, request, *args, **kwargs):
        """ Branch Admins may only register customer debts for their own branch(es) """
        assert_branch_allowed(request.user, request.data.get('branch'))
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """ Restrict direct manual balance updates (PUT) strictly to Admins """
        if request.user.role != 'ADMIN':
            return Response(
                {"detail": "Security Violation: Only system administrators can directly modify historical balances."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """ Restrict patch balance overrides (PATCH) strictly to Admins """
        if request.user.role != 'ADMIN':
            return Response(
                {"detail": "Security Violation: Only system administrators can directly modify historical balances."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """ Restrict debtor account purges (DELETE) strictly to Admins """
        if request.user.role != 'ADMIN':
            return Response(
                {"detail": "Security Violation: Direct account purges require Admin clearance parameters."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


# --- 3. THE DAILY SESSION VIEWSET (THE CORE BRAIN) ---
class DailySessionViewSet(viewsets.ModelViewSet):
    queryset = DailySession.objects.all()
    serializer_class = DailySessionSerializer

    def get_queryset(self):
        return branch_scoped_queryset(self.request.user, DailySession.objects.all())

    @action(detail=False, methods=['get'])
    def prepare(self, request):
        """
        Compiles the current morning stock tracking sheet for a branch.
        Also performs a roll-forward query to fetch yesterday's physical cash float change baseline.
        Called by: salesService.prepareWorksheet(branchId, date)
        """
        branch_id = request.query_params.get('branch')
        date_str = request.query_params.get('date')

        if not branch_id:
            return Response({"error": "Branch parameter is missing"}, status=400)

        assert_branch_allowed(request.user, branch_id)

        # 1. Look backwards chronologically to pull the most recent closed session record
        last_session = DailySession.objects.filter(branch_id=branch_id).order_by('-trading_date').first()
        opening_cash_float = float(last_session.cash_retained_for_change) if last_session else 0.0

        # 2. Fetch current live shop stocks for this branch
        stocks = ShopStock.objects.filter(branch_id=branch_id)
        
        worksheet_rows = []
        for stock in stocks:
            worksheet_rows.append({
                "product_id": str(stock.product.id),
                "product_name": stock.product.name,
                "opening_balance": stock.quantity_in_pieces, 
                "unit_price": float(stock.product.selling_price_per_piece)
            })

        # 3. Structure into an aggregated response object payload envelope
        payload_envelope = {
            "opening_cash_float": opening_cash_float,
            "products": worksheet_rows
        }

        return Response(payload_envelope, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        data = request.data
        branch_id = data.get('branch')
        date_str = data.get('trading_date')

        assert_branch_allowed(request.user, branch_id)

        with transaction.atomic():
            # 1. Create Parent Session Record
            session = DailySession.objects.create(
                branch_id=branch_id,
                trading_date=date_str,
                cash_handed_to_admin=float(data.get('physical_cash_handed_to_admin', 0)),
                cash_retained_for_change=float(data.get('cash_retained_for_change', 0))
            )

            # Track total digital bank delta shift inside the transaction scope
            accumulated_digital_deltas = 0.0

            # 2. Digital Accounts Delta Processing with Time-Window Isolation
            for item in data.get('digital_balances', []):
                acc_id = item.get('account_id')
                current_bal = float(item.get('balance', 0))
                
                # Fetch last recorded closing instance chronologically
                last_entry = SessionDigitalBalance.objects.filter(
                    account_id=acc_id
                ).order_by('-session__trading_date').first()
                
                if last_entry:
                    base_balance = float(last_entry.closing_balance)
                    window_start = last_entry.session.created_at
                else:
                    account_master = DigitalAccount.objects.get(id=acc_id)
                    base_balance = float(account_master.initial_balance)
                    window_start = None

                # Calculate intermediate adjustments inside the exact time window
                adjustment_query = DigitalAccountAdjustment.objects.filter(account_id=acc_id)
                if window_start:
                    adjustment_query = adjustment_query.filter(logged_at__gt=window_start)
                    
                total_window_adjustments = sum(float(adj.amount) for adj in adjustment_query)
                
                # Create Virtual Yesterday Balance dynamically on the fly
                virtual_yesterday_balance = base_balance + total_window_adjustments
                
                # Deduct Virtual Baseline to evaluate real-world trading growth delta
                delta = current_bal - virtual_yesterday_balance
                accumulated_digital_deltas += delta

                SessionDigitalBalance.objects.create(
                    session=session, account_id=acc_id,
                    closing_balance=current_bal, revenue_delta=delta
                )
                
            total_recovered = 0
            for pay in data.get('credit_payments', []):
                amt = float(pay.get('amount', 0))
                cust = CustomerCredit.objects.get(id=pay.get('customer_id'))
                
                SessionCreditPayment.objects.create(session=session, customer=cust, amount_paid=amt)
                
                # --- FIXED: Use clean Decimal cast formatting ---
                cust.total_balance -= Decimal(str(amt))
                cust.save()
                total_recovered += amt

            # 4. Handle Items Taken on Credit Today (New Debts)
            total_new_debt = 0
            for crd in data.get('credits', []):
                amt = float(crd.get('amount', 0))
                cust = CustomerCredit.objects.get(id=crd.get('customer_id'))
                
                SessionCreditEntry.objects.create(session=session, customer=cust, amount=amt)
                
                # --- FIXED: Use clean Decimal cast formatting ---
                cust.total_balance += Decimal(str(amt))
                cust.save()
                total_new_debt += amt

            # 5. Handle Products sold (Loop & Deduct from ShopStock)
            total_sales = 0
            for prod_item in data.get('products', []):
                p_id = prod_item.get('product_id')
                
                if str(p_id).startswith("KHAT_"):
                    target_prod = Product.objects.filter(category='KHAT', selling_price_per_piece=prod_item.get('unit_price')).first()
                else:
                    target_prod = Product.objects.get(id=p_id)

                open_bal = int(prod_item.get('opening_balance', 0))
                close_bal = int(prod_item.get('closing_balance', 0))
                sold_qty = open_bal - close_bal
                subtotal = sold_qty * float(target_prod.selling_price_per_piece)
                total_sales += subtotal

                SessionProduct.objects.create(
                    session=session, product=target_prod,
                    opening=open_bal, closing=close_bal, sold=sold_qty,
                    price_at_sale=target_prod.selling_price_per_piece
                )

                # Atomically sync real-world inventory counts down to the final count
                ShopStock.objects.filter(branch_id=branch_id, product=target_prod).update(
                    quantity_in_pieces=close_bal
                )

            # 6. Handle Expenses
            total_exp = 0
            for exp in data.get('expenses', []):
                amt = float(exp.get('amount', 0))
                total_exp += amt
                SessionExpense.objects.create(session=session, reason=exp.get('reason'), amount=amt)

            # 7. Handle Manual Deposits
            accumulated_manual_slips = 0.0
            for dep in data.get('manual_deposits', []):
                deposit_amt = float(dep.get('amount', 0))
                accumulated_manual_slips += deposit_amt
                ManualBankDeposit.objects.create(
                    session=session,
                    amount=deposit_amt,
                    bank_name=dep.get('bank', ''),
                    account_name=dep.get('account_name', '')
                )

            # Finalize Totals in Database
            session.total_sales = total_sales
            session.total_expenses = total_exp
            session.total_new_credit = total_new_debt
            session.total_credit_recovered = total_recovered
            session.save()

            # --- 8. AUTOMATIC UNALLOCATED CASH VARIANCE LIABILITY EVALUATION ENGINE ---
            penultimate_session = DailySession.objects.filter(branch_id=branch_id, trading_date__lt=date_str).order_by('-trading_date').first()
            opening_cash_float_value = float(penultimate_session.cash_retained_for_change) if penultimate_session else 0.0

            expected_cash_position = (
                opening_cash_float_value
                + total_sales
                - total_exp
                - total_new_debt
                + total_recovered
                - accumulated_digital_deltas
                - accumulated_manual_slips
            )

            actual_cash_submitted = float(session.cash_handed_to_admin) + float(session.cash_retained_for_change)
            computed_variance = expected_cash_position - actual_cash_submitted

            if computed_variance > 0:
                ManagerShortageLedger.objects.create(
                    session=session,
                    branch_id=branch_id,
                    employee=None,
                    shortage_amount=Decimal(str(computed_variance))
                )

            

            return Response({"status": "Reconciliation Successful", "session_id": session.id}, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """ Restrict session editing exclusively to the global Admin """
        if request.user.role != 'ADMIN':
            return Response(
                {"detail": "Security Denied: Only system administrators can edit finalized daily sessions."},
                status=status.HTTP_403_FORBIDDEN
            )
        # Cleanly allow standard editing update processing for Admins
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        """ Restrict session patch edits exclusively to the global Admin """
        if request.user.role != 'ADMIN':
            return Response(
                {"detail": "Security Denied: Only system administrators can modify finalized daily sessions."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """ Restrict session deletions exclusively to the global Admin """
        if request.user.role != 'ADMIN':
            return Response(
                {"detail": "Security Denied: Only system administrators can delete finalized records."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # When an Admin deletes a session, automatically drop any cascading shortage records
        session_instance = self.get_object()
        with transaction.atomic():
            ManagerShortageLedger.objects.filter(session=session_instance).delete()
            session_instance.delete()
            
        return Response({"status": "Session wiped from system registries successfully."}, status=status.HTTP_200_OK)


# --- 4. DIGITAL ACCOUNT ADJUSTMENTS ---
class DigitalAccountAdjustmentViewSet(viewsets.ModelViewSet):
    """
    Dedicated controller for Admins to log vendor payments
    and cash injections independently of branch managers.
    """
    queryset = DigitalAccountAdjustment.objects.all().order_by('-logged_at')
    serializer_class = DigitalAccountAdjustmentSerializer
    permission_classes = [IsAdmin]


# --- 5. MANAGER LIABILITY SHORTAGES VIEWSET ---
class ManagerShortageViewSet(viewsets.ModelViewSet):
    """
    Provides a secure panel for the corporate auditing team to manage employee deficits.
    Admin-only: this audits branch admins themselves, so branch admins don't get a view into it.
    """
    queryset = ManagerShortageLedger.objects.all().order_by('-logged_at')
    serializer_class = ManagerShortageSerializer
    filter_backends = [filters.SearchFilter]
    permission_classes = [IsAdmin]

    search_fields = ['employee__full_name', 'session__branch__name']










# ---- VENDOR PAYMENT SETTLEMENT PART







class VendorSettlementViewSet(viewsets.ModelViewSet):
    """Vendor payments are an Admin-only function."""
    queryset = VendorSettlement.objects.all().order_by('-created_at')
    serializer_class = VendorSettlementSerializer
    permission_classes = [IsAdmin]

    @action(detail=False, methods=['get'], url_path='statement-worksheet')
    def statement_worksheet(self, request):
        vendor_id = request.query_params.get('vendor_id')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if not vendor_id:
            return Response({"error": "Missing vendor parameter"}, status=status.HTTP_400_BAD_REQUEST)

        parsed_start_date = parse_date(start_date_str) if start_date_str else None
        parsed_end_date = parse_date(end_date_str) if end_date_str else None

        # 1. Gather fresh, unpaid cargo items
        fresh_unpaid_logs = SupplyLog.objects.filter(
            product__vendor_id=vendor_id,
            is_paid_to_vendor=False
        ).select_related('product')

        if parsed_start_date and parsed_end_date:
            start_datetime = datetime.datetime.combine(parsed_start_date, datetime.time.min)
            end_datetime = datetime.datetime.combine(parsed_end_date, datetime.time.max)
            fresh_unpaid_logs = fresh_unpaid_logs.filter(date_received__range=(start_datetime, end_datetime))

        # 2. Compute fresh cargo subtotals
        fresh_batch_cost = Decimal('0.00')
        itemized_lines = []

        for log in fresh_unpaid_logs:
            packs = Decimal(str(log.packs_received or 0.0))
            pieces_per_pack = Decimal(str(log.product.pieces_per_pack or 1))
            buy_price = Decimal(str(log.product.buying_price_per_piece or 0.00))
            
            total_pieces = packs * pieces_per_pack
            subtotal = total_pieces * buy_price
            fresh_batch_cost += subtotal

            itemized_lines.append({
                "id": str(log.id),
                "date_received": log.date_received.isoformat(),
                "product_name": log.product.name,
                "packs_received": float(packs),
                "pieces_per_pack": int(pieces_per_pack),
                "calculated_pieces_count": int(total_pieces),
                "buying_price_unit": float(buy_price),
                "calculated_row_subtotal": float(subtotal)
            })

        # 3. Handle historical balances seamlessly from prior master rows
        open_settlements = VendorSettlement.objects.filter(vendor_id=vendor_id, payment_status__in=['UNPAID', 'PARTIAL'])
        past_outstanding_debt = sum(Decimal(str(s.remaining_debt)) for s in open_settlements)

        # 🌟 FIX: If there is an active rolling debt but no new delivery cargo, inject a liability tracker entry
        if past_outstanding_debt > 0 and len(itemized_lines) == 0:
            itemized_lines.append({
                "id": "prior-debt-liability-node",
                "date_received": datetime.datetime.now().isoformat(),
                "product_name": "⚠️ Owed Balance Carried Over From Prior Partial Payment",
                "packs_received": 0,
                "pieces_per_pack": 0,
                "calculated_pieces_count": 0,
                "buying_price_unit": float(past_outstanding_debt),
                "calculated_row_subtotal": float(past_outstanding_debt)
            })

        # 4. Quality deductions - unsettled DEDUCT reports for this vendor's products reduce what's owed
        deduction_reports = PoorProductReport.objects.filter(
            product__vendor_id=vendor_id, status='DEDUCT', settlement__isnull=True
        ).select_related('product', 'branch')

        if parsed_start_date and parsed_end_date:
            deduction_reports = deduction_reports.filter(report_date__range=(parsed_start_date, parsed_end_date))

        total_deductions = Decimal('0.00')
        itemized_deductions = []
        for report in deduction_reports:
            qty = Decimal(str(report.quantity))
            buy_price = Decimal(str(report.product.buying_price_per_piece or 0.00))
            subtotal = qty * buy_price
            total_deductions += subtotal

            itemized_deductions.append({
                "id": str(report.id),
                "report_date": report.report_date.isoformat(),
                "product_name": report.product.name,
                "branch_name": report.branch.name,
                "quantity": float(qty),
                "buying_price_unit": float(buy_price),
                "calculated_row_subtotal": float(subtotal)
            })

        credit_prof = VendorCreditProfile.objects.filter(vendor_id=vendor_id).first()
        past_advance = Decimal(str(credit_prof.current_advance_balance)) if credit_prof else Decimal('0.00')

        # Calculate liabilities precisely, net of quality deductions
        gross_total_liability = max(Decimal('0.00'), fresh_batch_cost + past_outstanding_debt - total_deductions)

        if past_advance >= gross_total_liability:
            net_balance_due = Decimal('0.00')
            displayed_advance = past_advance - gross_total_liability
        else:
            net_balance_due = gross_total_liability - past_advance
            displayed_advance = Decimal('0.00')

        return Response({
            "vendor_id": vendor_id,
            "calculated_batch_cost": float(gross_total_liability),
            "total_quality_deductions": float(total_deductions),
            "available_past_advance": float(displayed_advance),
            "net_balance_due": float(net_balance_due),
            "itemized_deliveries": itemized_lines,
            "itemized_deductions": itemized_deductions
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['POST'], url_path='post-settlement')
    def post_settlement(self, request):
        vendor_id = request.data.get('vendor_id')
        supply_log_ids = request.data.get('supply_log_ids', [])
        amount_handed_over = Decimal(str(request.data.get('amount_handed_over', 0.00)))

        if not vendor_id:
            return Response({"error": "Missing vendor specifications"}, status=status.HTTP_400_BAD_REQUEST)

        # Clean the frontend placeholder strings out of the ID array
        clean_log_ids = [log_id for log_id in supply_log_ids if log_id != "prior-debt-liability-node"]

        with transaction.atomic():
            # 🌟 FIXED: Changed 'id__in=supply_log_ids' to 'id__in=clean_log_ids'
            fresh_logs = SupplyLog.objects.filter(id__in=clean_log_ids, is_paid_to_vendor=False).select_related('product')
            
            # Fetch older unpaid master settlement tracking rows
            open_settlements = VendorSettlement.objects.filter(vendor_id=vendor_id, payment_status__in=['UNPAID', 'PARTIAL'])
            past_debts_cost = sum(Decimal(str(s.remaining_debt)) for s in open_settlements)

            # 🌟 THE ABSOLUTE VALIDATION GUARD: 
            # If there are no fresh unpaid logs AND no old remaining debts, STOP immediately!
            if not fresh_logs.exists() and past_debts_cost == 0:
                return Response(
                    {"error": "These delivery logs have already been paid for. Please refresh your worksheet dashboard."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 2. Calculate fresh cargo costs securely
            fresh_logs_cost = Decimal('0.00')
            for log in fresh_logs:
                packs = Decimal(str(log.packs_received or 0.0))
                pieces_per_pack = Decimal(str(log.product.pieces_per_pack or 1))
                buy_price = Decimal(str(log.product.buying_price_per_piece or 0.00))

                total_pieces = packs * pieces_per_pack
                fresh_logs_cost += (total_pieces * buy_price)

            # 2b. Sweep in unsettled quality deductions for this vendor - reduces what's owed, once and only once
            deduction_reports = PoorProductReport.objects.filter(
                product__vendor_id=vendor_id, status='DEDUCT', settlement__isnull=True
            ).select_related('product')

            total_deductions = Decimal('0.00')
            for report in deduction_reports:
                qty = Decimal(str(report.quantity))
                buy_price = Decimal(str(report.product.buying_price_per_piece or 0.00))
                total_deductions += (qty * buy_price)

            total_liabilities = max(Decimal('0.00'), fresh_logs_cost + past_debts_cost - total_deductions)

            credit_prof, _ = VendorCreditProfile.objects.get_or_create(
                vendor_id=vendor_id,
                defaults={'current_advance_balance': Decimal('0.00')}
            )
            available_advance = Decimal(str(credit_prof.current_advance_balance))

            # Deduct advance credits safely
            advance_used = min(available_advance, total_liabilities)
            credit_prof.current_advance_balance -= advance_used
            
            net_required_cash = total_liabilities - advance_used
            
            # Determine payment outcomes accurately
            print(amount_handed_over)
            print(net_required_cash)
            if amount_handed_over >= net_required_cash:
                surplus = amount_handed_over - net_required_cash
                credit_prof.current_advance_balance += surplus
                new_remaining_debt = Decimal('0.00')
                status_outcome = 'FULL'
            else:
                new_remaining_debt = net_required_cash - amount_handed_over
                status_outcome = 'PARTIAL'
            
            credit_prof.save()

            # Create Master Settlement record
            master_settlement = VendorSettlement.objects.create(
                vendor_id=vendor_id,
                total_batch_cost=total_liabilities,
                amount_paid_total=amount_handed_over + advance_used,
                remaining_debt=new_remaining_debt,
                payment_status=status_outcome
            )

            # Lock fresh logs into this finalized batch session immediately
            for log in fresh_logs:
                VendorSettlementLine.objects.create(settlement=master_settlement, supply_log=log)
                log.is_paid_to_vendor = True
                log.save()

            # Lock the quality deductions into this settlement so they can never be counted again
            deduction_reports.update(settlement=master_settlement)

            # Mark older partial settlements as resolved since their active debt rolled forward here
            open_settlements.exclude(id=master_settlement.id).update(remaining_debt=Decimal('0.00'), payment_status='FULL')

            # Create entry history installment record
            VendorPaymentInstallment.objects.create(
                settlement=master_settlement,
                amount_handed_over=amount_handed_over,
                advance_amount_created=max(Decimal('0.00'), amount_handed_over - net_required_cash),
                advance_used_from_past=advance_used
            )

            serializer = VendorSettlementSerializer(master_settlement)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


# ---- VIP CUSTOMER MANAGEMENT PART ----

class PoorProductReportViewSet(viewsets.ModelViewSet):
    """
    Admin-only log of poor/rejected product deliveries. A DEDUCT report reduces what's owed
    to that product's vendor at settlement time. Once a report has actually been applied to a
    finalized settlement, it's locked - editing or deleting it would silently corrupt that
    settlement's already-recorded totals.
    """
    queryset = PoorProductReport.objects.all().order_by('-report_date', '-created_at')
    serializer_class = PoorProductReportSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = PoorProductReport.objects.all().order_by('-report_date', '-created_at')
        branch_id = self.request.query_params.get('branch')
        vendor_id = self.request.query_params.get('vendor')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        if vendor_id:
            queryset = queryset.filter(product__vendor_id=vendor_id)
        return queryset

    def _block_if_settled(self, instance):
        if instance.settlement_id is not None:
            return Response(
                {"error": "This report has already been applied to a finalized settlement and can no longer be changed."},
                status=status.HTTP_400_BAD_REQUEST
            )
        return None

    def update(self, request, *args, **kwargs):
        blocked = self._block_if_settled(self.get_object())
        if blocked:
            return blocked
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        blocked = self._block_if_settled(self.get_object())
        if blocked:
            return blocked
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        blocked = self._block_if_settled(self.get_object())
        if blocked:
            return blocked
        return super().destroy(request, *args, **kwargs)


class VIPCustomerViewSet(viewsets.ModelViewSet):
    """VIP customers order directly through the Admin; entirely Admin-only, no branch involved."""
    queryset = VIPCustomer.objects.all().order_by('full_name')
    serializer_class = VIPCustomerSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'phone_number']


class VIPOrderViewSet(viewsets.ModelViewSet):
    """
    Admin-only order log for VIP customers. Never touches branch stock.
    Full CRUD - an order can be edited (product/quantity/date changed) or deleted outright if dismissed.
    """
    queryset = VIPOrder.objects.all().order_by('-order_date', '-created_at')
    serializer_class = VIPOrderSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = VIPOrder.objects.all().order_by('-order_date', '-created_at')
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset


class VIPPaymentViewSet(viewsets.ModelViewSet):
    """
    Admin-only payment log for VIP customers. A payment can be partial - it simply reduces
    the customer's running outstanding balance (see VIPCustomerSerializer.outstanding_balance).
    """
    queryset = VIPPayment.objects.all().order_by('-payment_date', '-created_at')
    serializer_class = VIPPaymentSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = VIPPayment.objects.all().order_by('-payment_date', '-created_at')
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset