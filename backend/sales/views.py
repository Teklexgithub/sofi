from rest_framework import viewsets
from .models import DailySession, SupplierSettlement
from .serializers import DailySessionSerializer, SupplierSettlementSerializer

class DailySessionViewSet(viewsets.ModelViewSet):
    queryset = DailySession.objects.all().order_by('-trading_date')
    serializer_class = DailySessionSerializer
    filterset_fields = ['branch', 'product', 'trading_date']

class SupplierSettlementViewSet(viewsets.ModelViewSet):
    queryset = SupplierSettlement.objects.all().order_by('-payment_date')
    serializer_class = SupplierSettlementSerializer
    filterset_fields = ['vendor', 'branch']