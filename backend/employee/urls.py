from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeeProfileViewSet, EmployeeLedgerEntryViewSet, PayslipRunViewSet

router = DefaultRouter()
router.register(r'profiles', EmployeeProfileViewSet, basename='employee-profiles')
router.register(r'ledger', EmployeeLedgerEntryViewSet, basename='employee-ledger')
router.register(r'payslips', PayslipRunViewSet, basename='employee-payslips')

urlpatterns = [
    path('', include(router.urls)),
]