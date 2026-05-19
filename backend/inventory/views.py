from rest_framework import viewsets
from .models import Branch, Product, Vendor, StoreStock, ShopStock, SupplyLog, InternalTransfer
from .serializers import BranchSerializer, ProductSerializer, VendorSerializer, StoreStockSerializer, ShopStockSerializer, SupplyLogSerializer, InternalTransferSerializer

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().order_by('name')
    serializer_class = VendorSerializer

class StoreStockViewSet(viewsets.ModelViewSet): # Changed from ReadOnly
    queryset = StoreStock.objects.all()
    serializer_class = StoreStockSerializer
    filterset_fields = ['branch']

class ShopStockViewSet(viewsets.ModelViewSet): # Changed from ReadOnly
    queryset = ShopStock.objects.all()
    serializer_class = ShopStockSerializer
    filterset_fields = ['branch']
class SupplyLogViewSet(viewsets.ModelViewSet):
    queryset = SupplyLog.objects.all().order_by('-date_received')
    serializer_class = SupplyLogSerializer
    filterset_fields = ['branch', 'product', 'is_paid_to_vendor']

# class InternalTransferViewSet(viewsets.ModelViewSet):
#     queryset = InternalTransfer.objects.all().order_by('-timestamp')
#     serializer_class = InternalTransferSerializer
#     filterset_fields = ['branch', 'product']


class InternalTransferViewSet(viewsets.ModelViewSet):
    queryset = InternalTransfer.objects.all().order_by('-timestamp')
    serializer_class = InternalTransferSerializer
    filterset_fields = ['branch', 'product']

    def perform_create(self, serializer):
        # If user is not Admin, force the branch to be their assigned branch
        if not self.request.user.is_superuser:
            serializer.save(branch=self.request.user.branch, performed_by=self.request.user)
        else:
            serializer.save(performed_by=self.request.user)

    def get_queryset(self):
        # Staff only see refills for their own branch
        user = self.request.user
        if user.is_superuser:
            return InternalTransfer.objects.all().order_by('-timestamp')
        return InternalTransfer.objects.filter(branch=user.branch).order_by('-timestamp')