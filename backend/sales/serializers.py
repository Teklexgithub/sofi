from rest_framework import serializers
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
    DigitalAccountAdjustment
)

# --- 1. CORE ARCHITECTURE SERIALIZERS ---

class DigitalAccountSerializer(serializers.ModelSerializer):
    """
    Handles configurations for master mobile wallets and bank channels.
    Provides human-readable branch naming hooks for admin table layouts.
    """
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = DigitalAccount
        fields = ['id', 'branch', 'branch_name', 'name', 'initial_balance']


class CustomerCreditSerializer(serializers.ModelSerializer):
    """
    Tracks customer profile identities along with their total real-time balances.
    Essential for the Tab 3 and Tab 4 dropdown searching operations.
    """
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = CustomerCredit
        fields = ['id', 'branch', 'branch_name', 'customer_name', 'total_balance', 'last_updated']


# --- 2. RECONCILIATION SUB-MODELS (MULTI-INSERTIONS) ---

class SessionDigitalBalanceSerializer(serializers.ModelSerializer):
    """
    Tracks closing balances for individual wallets submitted per business session.
    """
    account_name = serializers.ReadOnlyField(source='account.name')

    class Meta:
        model = SessionDigitalBalance
        fields = '__all__'
        extra_kwargs = {'session': {'required': False}}


class SessionProductSerializer(serializers.ModelSerializer):
    """
    Maintains clear stock logs documenting item counts at opening and closing.
    """
    product_name = serializers.ReadOnlyField(source='product.name')

    class Meta:
        model = SessionProduct
        fields = '__all__'
        extra_kwargs = {'session': {'required': False}}


class SessionExpenseSerializer(serializers.ModelSerializer):
    """
    Logs out-of-drawer cash operational expenditures.
    """
    class Meta:
        model = SessionExpense
        fields = '__all__'
        extra_kwargs = {'session': {'required': False}}


class SessionCreditEntrySerializer(serializers.ModelSerializer):
    """
    Documents individual accounts when a customer purchases items on margin.
    """
    customer_name = serializers.ReadOnlyField(source='customer.customer_name')

    class Meta:
        model = SessionCreditEntry
        fields = '__all__'
        extra_kwargs = {'session': {'required': False}}


class SessionCreditPaymentSerializer(serializers.ModelSerializer):
    """
    Documents active payments brought back by outstanding debtors.
    """
    customer_name = serializers.ReadOnlyField(source='customer.customer_name')

    class Meta:
        model = SessionCreditPayment
        fields = '__all__'
        extra_kwargs = {'session': {'required': False}}


class ManualBankDepositSerializer(serializers.ModelSerializer):
    """
    Saves direct manual banking slips dropped to branch deposit clearings.
    """
    class Meta:
        model = ManualBankDeposit
        fields = '__all__'
        extra_kwargs = {'session': {'required': False}}


# --- 3. MASTER PARENT SESSION LEDGER ---

class DailySessionSerializer(serializers.ModelSerializer):
    """
    The master structure combining tracking summaries, cash handling declarations,
    and child array lists for thorough, automated report syncs.
    """
    # Nested lists showing explicit data structures for clean API profiling
    digital_balances = SessionDigitalBalanceSerializer(many=True, required=False, read_only=True)
    products = SessionProductSerializer(many=True, required=False, read_only=True)
    expenses = SessionExpenseSerializer(many=True, required=False, read_only=True)
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
            'digital_balances', 'products', 'expenses', 
            'credits_issued', 'credit_payments', 'manual_deposits',
            'created_at'
        ]


class DigitalAccountAdjustmentSerializer(serializers.ModelSerializer):
    account_name = serializers.ReadOnlyField(source='account.name')
    branch_name = serializers.ReadOnlyField(source='account.branch.name')

    class Meta:
        model = DigitalAccountAdjustment
        fields = ['id', 'account', 'account_name', 'branch_name', 'amount', 'reason', 'logged_at']