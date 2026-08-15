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
    category_display = serializers.CharField(source='product.get_category_display', read_only=True)

    class Meta:
        model = StoreStock
        fields = ['id', 'product', 'product_name', 'category_display', 'branch', 'branch_name', 'quantity_in_packs']
        read_only_fields = ['quantity_in_packs']



class SupplyLogSerializer(serializers.ModelSerializer):
    # We include these to show the names in the frontend tables later
    product_name = serializers.ReadOnlyField(source='product.name')
    vendor_name = serializers.ReadOnlyField(source='product.vendor.name')
    branch_name = serializers.CharField(source='branch.name', read_only=True) # ADD THIS

    # Pricing fields for delivery/settlement reports, mirrors VendorSettlementLineSerializer's math
    pieces_per_pack = serializers.ReadOnlyField(source='product.pieces_per_pack')
    buying_price_unit = serializers.ReadOnlyField(source='product.buying_price_per_piece')
    calculated_pieces_count = serializers.SerializerMethodField()
    calculated_row_subtotal = serializers.SerializerMethodField()

    class Meta:
        model = SupplyLog
        fields = '__all__'

    def get_calculated_pieces_count(self, obj):
        return int((obj.packs_received or 0) * (obj.product.pieces_per_pack or 1))

    def get_calculated_row_subtotal(self, obj):
        pieces = (obj.packs_received or 0) * (obj.product.pieces_per_pack or 1)
        return float(pieces) * float(obj.product.buying_price_per_piece or 0)

class BulkSupplyLogSerializer(serializers.Serializer):
    """Special serializer to handle a list of deliveries at once"""
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all())
    branch_name = serializers.CharField(source='branch.name', read_only=True) # ADD THIS
    date_received = serializers.DateTimeField()
    items = SupplyLogSerializer(many=True) # This is the list of 10 items


class ShopStockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True) # ADD THIS

    class Meta:
        model = ShopStock
        fields = ['id', 'product', 'product_name', 'branch', 'branch_name', 'quantity_in_pieces']
        read_only_fields = ['quantity_in_pieces']

class InternalTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True) # ADD THIS
    
    class Meta:
        model = InternalTransfer
        fields = '__all__'