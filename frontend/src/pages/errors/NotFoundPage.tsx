import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { LayoutDashboard, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark-bg text-text-primary flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md">
        {/* Large 404 Badge */}
        <div className="text-8xl font-black text-brand tracking-tighter mb-4 shadow-lemon-glow">
          404
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
          Page not found
        </h1>

        <p className="text-sm text-text-muted mb-8 leading-relaxed">
          The page you are looking for doesn&apos;t exist or has been moved to a different workspace path.
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
