from rest_framework import serializers
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims (Data sent inside the token)
        token['username'] = user.username
        token['is_admin'] = user.role == 'ADMIN'

        return token


class UserSerializer(serializers.ModelSerializer):
    branch_details = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'role', 'branches', 'branch_details', 'is_active', 'date_joined']

    def get_branch_details(self, obj):
        return list(obj.branches.values('id', 'name'))