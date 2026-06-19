from rest_framework import serializers
from inventory.models import SupplyLog, Vendor, Product
from .models import (
    DigitalAccount,
    CustomerCredit,
    DailySession,
    SessionDigitalBalance,
    SessionProduct,
    SessionExpense,
    SessionCreditEntry,
    SessionCreditPayment,
    ManualBankDeposit,
    DigitalAccountAdjustment,
    ManagerShortageLedger,
    # Vendor Payment Settlement Part
    VendorCreditProfile,
    VendorSettlement,
    VendorPaymentInstallment,
    VendorSettlementLine
)


from decimal import Decimal 





# --- 1. CORE ARCHITECTURE SERIALIZERS ---

class DigitalAccountSerializer(serializers.ModelSerializer):
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = DigitalAccount
        fields = ['id', 'branch', 'branch_name', 'name', 'initial_balance']


class CustomerCreditSerializer(serializers.ModelSerializer):
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = CustomerCredit
        fields = ['id', 'branch', 'branch_name', 'customer_name', 'total_balance', 'last_updated']


# --- 2. RECONCILIATION SUB-MODELS (MULTI-INSERTIONS) ---

class SessionDigitalBalanceSerializer(serializers.ModelSerializer):
    account_name = serializers.ReadOnlyField(source='account.name')

    class Meta:
        model = SessionDigitalBalance
        fields = ['id', 'account', 'account_name', 'closing_balance', 'revenue_delta']
        extra_kwargs = {'session': {'required': False}}


class SessionProductSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = SessionProduct
        fields = ['id', 'product', 'product_name', 'opening', 'closing', 'sold', 'price_at_sale']
        extra_kwargs = {'session': {'required': False}}


class SessionExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionExpense
        fields = ['id', 'reason', 'amount']
        extra_kwargs = {'session': {'required': False}}


class SessionCreditEntrySerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.customer_name')

    class Meta:
        model = SessionCreditEntry
        fields = ['id', 'customer', 'customer_name', 'amount']
        extra_kwargs = {'session': {'required': False}}


class SessionCreditPaymentSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.customer_name')

    class Meta:
        model = SessionCreditPayment
        fields = ['id', 'customer', 'customer_name', 'amount_paid']
        extra_kwargs = {'session': {'required': False}}


class ManualBankDepositSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManualBankDeposit
        fields = ['id', 'amount', 'bank_name', 'account_name']
        extra_kwargs = {'session': {'required': False}}


# --- 3. MASTER PARENT SESSION LEDGER ---

class DailySessionSerializer(serializers.ModelSerializer):
    """
    The master structure combining tracking summaries, cash handling declarations,
    and child array lists for thorough, automated report syncs.
    """
    # --- CAREFULLY ALIGNED RELATION FIELDS ---
    # These use source='' ONLY where the serializer variable name differs from the models.py related_name.
    # This keeps the working tables intact while stopping the AssertionError crash.
    digital_balances = SessionDigitalBalanceSerializer(many=True, required=False, read_only=True)
    products_sold = SessionProductSerializer(source='products', many=True, required=False, read_only=True)
    expenses_logged = SessionExpenseSerializer(source='expenses', many=True, required=False, read_only=True)
    credits_issued = SessionCreditEntrySerializer(many=True, required=False, read_only=True)
    credit_payments = SessionCreditPaymentSerializer(many=True, required=False, read_only=True)
    manual_deposits = ManualBankDepositSerializer(many=True, required=False, read_only=True)
    
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = DailySession
        fields = [
            'id', 'branch', 'branch_name', 'trading_date',
            'cash_handed_to_admin', 'cash_retained_for_change',
            'total_sales', 'total_expenses', 'total_new_credit', 'total_credit_recovered',
            'digital_balances', 'products_sold', 'expenses_logged', 
            'credits_issued', 'credit_payments', 'manual_deposits',
            'created_at'
        ]

    def to_representation(self, instance):
        """
        Safe Fallback Layer aligned with verified related_names.
        """
        ret = super().to_representation(instance)
        
        # 1. Safe stock lookup fallback
        if not ret.get('products_sold') and hasattr(instance, 'products'):
            ret['products_sold'] = SessionProductSerializer(instance.products.all(), many=True).data
                
        # 2. Safe expense lookup fallback
        if not ret.get('expenses_logged') and hasattr(instance, 'expenses'):
            ret['expenses_logged'] = SessionExpenseSerializer(instance.expenses.all(), many=True).data
                
        # 3. Safe digital balance lookup fallback
        if not ret.get('digital_balances') and hasattr(instance, 'digital_balances'):
            ret['digital_balances'] = SessionDigitalBalanceSerializer(instance.digital_balances.all(), many=True).data

        # 4. Safe credit entries lookup fallback (Points exactly to models.py related_name='credits_issued')
        if not ret.get('credits_issued') and hasattr(instance, 'credits_issued'):
            ret['credits_issued'] = SessionCreditEntrySerializer(instance.credits_issued.all(), many=True).data
                
        # 5. Safe credit payments lookup fallback
        if not ret.get('credit_payments') and hasattr(instance, 'credit_payments'):
            ret['credit_payments'] = SessionCreditPaymentSerializer(instance.credit_payments.all(), many=True).data
            
        return ret


class DigitalAccountAdjustmentSerializer(serializers.ModelSerializer):
    account_name = serializers.ReadOnlyField(source='account.name')
    branch_name = serializers.ReadOnlyField(source='account.branch.name')

    class Meta:
        model = DigitalAccountAdjustment
        fields = ['id', 'account', 'account_name', 'branch_name', 'amount', 'reason', 'logged_at']


class ManagerShortageSerializer(serializers.ModelSerializer):
    branch_name = serializers.ReadOnlyField(source='branch.name')
    trading_date = serializers.ReadOnlyField(source='session.trading_date')
    manager_username = serializers.ReadOnlyField(source='manager.username')

    class Meta:
        model = ManagerShortageLedger
        fields = [
            'id', 'session', 'branch_name', 'trading_date', 
            'manager', 'manager_username', 'shortage_amount', 
            'is_settled_from_salary', 'payroll_cycle_date', 'logged_at'
        ]


    




# VENDOR PAYMENT SETTLEMENT PART




class VendorCreditProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorCreditProfile
        fields = ['current_advance_balance', 'last_updated']


class VendorSettlementLineSerializer(serializers.ModelSerializer):
    id = serializers.ReadOnlyField()
    date_received = serializers.ReadOnlyField(source='supply_log.date_received')
    packs_received = serializers.ReadOnlyField(source='supply_log.packs_received')
    
    # Flattened paths mapping directly to frontend table dataIndex properties
    product_name = serializers.ReadOnlyField(source='supply_log.product.name')
    pieces_per_pack = serializers.ReadOnlyField(source='supply_log.product.pieces_per_pack')
    buying_price_unit = serializers.ReadOnlyField(source='supply_log.product.buying_price_per_piece')
    
    calculated_pieces_count = serializers.SerializerMethodField()
    calculated_row_subtotal = serializers.SerializerMethodField()

    class Meta:
        model = VendorSettlementLine
        fields = [
            'id', 'date_received', 'product_name', 'packs_received', 
            'pieces_per_pack', 'calculated_pieces_count', 'buying_price_unit', 'calculated_row_subtotal'
        ]

    def get_calculated_pieces_count(self, obj):
        if not obj.supply_log or not obj.supply_log.product:
            return 0
        packs = float(obj.supply_log.packs_received or 0.0)
        pieces = int(obj.supply_log.product.pieces_per_pack or 1)
        return int(packs * pieces)

    def get_calculated_row_subtotal(self, obj):
        if not obj.supply_log or not obj.supply_log.product:
            return 0.00
        total_pieces = Decimal(str(self.get_calculated_pieces_count(obj)))
        unit_price = Decimal(str(obj.supply_log.product.buying_price_per_piece or 0.00))
        return float(total_pieces * unit_price)


class VendorPaymentInstallmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorPaymentInstallment
        fields = ['id', 'amount_handed_over', 'advance_amount_created', 'advance_used_from_past', 'paid_at']


class VendorSettlementSerializer(serializers.ModelSerializer):
    vendor_name = serializers.ReadOnlyField(source='vendor.name')
    installments = VendorPaymentInstallmentSerializer(many=True, read_only=True)
    # 🌟 FLATTENED: Feeds array response straight to the table state loop key
    itemized_deliveries = VendorSettlementLineSerializer(source='lines', many=True, read_only=True)

    class Meta:
        model = VendorSettlement
        fields = [
            'id', 'vendor', 'vendor_name', 'total_batch_cost', 
            'amount_paid_total', 'remaining_debt', 'payment_status', 
            'created_at', 'updated_at', 'installments', 'itemized_deliveries'
        ]