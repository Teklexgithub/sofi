from django.contrib import admin
from .models import Branch, Vendor, Product, StoreStock, ShopStock, SupplyLog, InternalTransfer

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'location')

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person')

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'vendor', 'pieces_per_pack', 'selling_price_per_piece')
    list_filter = ('category', 'vendor')
    search_fields = ('name',)

@admin.register(StoreStock)
class StoreStockAdmin(admin.ModelAdmin):
    list_display = ('branch', 'product', 'quantity_in_packs')
    list_filter = ('branch', 'product')

@admin.register(ShopStock)
class ShopStockAdmin(admin.ModelAdmin):
    list_display = ('branch', 'product', 'quantity_in_pieces')
    list_filter = ('branch', 'product')

@admin.register(SupplyLog)
class SupplyLogAdmin(admin.ModelAdmin):
    list_display = ('product', 'branch', 'packs_received', 'date_received', 'is_paid_to_vendor')
    list_filter = ('is_paid_to_vendor', 'branch')

@admin.register(InternalTransfer)
class InternalTransferAdmin(admin.ModelAdmin):
    list_display = ('product', 'branch', 'packs_moved', 'pieces_created', 'timestamp')