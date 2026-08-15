from rest_framework import viewsets
from .models import User
from .serializers import UserSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import IsAdmin

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
        # 'me' endpoint is for any logged in user to read their own profile
        if self.action == 'me':
            return [IsAuthenticated()]

        # User management is a Settings/Admin-only function everywhere else
        return [IsAdmin()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Custom endpoint to return current user data
        URL: /api/users/accounts/me/
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)




