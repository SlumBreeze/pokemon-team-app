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
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #f44336',
          borderRadius: '8px',
          backgroundColor: '#ffebee'
        }}>
          <h2 style={{ color: '#d32f2f', marginTop: 0 }}>Something went wrong</h2>
          <p style={{ color: '#555' }}>
            An error occurred while rendering this section. Please try refreshing the page.
          </p>
          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', color: '#d32f2f', fontWeight: 'bold' }}>
              Error details
            </summary>
            <pre style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {this.state.error?.toString()}
              {'\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={this.reset}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              backgroundColor: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196f3'}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
