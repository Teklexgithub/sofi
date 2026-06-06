from django.contrib import admin
from .models import (
    DailySession, SessionProduct, SessionExpense, 
    CustomerCredit, SessionCreditEntry, SessionCreditPayment, 
    DigitalAccount, SessionDigitalBalance, ManualBankDeposit
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