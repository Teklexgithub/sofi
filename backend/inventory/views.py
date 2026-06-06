from rest_framework import viewsets, status, exceptions
from .models import Branch, Product, Vendor, StoreStock, ShopStock, SupplyLog, InternalTransfer
from .serializers import BranchSerializer, ProductSerializer, VendorSerializer, StoreStockSerializer, ShopStockSerializer, SupplyLogSerializer, InternalTransferSerializer

from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction





class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().order_by('name')
    serializer_class = VendorSerializer

# class StoreStockViewSet(viewsets.ModelViewSet): # Changed from ReadOnly
#     queryset = StoreStock.objects.all()
#     serializer_class = StoreStockSerializer
#     filterset_fields = ['branch']

# class ShopStockViewSet(viewsets.ModelViewSet): # Changed from ReadOnly
#     queryset = ShopStock.objects.all()
#     serializer_class = ShopStockSerializer
#     filterset_fields = ['branch']


class StoreStockViewSet(viewsets.ModelViewSet):
    queryset = StoreStock.objects.all()
    serializer_class = StoreStockSerializer
    filterset_fields = ['branch']

    @action(detail=True, methods=['post'], url_path='adjust')
    def adjust(self, request, pk=None):
        """
        Allows MAIN ADMIN only to manually override Store quantities.
        Expects: { "new_quantity": 50.5 }
        """
        if not request.user.is_superuser:
            raise exceptions.PermissionDenied("Only the Main Admin can manually adjust stock levels.")

        stock_item = self.get_object()
        new_qty = request.data.get('new_quantity')

        if new_qty is None:
            return Response({"error": "new_quantity is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stock_item.quantity_in_packs = float(new_qty)
            stock_item.save()
            return Response({
                "message": f"Store stock for {stock_item.product.name} adjusted to {new_qty} packs",
                "current_quantity": stock_item.quantity_in_packs
            })
        except ValueError:
            return Response({"error": "Invalid quantity format"}, status=status.HTTP_400_BAD_REQUEST)


class ShopStockViewSet(viewsets.ModelViewSet):
    queryset = ShopStock.objects.all()
    serializer_class = ShopStockSerializer
    filterset_fields = ['branch']

    @action(detail=True, methods=['post'], url_path='adjust')
    def adjust(self, request, pk=None):
        """
        Allows MAIN ADMIN only to manually override Shop quantities.
        Expects: { "new_quantity": 100 }
        """
        if not request.user.is_superuser:
            raise exceptions.PermissionDenied("Only the Main Admin can manually adjust stock levels.")

        stock_item = self.get_object()
        new_qty = request.data.get('new_quantity')

        if new_qty is None:
            return Response({"error": "new_quantity is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            stock_item.quantity_in_pieces = int(new_qty)
            stock_item.save()
            return Response({
                "message": f"Shop stock for {stock_item.product.name} adjusted to {new_qty} pieces",
                "current_quantity": stock_item.quantity_in_pieces
            })
        except ValueError:
            return Response({"error": "Quantity must be a whole number for shop stock"}, status=status.HTTP_400_BAD_REQUEST)



class SupplyLogViewSet(viewsets.ModelViewSet):
    queryset = SupplyLog.objects.all().order_by('-date_received')
    serializer_class = SupplyLogSerializer

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        Handles multiple deliveries with strict branch security.
        """
        user = request.user
        branch_id = request.data.get('branch')
        date_received = request.data.get('date_received')
        items_data = request.data.get('items', [])

        # 1. SECURITY LOCK
        # Prevent Managers from receiving stock for other branches
        if not user.is_superuser:
            if not branch_id or str(branch_id) != str(user.branch.id):
                raise exceptions.PermissionDenied(
                    f"Access Denied: You are registered to {user.branch.name}. "
                    "You cannot log deliveries for other locations."
                )

        if not items_data:
            return Response({"error": "No items provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                created_logs = []
                for item in items_data:
                    log_data = {
                        'branch': branch_id,
                        'product': item.get('product'),
                        'packs_received': item.get('packs_received'),
                        'is_paid_to_vendor': item.get('is_paid_to_vendor', False),
                        'manager_notes': item.get('manager_notes', ''),
                        'date_received': date_received
                    }
                    
                    serializer = self.get_serializer(data=log_data)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    created_logs.append(serializer.data)
                
                return Response(created_logs, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        """
        Managers only see the delivery logs for their own branch.
        """
        user = self.request.user
        if user.is_superuser:
            return SupplyLog.objects.all().order_by('-date_received')
        return SupplyLog.objects.filter(branch=user.branch).order_by('-date_received')




class InternalTransferViewSet(viewsets.ModelViewSet):
    queryset = InternalTransfer.objects.all().order_by('-timestamp')
    serializer_class = InternalTransferSerializer
    filterset_fields = ['branch', 'product']

    def create(self, request, *args, **kwargs):
        """
        Overriding create to add a strict security check before 
        the serializer even starts processing.
        """
        user = request.user
        # Get the branch from the request data
        target_branch_id = request.data.get('branch')

        # SECURITY LOCK:
        # If not a superuser/admin, they MUST match their assigned branch
        if not user.is_superuser:
            # If they didn't provide a branch, we will assign it.
            # If they provided one that DOESN'T match theirs, we block them.
            if target_branch_id and str(target_branch_id) != str(user.branch.id):
                raise PermissionDenied(
                    f"Security Alert: You are assigned to {user.branch.name}. "
                    "You cannot perform refills for other branches."
                )
        
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        
        if not user.is_superuser:
            # Force the branch to be the user's branch regardless of what was sent
            serializer.save(
                branch=user.branch, 
                performed_by=user
            )
        else:
            # Admins must provide a branch in the request body
            serializer.save(performed_by=user)

    def get_queryset(self):
        """
        Managers only see their own branch history. 
        Admins see everything.
        """
        user = self.request.user
        # Handle cases where user might not be logged in (safety)
        if not user.is_authenticated:
            return InternalTransfer.objects.none()

        if user.is_superuser:
            return InternalTransfer.objects.all().order_by('-timestamp')
        
        # Managers are restricted to their branch
        return InternalTransfer.objects.filter(branch=user.branch).order_by('-timestamp')