from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
import uuid

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('ADMIN', 'Admin/Owner'),
        ('BRANCH_ADMIN', 'Branch Admin'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=15, choices=ROLE_CHOICES, default='BRANCH_ADMIN')

    # Branches this user is assigned to. Admins can be assigned to none (global access).
    branches = models.ManyToManyField(
        'inventory.Branch',
        blank=True,
        related_name='branch_admins'
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = [] # email is required by default; add 'role' here if you want it prompted in terminal

    def save(self, *args, **kwargs):
        # role is the single source of truth for authorization; keep Django's
        # own staff/superuser flags mirrored to it so the admin site stays consistent.
        is_admin = self.role == 'ADMIN'
        self.is_staff = is_admin
        self.is_superuser = is_admin
        super().save(*args, **kwargs)

    def __str__(self):
        branch_names = ', '.join(self.branches.values_list('name', flat=True)) if self.pk else ''
        return f"{self.email} ({self.role} - {branch_names or 'Global'})"