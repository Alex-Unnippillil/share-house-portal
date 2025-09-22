'use client';

import type { ComponentType, ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

export interface ErrorBoundaryFallbackProps {
  error: Error;
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * React component rendered when an error is caught.
   * Receives the error and a reset handler that clears the boundary state.
   */
  FallbackComponent?: ComponentType<ErrorBoundaryFallbackProps>;
  /**
   * Render prop alternative to FallbackComponent.
   */
  fallbackRender?: (props: ErrorBoundaryFallbackProps) => ReactNode;
  /**
   * Static fallback node. Useful for simple messaging without retry support.
   */
  fallback?: ReactNode;
  /**
   * Invoked after an error has been caught.
   */
  onError?: (error: Error, info: ErrorInfo) => void;
  /**
   * Called whenever the boundary is reset either manually or via resetKeys.
   */
  onReset?: () => void;
  /**
   * Changing any value in this array will automatically reset the boundary.
   */
  resetKeys?: Array<unknown>;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && resetKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent, fallback, fallbackRender, children } = this.props;
    const { error } = this.state;

    if (error) {
      const fallbackProps: ErrorBoundaryFallbackProps = {
        error,
        reset: this.resetErrorBoundary,
      };

      if (fallbackRender) {
        return fallbackRender(fallbackProps);
      }

      if (FallbackComponent) {
        const ComponentFallback = FallbackComponent;
        return <ComponentFallback {...fallbackProps} />;
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div
          role="alert"
          className="space-y-3 rounded-md border border-destructive/40 bg-destructive/5 p-6 text-sm"
        >
          <div className="font-medium text-destructive">Something went wrong.</div>
          <button
            type="button"
            onClick={this.resetErrorBoundary}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

function resetKeysChanged(prevKeys?: Array<unknown>, nextKeys?: Array<unknown>) {
  if (prevKeys === nextKeys) {
    return false;
  }

  if (!prevKeys || !nextKeys) {
    return Boolean(prevKeys ?? nextKeys);
  }

  if (prevKeys.length !== nextKeys.length) {
    return true;
  }

  for (let index = 0; index < prevKeys.length; index += 1) {
    if (!Object.is(prevKeys[index], nextKeys[index])) {
      return true;
    }
  }

  return false;
}
