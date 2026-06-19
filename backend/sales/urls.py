from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DailySessionViewSet, 
    DigitalAccountViewSet, 
    CustomerCreditViewSet,
    DigitalAccountAdjustmentViewSet,
    ManagerShortageViewSet,
    VendorSettlementViewSet
)

# Initialize standard REST framework automated routing engine
router = DefaultRouter()

# Register automated ViewSet controllers safely
router.register(r'digital-accounts', DigitalAccountViewSet, basename='digital-account')
router.register(r'customer-credits', CustomerCreditViewSet, basename='customer-credit')
router.register(r'sessions', DailySessionViewSet, basename='daily-session')
router.register(r'digital-adjustments', DigitalAccountAdjustmentViewSet, basename='digital-adjustment')
router.register(r'shortages', ManagerShortageViewSet, basename='shortage')

# Vendor Payment Settlement Viewset
router.register(r'vendor-settlements', VendorSettlementViewSet, basename='vendor-settlements')


urlpatterns = [
    # Explicit mapping for custom worksheet compilation action to prevent trailing slash 404/500 mismatches
    path('sessions/prepare/', DailySessionViewSet.as_view({'get': 'prepare'}), name='session-prepare'),
    
    # Injects the standard generated patterns for CRUD actions (GET/POST/DELETE)
    path('', include(router.urls)),
]



