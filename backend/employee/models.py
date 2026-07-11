import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

def employee_doc_path(instance, filename):
    return f"employees/{instance.id}/{filename}"

class EmployeeProfile(models.Model):
    JOB_ROLE_CHOICES = [
        ('DELIVERY', 'Delivery'),
        ('SALES', 'Sales Person'),
        ('CASHIER', 'Cashier'),
        ('CLEANER', 'Cleaner'),
        ('BRANCH_ADMIN', 'Branch Admin'),
    ]
    STATUS_CHOICES = [('ACTIVE', 'Active'), ('TERMINATED', 'Inactive')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    family_address = models.TextField()
    
    # Cross-app connection to inventory app's Branch
    branch = models.ForeignKey('inventory.Branch', on_delete=models.PROTECT, related_name='branch_employees')
    job_role = models.CharField(max_length=30, choices=JOB_ROLE_CHOICES)
    monthly_salary = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    
    # Documents
    employee_id_document = models.FileField(upload_to=employee_doc_path, blank=True, null=True)
    signed_contract_document = models.FileField(upload_to=employee_doc_path, blank=True, null=True)
    
    # Emergency
    emergency_contact_name = models.CharField(max_length=255, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact_id_document = models.FileField(upload_to=employee_doc_path, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    job_start_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.full_name} ({self.get_job_role_display()})"


class EmployeeLedgerEntry(models.Model):
    """
    Tracks only manual modifications created directly in the employee module.
    Shortages are handled entirely inside the sales app's model.
    """
    ENTRY_TYPE_CHOICES = [
        ('ADVANCE', 'Salary Cash Advance'),
        ('ADJUSTMENT', 'Other Manual Deduction Fine'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(EmployeeProfile, on_delete=models.CASCADE, related_name='ledger_entries')
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    description = models.TextField(blank=True, help_text="Reason context for the advance or fine adjustment")
    is_settled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.full_name} | {self.entry_type} | {self.amount} ETB"



class PayslipRun(models.Model):
    """
    Represents a finalized salary execution receipt event.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(EmployeeProfile, on_delete=models.PROTECT, related_name='payslips')
    
    # Core Mathematical Components
    base_salary_snapshot = models.DecimalField(max_digits=12, decimal_places=2)
    total_deductions_applied = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    final_net_cash_payout = models.DecimalField(max_digits=12, decimal_places=2)
    
    notes = models.TextField(blank=True, help_text="Optional remarks for payroll transaction history archiving")
    executed_at = models.DateTimeField(auto_now_add=True)
    
    # Back-reference connection to see which ledger entries were cleared out by this payslip run
    settled_ledger_items = models.ManyToManyField(EmployeeLedgerEntry, blank=True, related_name='clearing_payslips')

    def __str__(self):
        return f"Payslip #{self.id.hex[:8].toUpperCase()} for {self.employee.full_name}"