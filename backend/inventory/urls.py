from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BranchViewSet, ProductViewSet, VendorViewSet, StoreStockViewSet, 
    ShopStockViewSet, SupplyLogViewSet, InternalTransferViewSet
)

router = DefaultRouter()
router.register(r'branches', BranchViewSet)
router.register(r'products', ProductViewSet)
router.register(r'vendors', VendorViewSet)
router.register(r'store-stock', StoreStockViewSet)
router.register(r'shop-stock', ShopStockViewSet)
router.register(r'supply-logs', SupplyLogViewSet)        # NEW
router.register(r'internal-transfers', InternalTransferViewSet) # NEW

urlpatterns = [
    path('', include(router.urls)),
]