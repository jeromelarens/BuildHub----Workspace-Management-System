import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/role.types';
import { hasAnyRole } from '../utils/permissions';

export interface RoleRouteProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

/**
 * Route Guard for role-based authorization
 * If authenticated user does not have an allowed role, redirects to /403
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAuthorized = hasAnyRole(user, allowedRoles);

  if (!isAuthorized) {
    return <Navigate to="/403" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
