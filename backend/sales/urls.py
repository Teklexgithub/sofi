from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DailySessionViewSet, SupplierSettlementViewSet

router = DefaultRouter()
router.register(r'daily-sessions', DailySessionViewSet)
router.register(r'settlements', SupplierSettlementViewSet)

urlpatterns = [
    path('', include(router.urls)),
]