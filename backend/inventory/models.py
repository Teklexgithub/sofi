from django.db import models
import uuid

class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=255, blank=True)
    phone_no = models.CharField(max_length=20, blank=True, null=True)
    phone_no_second = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name

class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    contact_person = models.CharField(max_length=100, blank=True)
    phone_no = models.CharField(max_length=20, blank=True, null=True)
    bank_account = models.CharField(max_length=50, blank=True, null=True)
    
    def __str__(self):
        return self.name

class Product(models.Model):
    CATEGORY_CHOICES = [
        ('KHAT', 'Khat'),
        ('DRINK', 'Soft Drink'),
        ('WATER', 'Water'),
        ('NUTS', 'Nuts'),
        ('CIGARETTE', 'Cigarette'),
    ]
    
    DESTINATION_CHOICES = [
        ('STORE', 'Store (Warehouse)'),
        ('SHOP', 'Shop (Sales Floor/Direct)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    vendor = models.ForeignKey('Vendor', on_delete=models.SET_NULL, null=True)

    destination = models.CharField(max_length=10, choices=DESTINATION_CHOICES, default='STORE') 
    pieces_per_pack = models.IntegerField(default=1)
    buying_price_per_piece = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price_per_piece = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.name} - {self.get_destination_display()}"

class StoreStock(models.Model):
    """The 'Back Room' - Tracks unopened packs/crates"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='store_inventory')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_in_packs = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('branch', 'product')

class ShopStock(models.Model):
    """The 'Front Shelf' - Tracks individual pieces ready for sale"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='shop_inventory')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_in_pieces = models.IntegerField(default=0)

    class Meta:
        unique_together = ('branch', 'product')



class SupplyLog(models.Model):
    """External Delivery: Vendor -> StoreStock or ShopStock"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    packs_received = models.FloatField()
    manager_notes = models.TextField(blank=True)
    date_received = models.DateTimeField()
    is_paid_to_vendor = models.BooleanField(default=False)
    
    def save(self, *args, **kwargs):
        # Check if this is a new delivery record
        is_new = self._state.adding
        
        if is_new:
            # PATH 1: Direct to Shop (Khat, Nuts, etc.)
            if self.product.destination == 'SHOP':
                shop_obj, _ = ShopStock.objects.get_or_create(
                    branch=self.branch, 
                    product=self.product
                )
                # FIX: Using 'quantity_in_pieces' to match your model
                added_pieces = self.packs_received * self.product.pieces_per_pack
                shop_obj.quantity_in_pieces += int(added_pieces)
                shop_obj.save()
                
            # PATH 2: To Store (Water, Soda, Cigarettes)
            else:
                store_obj, _ = StoreStock.objects.get_or_create(
                    branch=self.branch, 
                    product=self.product
                )
                # Store tracks in packs
                store_obj.quantity_in_packs += self.packs_received
                store_obj.save()

        super().save(*args, **kwargs)

class InternalTransfer(models.Model):
    """Records the refill process: Store -> Shop"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    packs_moved = models.FloatField()
    
    # Auto-calculated field to show how many pieces were added to the shop
    pieces_created = models.IntegerField(editable=False)
    timestamp = models.DateTimeField(help_text="The date and time the refill actually happened")
    performed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)

    def save(self, *args, **kwargs):
        # 1. Calculate pieces based on the Product's pieces_per_pack
        multiplier = self.product.pieces_per_pack
        self.pieces_created = int(self.packs_moved * multiplier)

        # 2. Decrease the StoreStock (Packs)
        store_stock, _ = StoreStock.objects.get_or_create(branch=self.branch, product=self.product)
        store_stock.quantity_in_packs -= self.packs_moved
        store_stock.save()

        # 3. Increase the ShopStock (Pieces)
        shop_stock, _ = ShopStock.objects.get_or_create(branch=self.branch, product=self.product)
        shop_stock.quantity_in_pieces += self.pieces_created
        shop_stock.save()

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.branch.name}: {self.packs_moved} packs of {self.product.name} to Shop"