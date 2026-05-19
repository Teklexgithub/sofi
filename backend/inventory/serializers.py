from rest_framework import serializers
from .models import Branch, Vendor, Product, StoreStock, ShopStock, SupplyLog, InternalTransfer


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'location', 'phone_no', 'phone_no_second']

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'name', 'contact_person', 'phone_no', 'bank_account']

class ProductSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'


class StoreStockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = StoreStock
        fields = ['id', 'product', 'product_name', 'branch', 'branch_name', 'quantity_in_packs']



class SupplyLogSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    
    class Meta:
        model = SupplyLog
        fields = '__all__'



class ShopStockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True) # ADD THIS

    class Meta:
        model = ShopStock
        fields = ['id', 'product', 'product_name', 'branch', 'branch_name', 'quantity_in_pieces']

class InternalTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True) # ADD THIS
    
    class Meta:
        model = InternalTransfer
        fields = '__all__'