import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Oops! Something went wrong
                </h1>
                <p className="text-gray-600 mt-1">
                  We encountered an unexpected error
                </p>
              </div>
            </div>

            {this.state.error && (
              <Card className="bg-red-50 border-2 border-red-200 p-4 mb-6">
                <p className="text-sm font-mono text-red-800 mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </p>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-red-700 hover:text-red-900">
                      View error details
                    </summary>
                    <pre className="mt-2 text-xs overflow-auto max-h-64 bg-white p-3 rounded border border-red-200">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </Card>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="secondary"
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </div>

            <p className="text-sm text-gray-500 mt-6 text-center">
              If this problem persists, please contact support with the error details above.
            </p>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
