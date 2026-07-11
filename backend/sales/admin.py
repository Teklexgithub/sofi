from django.contrib import admin
from .models import (
    DailySession, SessionProduct, SessionExpense, 
    CustomerCredit, SessionCreditEntry, SessionCreditPayment, 
    DigitalAccount, SessionDigitalBalance, ManualBankDeposit, DigitalAccountAdjustment, ManagerShortageLedger,
    VendorCreditProfile, VendorSettlement, VendorPaymentInstallment, VendorSettlementLine
)



class ProductInline(admin.TabularInline):
    model = SessionProduct
    extra = 0

class DigitalInline(admin.TabularInline):
    model = SessionDigitalBalance
    extra = 0

class CreditEntryInline(admin.TabularInline):
    model = SessionCreditEntry
    extra = 0

class CreditPaymentInline(admin.TabularInline):
    model = SessionCreditPayment
    extra = 0


@admin.register(DailySession)
class DailySessionAdmin(admin.ModelAdmin):
    list_display = ('trading_date', 'branch', 'total_sales', 'total_credit_recovered', 'cash_handed_to_admin')
    list_filter = ('branch', 'trading_date')
    inlines = [ProductInline, DigitalInline, CreditEntryInline, CreditPaymentInline]
    readonly_fields = ('total_sales', 'total_expenses', 'total_new_credit', 'total_credit_recovered')


@admin.register(CustomerCredit)
class CustomerCreditAdmin(admin.ModelAdmin):
    list_display = ('customer_name', 'branch', 'total_balance', 'last_updated')
    list_filter = ('branch',)
    search_fields = ('customer_name',)


# --- UPDATED: MASTER DIGITAL ACCOUNTS CONTROL ---
@admin.register(DigitalAccount)
class DigitalAccountAdmin(admin.ModelAdmin):
    """
    Exposes full searchability and filtration controls inside the Django Admin panel
    for managing master branch-linked Telebirr and Bank ledger entities.
    """
    list_display = ('name', 'branch', 'initial_balance')
    list_filter = ('branch',)
    search_fields = ('name',)


@admin.register(DigitalAccountAdjustment)
class DigitalAccountAdjustmentAdmin(admin.ModelAdmin):
    list_display = ['account', 'amount', 'reason', 'logged_at']
    list_filter = ['account__branch', 'logged_at']
    search_fields = ['account__name', 'reason']


@admin.register(ManagerShortageLedger)
class ManagerShortageLedgerAdmin(admin.ModelAdmin):
    """
    Exposes the shortage liabilities matrix to superusers in Django Admin.
    Allows manually assigning employees and toggling salary deductions.
    """
    list_display = [
        'trading_date_display', 
        'branch', 
        'employee_display', 
        'shortage_amount', 
        'is_settled_from_salary', 
        'payroll_cycle_date'
    ]
    list_filter = ['is_settled_from_salary', 'branch', 'payroll_cycle_date', 'logged_at']
    search_fields = ['branch__name', 'employee__username', 'shortage_amount']
    readonly_fields = ['logged_at']
    
    # Optimize query execution by pre-fetching related data models
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('session', 'branch', 'employee')

    # Read-only column displays pulled from related instances
    def trading_date_display(self, obj):
        return obj.session.trading_date
    trading_date_display.short_description = 'Trading Date'
    trading_date_display.admin_order_field = 'session__trading_date'

    def employee_display(self, obj):
        return obj.employee.full_name if obj.employee else "❌ UNASSIGNED"
    employee_display.short_description = 'Responsible Staff'
    employee_display.admin_order_field = 'employee__username'








# VENDOR PAYMENT SETTLEMENT PART




from django.contrib import admin
from .models import VendorSettlement, VendorSettlementLine, VendorPaymentInstallment, VendorCreditProfile

class VendorPaymentInstallmentInline(admin.TabularInline):
    model = VendorPaymentInstallment
    # Changing extra to 1 allows you to always see at least one placeholder empty input line row 
    extra = 1 
    readonly_fields = ['paid_at'] # Keep values editable during debug loops if needed
    can_delete = True


class VendorSettlementLineInline(admin.TabularInline):
    model = VendorSettlementLine
    extra = 1
    can_delete = True


@admin.register(VendorSettlement)
class VendorSettlementAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_vendor_name', 'total_batch_cost', 'amount_paid_total', 'remaining_debt', 'payment_status', 'created_at']
    list_filter = ['payment_status', 'created_at', 'vendor']
    search_fields = ['vendor__name', 'id']
    
    # Temporarily remove read-only status for debugging so you can correct numbers manually inside Django Admin!
    # readonly_fields = ['total_batch_cost', 'amount_paid_total', 'remaining_debt'] 
    
    inlines = [VendorSettlementLineInline, VendorPaymentInstallmentInline]

    def get_vendor_name(self, obj):
        return obj.vendor.name if obj.vendor else "Unknown Vendor"
    get_vendor_name.short_description = 'Wholesale Vendor Name'


@admin.register(VendorCreditProfile)
class VendorCreditProfileAdmin(admin.ModelAdmin):
    list_display = ['get_vendor_name', 'current_advance_balance', 'last_updated']
    search_fields = ['vendor__name']

    def get_vendor_name(self, obj):
        return obj.vendor.name if obj.vendor else "Unknown Vendor"
    get_vendor_name.short_description = 'Wholesale Vendor Name'