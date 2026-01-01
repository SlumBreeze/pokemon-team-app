import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys || [];
      const currentKeys = this.props.resetKeys;

      const hasChanged = prevKeys.length !== currentKeys.length ||
        prevKeys.some((key, index) => key !== currentKeys[index]);

      if (hasChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-5 m-5 border-2 border-red-500 dark:border-red-400 rounded-lg bg-red-50 dark:bg-red-900/20">
          <h2 className="text-red-700 dark:text-red-400 mt-0 text-xl font-bold">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            An error occurred while rendering this section. Please try refreshing the page.
          </p>
          <details className="mt-2.5">
            <summary className="cursor-pointer text-red-700 dark:text-red-400 font-bold">
              Error details
            </summary>
            <pre className="mt-2.5 p-2.5 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded overflow-auto text-xs text-gray-800 dark:text-dark-text">
              {this.state.error?.toString()}
              {'\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={this.reset}
            className="mt-4 px-5 py-2.5 bg-blue-500 dark:bg-blue-600 text-white border-none rounded cursor-pointer text-sm font-bold hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
