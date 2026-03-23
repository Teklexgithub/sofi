from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims (Data sent inside the token)
        token['username'] = user.username
        token['is_admin'] = user.is_staff
        # If your user model has a branch field:
        # token['branch_id'] = str(user.branch.id) if user.branch else None

        return token

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'branch']
        read_only_fields = ['id']

