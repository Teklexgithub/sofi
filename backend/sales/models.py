from django.db import models
from django.utils import timezone
from inventory.models import Branch, Product, ShopStock, InternalTransfer
import uuid

class DailySession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    
    # Flexible Date: Manager chooses the 'trading day'
    trading_date = models.DateField(help_text="The date this sales report belongs to")
    created_at = models.DateTimeField(auto_now_add=True) # Actual time of entry
    
    # Auto-calculated from previous day + transfers
    opening_balance = models.IntegerField(editable=False)
    
    # Manual Input: What is left on the shelf now?
    closing_balance = models.IntegerField()
    
    # Results
    quantity_sold = models.IntegerField(editable=False)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    profit = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        # 1. PULL YESTERDAY'S CLOSING
        yesterday = self.trading_date - timezone.timedelta(days=1)
        prev_session = DailySession.objects.filter(
            branch=self.branch, 
            product=self.product, 
            trading_date=yesterday
        ).first()
        
        yesterday_closing = prev_session.closing_balance if prev_session else 0

        # 2. PULL REFILLS (Internal Transfers) for 'today'
        refills = InternalTransfer.objects.filter(
            branch=self.branch,
            product=self.product,
            timestamp__date=self.trading_date
        ).aggregate(total=models.Sum('pieces_created'))['total'] or 0

        # 3. SET OPENING BALANCE
        self.opening_balance = yesterday_closing + refills
        
        # 4. DO THE MATH
        self.quantity_sold = self.opening_balance - self.closing_balance
        self.total_revenue = self.quantity_sold * self.product.selling_price_per_piece
        self.profit = self.quantity_sold * (self.product.selling_price_per_piece - self.product.buying_price_per_piece)
        
        # 5. SYNC SHOP STOCK
        # This ensures the 'live' view matches the end-of-day count
        shop_stock, _ = ShopStock.objects.get_or_create(branch=self.branch, product=self.product)
        shop_stock.quantity_in_pieces = self.closing_balance
        shop_stock.save()

        super().save(*args, **kwargs)


class SupplierSettlement(models.Model):
    """Tracks the 5-day payments to Khat/Nuts producers"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey('inventory.Vendor', on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment to {self.vendor.name} for {self.start_date} to {self.end_date}"