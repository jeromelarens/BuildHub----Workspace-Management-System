import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui/Spinner';

export const PublicRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4 select-none animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/Buildhub--Logo.png"
            alt="BuildHub"
            className="w-12 h-12 rounded-full object-cover animate-pulse drop-shadow-[0_0_15px_rgba(199,255,0,0.4)]"
          />
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <Spinner size="sm" variant="lemon" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
