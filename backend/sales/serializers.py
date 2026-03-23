from rest_framework import serializers
from .models import DailySession, SupplierSettlement

class DailySessionSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = DailySession
        fields = '__all__'
        read_only_fields = ('opening_balance', 'quantity_sold', 'total_revenue', 'profit', 'created_at')

class SupplierSettlementSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = SupplierSettlement
        fields = '__all__'