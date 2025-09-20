import React from "react";
import { Pressable, Text, View } from "react-native";

export interface FallbackProps {
  error: Error;
  reset: () => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  FallbackComponent?: React.ComponentType<FallbackProps>;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  onReset?: () => void;
  resetKeys?: React.DependencyList;
}

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryContextValue {
  error: Error | null;
  reset: () => void;
  showError: (error: Error) => void;
}

const areArraysEqual = (a: React.DependencyList = [], b: React.DependencyList = []) => {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
};

const DefaultFallback: React.FC<FallbackProps> = ({ error, reset }) => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: "#0f172a",
    }}
  >
    <Text style={{ fontSize: 20, fontWeight: "600", color: "#f8fafc" }}>Something went wrong</Text>
    <Text style={{ color: "#e2e8f0", textAlign: "center" }}>{error.message}</Text>
    <Pressable
      accessibilityRole="button"
      onPress={reset}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: "#2563eb",
      }}
    >
      <Text style={{ color: "#f8fafc", fontWeight: "600" }}>Try again</Text>
    </Pressable>
  </View>
);

const ErrorBoundaryContext = React.createContext<ErrorBoundaryContextValue | undefined>(undefined);

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && !areArraysEqual(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  showError = (error: Error) => {
    this.setState({ error });
    this.props.onError?.(error, { componentStack: "" });
  };

  render() {
    const { children, FallbackComponent = DefaultFallback } = this.props;
    const { error } = this.state;

    const contextValue: ErrorBoundaryContextValue = {
      error,
      reset: this.resetErrorBoundary,
      showError: this.showError,
    };

    if (error) {
      return (
        <ErrorBoundaryContext.Provider value={contextValue}>
          <FallbackComponent error={error} reset={this.resetErrorBoundary} />
        </ErrorBoundaryContext.Provider>
      );
    }

    return <ErrorBoundaryContext.Provider value={contextValue}>{children}</ErrorBoundaryContext.Provider>;
  }
}

export const useErrorBoundary = () => {
  const context = React.useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error("useErrorBoundary must be used within an ErrorBoundary");
  }

  return {
    error: context.error,
    hasError: Boolean(context.error),
    resetErrorBoundary: context.reset,
    showError: context.showError,
  };
};

export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">,
): React.FC<P> => {
  const Wrapped: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  Wrapped.displayName = `WithErrorBoundary(${Component.displayName ?? Component.name ?? "Anonymous"})`;
  return Wrapped;
};
