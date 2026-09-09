import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { ShieldAlert, LayoutDashboard, ArrowLeft } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-bg text-text-primary flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      {/* Background brand glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-status-warning/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-dark-surface border border-dark-border flex items-center justify-center text-status-warning mb-6 shadow-elevated">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="text-6xl font-black text-text-primary tracking-tighter mb-2">
          403
        </div>

        <h1 className="text-xl font-bold tracking-tight text-text-primary mb-2">
          Access Restricted
        </h1>

        <p className="text-sm text-text-muted mb-8 leading-relaxed">
          You do not have the required role permissions to access this administrative resource. Contact your workspace administrator for elevated privileges.
        </p>

        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="primary" size="md" leftIcon={<LayoutDashboard className="w-4 h-4" />}>
              Back to Dashboard
            </Button>
          </Link>

          <Button
            variant="outline"
            size="md"
            onClick={() => window.history.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};
