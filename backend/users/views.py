from rest_framework import viewsets
from .models import User
from .serializers import UserSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from rest_framework.response import Response

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=True, methods=['post'], url_path='change-password')
    def change_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('password')
        if new_password:
            user.set_password(new_password) # This hashes the password!
            user.save()
            return Response({'status': 'password set'})
        return Response({'error': 'no password provided'}, status=400)
    
    def get_permissions(self):
        # 1. 'me' endpoint is for any logged in user
        if self.action == 'me':
            return [IsAuthenticated()]
        
        # 2. These actions (and changing someone else's password) should be Admin only
        if self.action in ['list', 'create', 'destroy', 'change_password']:
            return [IsAdminUser()]
            
        # 3. For 'retrieve' or 'update', standard authentication
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Custom endpoint to return current user data
        URL: /api/users/accounts/me/
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)




