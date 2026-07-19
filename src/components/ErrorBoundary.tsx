// src/components/ErrorBoundary.tsx
// ─── Catches React render errors and displays a friendly recovery screen ──────

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-6">
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-foreground mb-2">Terjadi kesalahan</h1>
            <p className="text-sm text-muted-foreground max-w-xs">
              Aplikasi mengalami error yang tidak terduga. Data kamu aman di penyimpanan lokal.
            </p>
          </div>

          {this.state.error && (
            <details className="w-full max-w-sm">
              <summary className="text-xs text-muted-foreground cursor-pointer">Detail error</summary>
              <pre className="mt-2 text-[10px] bg-muted p-3 rounded-lg overflow-auto text-destructive">
                {this.state.error.message}
              </pre>
            </details>
          )}

          <div className="flex flex-col gap-2 w-full max-w-xs">
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
            >
              Coba lagi
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 border border-border text-foreground rounded-xl font-semibold text-sm"
            >
              Muat ulang aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
