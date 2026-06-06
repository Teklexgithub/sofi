import uuid
from django.db import models
from django.db.models import Sum
from inventory.models import Branch, Product

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