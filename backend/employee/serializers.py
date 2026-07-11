from rest_framework import serializers
from .models import EmployeeProfile, EmployeeLedgerEntry, PayslipRun

class EmployeeProfileSerializer(serializers.ModelSerializer):
    branch_name = serializers.ReadOnlyField(source='branch.name')
    job_role_display = serializers.CharField(source='get_job_role_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = [
            'id', 'full_name', 'phone_number', 'family_address', 
            'branch', 'branch_name', 'job_role', 'job_role_display', 
            'monthly_salary', 'employee_id_document', 'signed_contract_document',
            'emergency_contact_name', 'emergency_contact_phone', 
            'emergency_contact_id_document', 'status', 'status_display', 
            'job_start_date', 'created_at'
        ]


class EmployeeLedgerEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.full_name')
    entry_type_display = serializers.CharField(source='get_entry_type_display', read_only=True)

    class Meta:
        model = EmployeeLedgerEntry
        fields = [
            'id', 'employee', 'employee_name', 'entry_type', 
            'entry_type_display', 'amount', 'description', 
            'is_settled', 'created_at'
        ]


class PayslipRunSerializer(serializers.ModelSerializer):
    employee_name = serializers.ReadOnlyField(source='employee.full_name')
    branch_name = serializers.ReadOnlyField(source='employee.branch.name')

    class Meta:
        model = PayslipRun
        fields = [
            'id', 'employee', 'employee_name', 'branch_name',
            'base_salary_snapshot', 'total_deductions_applied', 
            'final_net_cash_payout', 'notes', 'executed_at', 
            'settled_ledger_items'
        ]