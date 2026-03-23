from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    # 1. Add date_joined to readonly_fields
    readonly_fields = ('date_joined', 'last_login') 

    ordering = ('email',)
    list_display = ('email', 'role', 'branch', 'is_staff', 'is_active')
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('role', 'branch')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        # 2. It's now safe to keep it here because it's in readonly_fields
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password', 'role', 'branch'),
        }),
    )

    search_fields = ('email',)
    filter_horizontal = ()

admin.site.register(User, CustomUserAdmin)