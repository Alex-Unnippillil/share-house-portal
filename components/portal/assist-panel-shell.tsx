"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { Bell, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AssistPanelShellProps = {
  children: React.ReactNode
}

type AssistContent = {
  help: string
  policy: string
  notifications: string[]
}

const assistContentMap: Record<string, AssistContent> = {
  "/maintenance": {
    help: "Submit detailed issue descriptions and include location, urgency, and photos to speed triage.",
    policy: "Maintenance SLAs: emergency 4h, urgent 24h, routine 3 business days.",
    notifications: [
      "2 high-priority tickets are waiting for roommate confirmation.",
      "Vendor ETA updated for Unit B-204 plumbing follow-up.",
    ],
  },
  "/visitors": {
    help: "Log expected arrival/departure times and host roommate before submission.",
    policy: "Visitor rules: max 3 consecutive nights unless manager override is approved.",
    notifications: [
      "One visitor request is pending manager approval.",
      "Weekend occupancy threshold reached for shared parking.",
    ],
  },
  default: {
    help: "Use command palette (Cmd/Ctrl+K) to jump between payments, bookings, documents, and requests.",
    policy: "Keep lease, maintenance, and guest records up to date for audit visibility.",
    notifications: [
      "Rent reminders are queued for roommates with due balances.",
      "A new booking conflict alert was recorded in the last 24 hours.",
    ],
  },
}

export function AssistPanelShell({ children }: AssistPanelShellProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  const content = useMemo(() => {
    if (!pathname) {
      return assistContentMap.default
    }

    const matchedKey = Object.keys(assistContentMap).find(
      (candidate) => candidate !== "default" && pathname.startsWith(candidate)
    )

    return matchedKey ? assistContentMap[matchedKey] : assistContentMap.default
  }, [pathname])

  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">{children}</div>
      <aside
        className={cn(
          "sticky top-20 hidden shrink-0 transition-all duration-200 xl:block",
          open ? "w-80" : "w-12"
        )}
        aria-label="Assist panel"
      >
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn("text-sm", !open && "sr-only")}>Assist Panel</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen((currentOpen) => !currentOpen)}
              aria-label={open ? "Collapse assist panel" : "Expand assist panel"}
            >
              {open ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </Button>
          </CardHeader>

          {open && (
            <CardContent className="space-y-4">
              <section className="space-y-1">
                <p className="inline-flex items-center gap-1 text-xs uppercase text-muted-foreground">
                  <HelpCircle className="size-3.5" />
                  Page help
                </p>
                <p className="text-sm">{content.help}</p>
              </section>

              <section className="space-y-1">
                <p className="text-xs uppercase text-muted-foreground">Policy summary</p>
                <p className="text-sm">{content.policy}</p>
              </section>

              <section className="space-y-2">
                <p className="inline-flex items-center gap-1 text-xs uppercase text-muted-foreground">
                  <Bell className="size-3.5" />
                  Latest notifications
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {content.notifications.map((notification) => (
                    <li key={notification} className="rounded-md border p-2">
                      {notification}
                    </li>
                  ))}
                </ul>
              </section>
            </CardContent>
          )}
        </Card>
      </aside>
    </div>
  )
}
