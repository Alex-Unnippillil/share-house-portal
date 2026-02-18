import type { ReactNode } from "react"
import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type FlowStateVariant = "loading" | "empty" | "error" | "success"

const stateMeta: Record<FlowStateVariant, { icon: ReactNode; tone: string }> = {
  loading: { icon: <Loader2 className="size-5 animate-spin" />, tone: "text-muted-foreground" },
  empty: { icon: <Inbox className="size-5" />, tone: "text-muted-foreground" },
  error: { icon: <AlertCircle className="size-5" />, tone: "text-destructive" },
  success: { icon: <CheckCircle2 className="size-5" />, tone: "text-emerald-600" },
}

type FlowStateCardProps = {
  variant: FlowStateVariant
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function FlowStateCard({ variant, title, description, action, className }: FlowStateCardProps) {
  const meta = stateMeta[variant]

  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className={meta.tone}>{meta.icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {action ? <CardContent>{action}</CardContent> : null}
    </Card>
  )
}
