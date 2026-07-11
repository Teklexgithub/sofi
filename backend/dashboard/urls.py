from django.urls import path
from .views import InventoryAnalyticsView, SalesAnalyticsView, EmployeeAnalyticsView

urlpatterns = [
    path('inventory-analytics/', InventoryAnalyticsView.as_view(), name='inventory-analytics'),

    path('sales-analytics/', SalesAnalyticsView.as_view(), name='sales-analytics'),
    
    path('employee-analytics/', EmployeeAnalyticsView.as_view(), name='employee-analytics'),
]