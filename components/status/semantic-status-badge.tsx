import { Badge, type BadgeProps } from "@/components/ui/badge"

type SemanticStatus =
  | "success"
  | "warning"
  | "error"
  | "neutral"
  | "in-progress"

const semanticVariantMap: Record<SemanticStatus, BadgeProps["variant"]> = {
  success: "complete",
  warning: "outline",
  error: "destructive",
  neutral: "secondary",
  "in-progress": "default",
}

type SemanticStatusBadgeProps = {
  status: SemanticStatus
  label: string
  className?: string
}

export function SemanticStatusBadge({ status, label, className }: SemanticStatusBadgeProps) {
  return (
    <Badge variant={semanticVariantMap[status]} className={className}>
      {label}
    </Badge>
  )
}
