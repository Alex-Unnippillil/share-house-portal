"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"

import { Sparkles, Loader2 } from "lucide-react"

import {
  type QuickAddIntent,
  type QuickAddParseResult,
  parseQuickAddCommand,
} from "@/lib/nlp/quick-add"
import {
  submitQuickAdd,
  type QuickAddSubmissionInput,
} from "@/app/dashboard/quick-add/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const intentLabels: Record<QuickAddIntent, string> = {
  invoice: "Invoice",
  booking: "Amenity booking",
  maintenance: "Maintenance",
  visitor: "Visitor log",
  unknown: "Unknown",
}

type StatusTone = "default" | "success" | "warning" | "error" | "muted"

const toneToClass: Record<StatusTone, string> = {
  default: "text-muted-foreground",
  muted: "text-muted-foreground",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-destructive",
}

export interface QuickAddInputProps {
  variant?: "header" | "command"
  placeholder?: string
  autoFocus?: boolean
  className?: string
  onCompleted?: () => void
}

export const QuickAddInput = forwardRef<HTMLInputElement, QuickAddInputProps>(
  (
    {
      variant = "header",
      placeholder = "Try “Add invoice 200 CAD due Friday”",
      autoFocus = false,
      className,
      onCompleted,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()
    const [value, setValue] = useState("")
    const [reviewOpen, setReviewOpen] = useState(false)
    const [isSubmitting, startTransition] = useTransition()

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement | null)

    useEffect(() => {
      if (!autoFocus) return
      const handle = requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
      return () => cancelAnimationFrame(handle)
    }, [autoFocus])

    const parsed = useMemo<QuickAddParseResult | null>(() => {
      if (!value.trim()) return null
      return parseQuickAddCommand(value)
    }, [value])

    useEffect(() => {
      if (!parsed?.isReady) {
        setReviewOpen(false)
      }
    }, [parsed?.isReady])

    const status = useMemo(() => {
      if (!parsed) {
        return {
          tone: "muted" as StatusTone,
          message: "Quickly add invoices, bookings, visitors or maintenance tasks.",
        }
      }

      if (parsed.errors.length > 0) {
        return { tone: "error" as StatusTone, message: parsed.errors[0] }
      }

      if (parsed.warnings.length > 0) {
        return { tone: "warning" as StatusTone, message: parsed.warnings[0] }
      }

      const missing = parsed.fields.filter((field) => field.required && !field.isValid)
      if (missing.length > 0) {
        return {
          tone: "muted" as StatusTone,
          message: `Add ${formatList(missing.map((item) => item.label.toLowerCase()))} to continue.`,
        }
      }

      if (parsed.summary) {
        return {
          tone: "success" as StatusTone,
          message: `Ready: ${parsed.summary}`,
        }
      }

      return {
        tone: "success" as StatusTone,
        message: "Looks good — review before saving.",
      }
    }, [parsed])

    const handleOpenReview = () => {
      if (parsed?.isReady) {
        setReviewOpen(true)
      }
    }

    const handleSubmit = () => {
      if (!parsed?.isReady || !parsed.payload) return

      const submission = toSubmission(parsed)
      if (!submission) return

      startTransition(async () => {
        try {
          const response = await submitQuickAdd(submission)
          toast({ title: "Quick add saved", description: response.message })
          setReviewOpen(false)
          setValue("")
          onCompleted?.()
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Something went wrong."
          toast({
            title: "Quick add failed",
            description: message,
            variant: "destructive",
          })
        }
      })
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        if (parsed?.isReady) {
          setReviewOpen(true)
        }
      }
    }

    return (
      <div className={cn("space-y-2", className)}>
        <div
          className={cn(
            "flex items-center gap-2",
            variant === "command" ? "flex-col items-stretch gap-3" : "",
          )}
        >
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                "pr-10",
                variant === "command" && "h-12 text-base",
                variant === "header" && "h-10",
              )}
            />
            <Sparkles className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button
            type="button"
            size={variant === "command" ? "default" : "sm"}
            onClick={handleOpenReview}
            disabled={!parsed?.isReady}
          >
            Review
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {parsed ? (
            <Badge variant="secondary">{intentLabels[parsed.intent]}</Badge>
          ) : null}
          {parsed ? (
            <Badge variant="outline">{`Confidence ${(parsed.confidence * 100).toFixed(0)}%`}</Badge>
          ) : null}
          <span className={cn("flex-1 text-left", toneToClass[status.tone])}>
            {status.message}
          </span>
        </div>

        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm quick add</DialogTitle>
              <DialogDescription>
                Review the parsed details before saving to Supabase. You can edit
                the text if something looks off.
              </DialogDescription>
            </DialogHeader>

            {parsed ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{intentLabels[parsed.intent]}</Badge>
                  <Badge variant="outline">{parsed.raw}</Badge>
                </div>

                {parsed.summary ? (
                  <div className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">
                    {parsed.summary}
                  </div>
                ) : null}

                <div className="rounded-md border">
                  <div className="grid gap-3 p-4">
                    {parsed.fields.map((field) => (
                      <div key={field.field} className="flex items-start justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground">{field.label}</span>
                        <span
                          className={cn(
                            "max-w-[60%] text-right",
                            field.isValid
                              ? "text-foreground"
                              : "italic text-muted-foreground",
                          )}
                        >
                          {field.value ?? (field.isValid ? "—" : "Missing")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {parsed.warnings.length > 0 ? (
                  <div className="rounded-md bg-amber-100/60 p-3 text-sm text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                    {parsed.warnings[0]}
                  </div>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Confirm & save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  },
)

QuickAddInput.displayName = "QuickAddInput"

function toSubmission(result: QuickAddParseResult): QuickAddSubmissionInput | null {
  if (!result.payload || !result.isReady) return null

  switch (result.intent) {
    case "invoice":
      return {
        intent: "invoice",
        commandText: result.raw,
        payload: result.payload,
      }
    case "booking":
      return {
        intent: "booking",
        commandText: result.raw,
        payload: result.payload,
      }
    case "maintenance":
      return {
        intent: "maintenance",
        commandText: result.raw,
        payload: result.payload,
      }
    case "visitor":
      return {
        intent: "visitor",
        commandText: result.raw,
        payload: result.payload,
      }
    default:
      return null
  }
}

function formatList(items: string[]): string {
  if (items.length === 0) return ""
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`
}
