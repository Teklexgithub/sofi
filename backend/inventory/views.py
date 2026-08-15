from rest_framework import viewsets, status, exceptions
from rest_framework.permissions import IsAuthenticated
from .models import Branch, Product, Vendor, StoreStock, ShopStock, SupplyLog, InternalTransfer
from .serializers import BranchSerializer, ProductSerializer, VendorSerializer, StoreStockSerializer, ShopStockSerializer, SupplyLogSerializer, InternalTransferSerializer

from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from core.permissions import IsAdmin, branch_scoped_queryset, assert_branch_allowed


class AdminWriteMixin:
    """Anyone authenticated can read (dropdowns etc. need this); only Admin can write."""
    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsAuthenticated()]
        return [IsAdmin()]



class BranchViewSet(AdminWriteMixin, viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

class ProductViewSet(AdminWriteMixin, viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

class VendorViewSet(AdminWriteMixin, viewsets.ModelViewSet):
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

    def get_queryset(self):
        return branch_scoped_queryset(self.request.user, StoreStock.objects.all())

    @action(detail=True, methods=['post'], url_path='adjust')
    def adjust(self, request, pk=None):
        """
        Allows Admin only to manually override Store quantities.
        Expects: { "new_quantity": 50.5 }
        """
        if request.user.role != 'ADMIN':
            raise exceptions.PermissionDenied("Only the Admin can manually adjust stock levels.")

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

    def get_queryset(self):
        return branch_scoped_queryset(self.request.user, ShopStock.objects.all())

    @action(detail=True, methods=['post'], url_path='adjust')
    def adjust(self, request, pk=None):
        """
        Allows Admin only to manually override Shop quantities.
        Expects: { "new_quantity": 100 }
        """
        if request.user.role != 'ADMIN':
            raise exceptions.PermissionDenied("Only the Admin can manually adjust stock levels.")

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

    def create(self, request, *args, **kwargs):
        assert_branch_allowed(request.user, request.data.get('branch'))
        return super().create(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        Handles multiple deliveries with strict branch security.
        """
        user = request.user
        branch_id = request.data.get('branch')
        date_received = request.data.get('date_received')
        items_data = request.data.get('items', [])

        # SECURITY LOCK: Branch Admins can only log deliveries for their own branch(es)
        assert_branch_allowed(user, branch_id)

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
        Branch Admins only see the delivery logs for their own branch(es).
        Admins can additionally filter by vendor/date range (e.g. for a
        vendor's cross-branch delivery report) - branch scoping is still
        applied first, so this never widens a Branch Admin's access.
        """
        qs = SupplyLog.objects.all().order_by('-date_received')
        qs = branch_scoped_queryset(self.request.user, qs)

        vendor_id = self.request.query_params.get('vendor')
        if vendor_id:
            qs = qs.filter(product__vendor_id=vendor_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date_received__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date_received__lte=date_to)

        return qs




class InternalTransferViewSet(viewsets.ModelViewSet):
    queryset = InternalTransfer.objects.all().order_by('-timestamp')
    serializer_class = InternalTransferSerializer
    filterset_fields = ['branch', 'product']

    def create(self, request, *args, **kwargs):
        """
        Overriding create to add a strict security check before
        the serializer even starts processing.
        """
        target_branch_id = request.data.get('branch')

        # Branch Admins may only perform refills for one of their assigned branches.
        # If they didn't provide a branch, it'll be assigned in perform_create.
        if target_branch_id:
            assert_branch_allowed(request.user, target_branch_id)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user

        if user.role != 'ADMIN':
            # create() already verified any provided branch belongs to this user;
            # if none was provided, fall back to their only/first assigned branch.
            branch = serializer.validated_data.get('branch') or user.branches.first()
            if not branch:
                raise exceptions.PermissionDenied("You are not assigned to any branch.")
            serializer.save(branch=branch, performed_by=user)
        else:
            # Admins must provide a branch in the request body
            serializer.save(performed_by=user)

    def get_queryset(self):
        """
        Branch Admins only see their own branch(es) history. Admins see everything.
        """
        if not self.request.user.is_authenticated:
            return InternalTransfer.objects.none()

        qs = InternalTransfer.objects.all().order_by('-timestamp')
        return branch_scoped_queryset(self.request.user, qs)