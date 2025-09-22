import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardHeroAction, DashboardOverviewData } from "@/types/perf"

function ActionLink({ action, size = "sm" }: { action: DashboardHeroAction; size?: "sm" | "default" }) {
  const { href, label, variant } = action

  return (
    <Link href={href} prefetch={false}>
      <Button size={size} variant={variant}>{label}</Button>
    </Link>
  )
}

export interface DashboardOverviewProps {
  data: DashboardOverviewData
}

export function DashboardOverview({ data }: DashboardOverviewProps) {
  const { hero, rentCard, documentsCard, roommateBoard } = data

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{hero.greeting}</h2>
        {hero.actions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {hero.actions.map((action) => (
              <ActionLink key={`${action.href}-${action.label}`} action={action} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{rentCard.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">{rentCard.label}</div>
            <div className="text-2xl font-semibold">{rentCard.amount}</div>
            <div className="mt-1 text-sm text-muted-foreground">{rentCard.due}</div>
            <div className="mt-4 inline-block">
              <ActionLink action={rentCard.cta} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{documentsCard.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {documentsCard.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-4 inline-block">
              <ActionLink
                action={{ ...documentsCard.cta, variant: documentsCard.cta.variant ?? "outline" }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{roommateBoard.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {roommateBoard.items.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
            <div className="mt-4 inline-block">
              <ActionLink
                action={{ ...roommateBoard.cta, variant: roommateBoard.cta.variant ?? "outline" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
