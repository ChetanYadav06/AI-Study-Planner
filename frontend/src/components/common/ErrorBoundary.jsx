import React, { Component } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-4 text-text">
          <div className="max-w-md w-full bg-surface-1 rounded-[16px] border border-border p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger/10 text-danger mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-text">Something went wrong</h2>
              <p className="text-sm text-text-muted">
                The application encountered an unexpected error while rendering this view.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-surface-2 border border-border rounded text-xs font-mono text-left text-text-muted break-all">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center font-medium rounded-md text-xs px-3.5 py-2 min-h-[36px] bg-accent hover:bg-accent-hover text-white border border-accent cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center font-medium rounded-md text-xs px-3.5 py-2 min-h-[36px] bg-white hover:bg-page text-muted hover:text-ink border border-line cursor-pointer transition-colors"
              >
                Reset Session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
