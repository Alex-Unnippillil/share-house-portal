"use client"

import Link from "next/link"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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

type ErrorFallbackContext = "default" | "payments" | "documents"

const FALLBACK_COPY: Record<ErrorFallbackContext, {
  title: string
  description: string
  supportHref: string
  supportLabel: string
  supportDescription: string
}> = {
  default: {
    title: "Something went wrong",
    description:
      "We couldn't load this section. Please try again or head back to the dashboard.",
    supportHref: "mailto:support@share.house",
    supportLabel: "Contact support",
    supportDescription: "If the issue persists, reach out so we can help.",
  },
  payments: {
    title: "Payments are temporarily unavailable",
    description:
      "We couldn't load your payment activity. Retry in a moment or return to the dashboard while we restore the ledger.",
    supportHref: "mailto:billing@share.house",
    supportLabel: "Email billing support",
    supportDescription:
      "For urgent rent questions, contact billing and we'll follow up quickly.",
  },
  documents: {
    title: "Documents failed to load",
    description:
      "Your lease files and agreements are offline right now. Try reloading or visit the dashboard while we get things back online.",
    supportHref: "mailto:documents@share.house",
    supportLabel: "Notify the documents team",
    supportDescription:
      "Let us know if you need an urgent copy and we'll send one directly.",
  },
}

type ErrorFallbackProps = {
  error?: Error
  onRetry?: () => void
  context?: ErrorFallbackContext
}

export function ErrorFallback({ error, onRetry, context = "default" }: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV !== "production"
  const showDetails = Boolean(isDev && error?.message)
  const { title, description, supportDescription, supportHref, supportLabel } =
    FALLBACK_COPY[context]

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-[240px] flex-col items-center justify-center gap-6 rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center"
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-destructive-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        {showDetails ? (
          <p className="text-xs text-muted-foreground/80" data-testid="error-details">
            {error?.message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button type="button" onClick={onRetry} variant="secondary">
            Try again
          </Button>
        ) : null}
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to dashboard
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        {supportDescription}{" "}
        <a
          className={cn(buttonVariants({ variant: "link", className: "p-0" }))}
          href={supportHref}
        >
          {supportLabel}
        </a>
        .
      </p>
    </div>
  )
}
