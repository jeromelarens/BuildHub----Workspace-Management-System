import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../ui/Button';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in UI component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-bg text-text-primary flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-2xl bg-status-danger/10 border border-status-danger/25 flex items-center justify-center text-status-danger mb-4 shadow-elevated">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-text-primary mb-2">
            Something went wrong
          </h2>

          <p className="text-sm text-text-muted max-w-md mb-6 leading-relaxed">
            An unexpected error occurred while rendering this interface. Your data remains safe on the server.
          </p>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={this.handleReload}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Reload Application
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={this.handleReset}
              leftIcon={<LayoutDashboard className="w-4 h-4" />}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
