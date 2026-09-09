import { User } from '../types';
import { UserRole, SystemPermission, ROLE_PERMISSIONS } from '../types/role.types';

export const hasRole = (user: User | null | undefined, role: UserRole): boolean => {
  if (!user) return false;
  return user.role === role;
};

export const hasAnyRole = (user: User | null | undefined, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role as UserRole);
};

export const hasPermission = (
  user: User | null | undefined,
  permission: SystemPermission
): boolean => {
  if (!user) return false;
  const userRole = user.role as UserRole;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

export const hasAnyPermission = (
  user: User | null | undefined,
  permissions: SystemPermission[]
): boolean => {
  if (!user) return false;
  return permissions.some((perm) => hasPermission(user, perm));
};

export const hasAllPermissions = (
  user: User | null | undefined,
  permissions: SystemPermission[]
): boolean => {
  if (!user) return false;
  return permissions.every((perm) => hasPermission(user, perm));
};
