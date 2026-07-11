from django.contrib import admin
from .models import EmployeeProfile, EmployeeLedgerEntry, PayslipRun

@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'branch', 'job_role', 'monthly_salary', 'status', 'job_start_date')
    list_filter = ('status', 'job_role', 'branch')
    search_fields = ('full_name', 'phone_number')

@admin.register(EmployeeLedgerEntry)
class EmployeeLedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('employee', 'entry_type', 'amount', 'is_settled', 'created_at')
    list_filter = ('entry_type', 'is_settled')
    search_fields = ('employee__full_name', 'description')

@admin.register(PayslipRun)
class PayslipRunAdmin(admin.ModelAdmin):
    list_display = ('id', 'employee', 'base_salary_snapshot', 'total_deductions_applied', 'final_net_cash_payout', 'executed_at')
    list_filter = ('executed_at',)
    search_fields = ('employee__full_name', 'id')