from rest_framework import viewsets
from .models import User
from .serializers import UserSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_permissions(self):
        # Allow 'me' to be accessed by any authenticated user
        if self.action == 'me':
            return [IsAuthenticated()]
        if self.action in ['list', 'create', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Custom endpoint to return current user data
        URL: /api/users/accounts/me/
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)