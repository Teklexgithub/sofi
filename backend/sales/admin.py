from django.contrib import admin
from .models import DailySession, SupplierSettlement

@admin.register(DailySession)
class DailySessionAdmin(admin.ModelAdmin):
    list_display = ('trading_date', 'branch', 'product', 'opening_balance', 'closing_balance', 'quantity_sold', 'profit')
    list_filter = ('trading_date', 'branch', 'product')
    # Prevent Admin from accidentally breaking the math
    readonly_fields = ('opening_balance', 'quantity_sold', 'total_revenue', 'profit', 'created_at')

@admin.register(SupplierSettlement)
class SupplierSettlementAdmin(admin.ModelAdmin):
    list_display = ('vendor', 'branch', 'start_date', 'end_date', 'amount_paid', 'payment_date')
    list_filter = ('vendor', 'branch', 'payment_date')