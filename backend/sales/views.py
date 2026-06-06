from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.utils import timezone
import datetime
from decimal import Decimal

from .models import (
    DailySession, SessionProduct, SessionExpense, CustomerCredit,
    SessionCreditEntry, SessionCreditPayment, DigitalAccount, 
    SessionDigitalBalance, ManualBankDeposit, DigitalAccountAdjustment
)
from .serializers import (
    DailySessionSerializer, 
    SessionDigitalBalanceSerializer,
    DigitalAccountSerializer,
    CustomerCreditSerializer,
    DigitalAccountAdjustmentSerializer
)
from inventory.models import ShopStock, Product




# --- 1. DIGITAL ACCOUNTS VIEWSET (FULL CRUD) ---
class DigitalAccountViewSet(viewsets.ModelViewSet):
    serializer_class = DigitalAccountSerializer

    def get_queryset(self):
        queryset = DigitalAccount.objects.all().order_by('name')
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        return queryset

    def list(self, request, *args, **kwargs):
        """ Overridden to dynamically calculate baseline historical values on the fly """
        response = super().list(request, *args, **kwargs)
        
        # Inject current unadjusted values into array response instances
        for account_data in response.data:
            account_id = account_data.get('id')
            
            # Fetch last recorded closing instance if present
            last_balance_record = SessionDigitalBalance.objects.filter(
                account_id=account_id
            ).order_by('-session__trading_date').first()
            
            if last_balance_record:
                account_data['last_closing_balance'] = float(last_balance_record.closing_balance)
            else:
                account_data['last_closing_balance'] = float(account_data.get('initial_balance', 0))
                
        return response


# --- 2. CUSTOMER CREDIT VIEWSET (WITH SEARCH & INLINE CREATION) ---
class CustomerCreditViewSet(viewsets.ModelViewSet):
    """
    Manages customer profiles and current debt balances.
    Features an instant SearchFilter so managers can type names quickly.
    """
    serializer_class = CustomerCreditSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['customer_name'] 

    def get_queryset(self):
        queryset = CustomerCredit.objects.all()
        branch_id = self.request.query_params.get('branch')
        active_only = self.request.query_params.get('active_only')

        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
        
        # Allows frontend to filter down exclusively to people who owe money
        if active_only == 'true':
            queryset = queryset.filter(total_balance__gt=0)
            
        return queryset


# --- 3. THE DAILY SESSION VIEWSET (THE CORE BRAIN) ---
class DailySessionViewSet(viewsets.ModelViewSet):
    queryset = DailySession.objects.all()
    serializer_class = DailySessionSerializer

    @action(detail=False, methods=['get'])
    def prepare(self, request):
        """
        Compiles the current morning stock tracking sheet for a branch.
        Called by: salesService.prepareWorksheet(branchId, date)
        """
        branch_id = request.query_params.get('branch')
        date_str = request.query_params.get('date')

        if not branch_id:
            return Response({"error": "Branch parameter is missing"}, status=400)

        # 1. Fetch current live shop stocks for this branch
        stocks = ShopStock.objects.filter(branch_id=branch_id)
        
        worksheet_rows = []
        for stock in stocks:
            worksheet_rows.append({
                "product_id": str(stock.product.id),
                "product_name": stock.product.name,
                "opening_balance": stock.quantity_in_pieces, 
                "unit_price": float(stock.product.selling_price_per_piece)
            })

        return Response(worksheet_rows, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        data = request.data
        branch_id = data.get('branch')
        date_str = data.get('trading_date')

        with transaction.atomic():
            # 1. Create Parent Session Record
            session = DailySession.objects.create(
                branch_id=branch_id,
                trading_date=date_str,
                cash_handed_to_admin=float(data.get('physical_cash_handed_to_admin', 0)),
                cash_retained_for_change=float(data.get('cash_retained_for_change', 0))
            )

            # 2. Digital Accounts Delta Processing
            for item in data.get('digital_balances', []):
                acc_id = item.get('account_id')
                current_bal = float(item.get('balance', 0))
                
                # Look backwards for previous daily session logs
                last_entry = SessionDigitalBalance.objects.filter(
                    account_id=acc_id,
                    session__trading_date__lt=date_str
                ).order_by('-session__trading_date').first()
                
                if last_entry:
                    yesterday_bal = float(last_entry.closing_balance)
                else:
                    # --- SMART FALLBACK: Grab the master seeded initial balance ---
                    account_master = DigitalAccount.objects.get(id=acc_id)
                    yesterday_bal = float(account_master.initial_balance)
                
                delta = current_bal - yesterday_bal

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
            for dep in data.get('manual_deposits', []):
                ManualBankDeposit.objects.create(
                    session=session,
                    amount=float(dep.get('amount', 0)),
                    bank_name=dep.get('bank', ''),
                    account_name=dep.get('account_name', '')
                )

            # Finalize Totals in Database
            session.total_sales = total_sales
            session.total_expenses = total_exp
            session.total_new_credit = total_new_debt
            session.total_credit_recovered = total_recovered
            session.save()

            return Response({"status": "Reconciliation Successful", "session_id": session.id}, status=status.HTTP_201_CREATED)






class DigitalAccountAdjustmentViewSet(viewsets.ModelViewSet):
    """
    Dedicated controller for Admins to log vendor payments 
    and cash injections independently of branch managers.
    """
    queryset = DigitalAccountAdjustment.objects.all().order_by('-logged_at')
    serializer_class = DigitalAccountAdjustmentSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response(
                {"detail": "Access Denied: Only system administrators can post structural ledger adjustments."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)