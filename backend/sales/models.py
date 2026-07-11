import uuid
from django.db import models
from django.db.models import Sum
from inventory.models import Branch, Product
from users.models import User

from django.core.exceptions import ValidationError
from django.db.models import Sum
from decimal import Decimal

# --- 1. DIGITAL ACCOUNT MANAGEMENT ---
class DigitalAccount(models.Model):
    """ Admin defines these: Telebirr, CBE Main, Dashen, etc. """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='accounts')
    name = models.CharField(max_length=100) # e.g., "Telebirr - 0911..."
    initial_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    def __str__(self):
        return f"{self.name} ({self.branch.name})"

# --- 2. CUSTOMER DEBT MANAGEMENT ---
class CustomerCredit(models.Model):
    """ Tracks the total debt of a specific customer """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    customer_name = models.CharField(max_length=255)
    total_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.customer_name} - Balance: {self.total_balance}"

# --- 3. THE DAILY SESSION (PARENT) ---
class DailySession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    trading_date = models.DateField()
    
    # Cash Handover
    cash_handed_to_admin = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cash_retained_for_change = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Auto-Calculated Totals for Admin Reports
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_new_credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_credit_recovered = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('branch', 'trading_date')

# --- 4. THE SUB-MODELS (MULTI-INSERTION) ---

class SessionDigitalBalance(models.Model):
    """ Multiple insertion for Telebirr, CBE, etc. """
    session = models.ForeignKey(DailySession, related_name='digital_balances', on_delete=models.CASCADE)
    account = models.ForeignKey(DigitalAccount, on_delete=models.CASCADE)
    closing_balance = models.DecimalField(max_digits=15, decimal_places=2)
    # revenue_delta = (Today's Balance - Yesterday's Balance)
    revenue_delta = models.DecimalField(max_digits=12, decimal_places=2, default=0)

class SessionProduct(models.Model):
    session = models.ForeignKey(DailySession, related_name='products', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    opening = models.IntegerField()
    closing = models.IntegerField()
    sold = models.IntegerField()
    price_at_sale = models.DecimalField(max_digits=10, decimal_places=2)

class SessionExpense(models.Model):
    session = models.ForeignKey(DailySession, related_name='expenses', on_delete=models.CASCADE)
    reason = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

class SessionCreditEntry(models.Model):
    """ When a customer TAKES goods on credit today """
    session = models.ForeignKey(DailySession, related_name='credits_issued', on_delete=models.CASCADE)
    customer = models.ForeignKey(CustomerCredit, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

class SessionCreditPayment(models.Model):
    """ When a customer PAYS their debt today """
    session = models.ForeignKey(DailySession, related_name='credit_payments', on_delete=models.CASCADE)
    customer = models.ForeignKey(CustomerCredit, on_delete=models.CASCADE)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)

class ManualBankDeposit(models.Model):
    """ Multiple insertion for physical bank slips """
    session = models.ForeignKey(DailySession, related_name='manual_deposits', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    bank_name = models.CharField(max_length=100)
    account_name = models.CharField(max_length=150)



class DigitalAccountAdjustment(models.Model):
    """
    Tracks mid-day corporate adjustments made by Admin (Vendor payouts, cash injections)
    to prevent breaking sequential branch manager reconciliation loops.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(DigitalAccount, on_delete=models.CASCADE, related_name='adjustments')
    amount = models.DecimalField(max_digits=12, decimal_places=2) # e.g., -5000.00 for payout, +2000.00 for cash deposit
    reason = models.CharField(max_length=255) # e.g., "Paid wholesale vendor for Sprite stock"
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.account.name} | Shift: {self.amount} ({self.reason})"


# --- 5. LIABILITY SHORTAGE LEDGER ---
class ManagerShortageLedger(models.Model):
    """
    Holds specific employees financially accountable for cash register shortages.
    Initially logs against a branch, allowing Admins to assign a user later.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(DailySession, on_delete=models.CASCADE, related_name='shortage_record')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='shortages') # Added branch link directly
    # manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='accumulated_shortages') # Made Nullable!
    employee = models.ForeignKey('employee.EmployeeProfile', on_delete=models.SET_NULL, null=True, blank=True, related_name='accumulated_shortages')
    shortage_amount = models.DecimalField(max_digits=12, decimal_places=2) 
    is_settled_from_salary = models.BooleanField(default=False)
    payroll_cycle_date = models.DateField(null=True, blank=True)
    logged_at = models.DateTimeField(auto_now_add=True)



    def __str__(self):
        # 🌟 FIXED: Changed 'self.manager.username' to 'self.employee.full_name'
        target = self.employee.full_name if self.employee else "UNASSIGNED"
        return f"{self.branch.name} | Shortage: {self.shortage_amount} ETB -> Responsible: {target}"





# VENDOR PAYMENT SETTLEMENT PART




class VendorCreditProfile(models.Model):
    """
    Tracks the rolling, live advance prepayment balance for a vendor.
    If an admin pays extra, this balance increases.
    When next week's delivery is processed, this balance decreases.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.OneToOneField('inventory.Vendor', on_delete=models.CASCADE, related_name='credit_profile')
    current_advance_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.vendor.name} | Active Advance: {self.current_advance_balance} ETB"


class VendorSettlement(models.Model):
    """
    Master ledger tracking a statement period or delivery batch.
    """
    STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('PARTIAL', 'Partially Paid'),
        ('FULL', 'Fully Paid'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey('inventory.Vendor', on_delete=models.CASCADE, related_name='settlements')
    total_batch_cost = models.DecimalField(max_digits=12, decimal_places=2) 
    amount_paid_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00) 
    remaining_debt = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    payment_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='UNPAID')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settlement {self.id.hex[:6]} | {self.vendor.name} - Debt: {self.remaining_debt} ETB"


class VendorPaymentInstallment(models.Model):
    """
    Tracks each individual cash handover event.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    settlement = models.ForeignKey(VendorSettlement, on_delete=models.CASCADE, related_name='installments')
    amount_handed_over = models.DecimalField(max_digits=12, decimal_places=2)
    advance_amount_created = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    advance_used_from_past = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    paid_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)


class VendorSettlementLine(models.Model):
    """
    Links the parent settlement session directly to individual inventory deliveries,
    allowing the system to map out day-by-day itemized logs in details view windows.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    settlement = models.ForeignKey(VendorSettlement, on_delete=models.CASCADE, related_name='lines')
    supply_log = models.ForeignKey('inventory.SupplyLog', on_delete=models.CASCADE, related_name='settlement_lines')

    def __str__(self):
        return f"Line: Log {self.supply_log.id.hex[:6]} linked to Settlement {self.settlement.id.hex[:6]}"