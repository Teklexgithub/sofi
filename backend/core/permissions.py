from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only the Admin role may access. The single check for admin-only endpoints."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )


def branch_scoped_queryset(user, queryset, branch_field='branch'):
    """Admins see everything; Branch Admins are limited to their assigned branches."""
    if user.role == 'ADMIN':
        return queryset
    return queryset.filter(**{f'{branch_field}__in': user.branches.all()})


def assert_branch_allowed(user, branch_id):
    """Raise if a non-admin is trying to act on a branch they aren't assigned to."""
    if user.role == 'ADMIN':
        return
    if not branch_id or not user.branches.filter(id=branch_id).exists():
        raise PermissionDenied('You are not assigned to this branch.')
