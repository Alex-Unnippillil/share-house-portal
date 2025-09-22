"use client"

import { Button } from "@/components/ui/button"
import {
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react"

type FallbackRender = (props: {
  error?: Error
  reset: () => void
}) => ReactNode

type ErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode | FallbackRender
  onReset?: () => void
}

type ErrorBoundaryState = {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: undefined,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("ErrorBoundary captured an error", error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.reset()
    }
  }

  private reset() {
    this.setState({ hasError: false, error: undefined })
    this.props.onReset?.()
  }

  private handleRetry = () => {
    this.reset()
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      const { fallback } = this.props

      if (typeof fallback === "function") {
        return fallback({
          error: this.state.error,
          reset: this.handleRetry,
        })
      }

      if (fallback) {
        return fallback
      }

      return (
        <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />
      )
    }

    return this.props.children
  }
}

type ErrorFallbackProps = {
  error?: Error
  onRetry?: () => void
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV !== "production"
  const showDetails = Boolean(isDev && error?.message)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center"
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t load this section. Please try again in a moment.
        </p>
        {showDetails ? (
          <p className="text-xs text-muted-foreground/80">
            {error?.message}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button type="button" onClick={onRetry} variant="secondary">
          Try again
        </Button>
      ) : null}
    </div>
  )
}
