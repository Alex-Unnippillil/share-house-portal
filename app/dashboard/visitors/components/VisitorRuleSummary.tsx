import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { type VisitorRuleRecord, type UnitRecord, type VisitorProfile } from '@/lib/visitors/repository'

interface VisitorRuleSummaryProps {
  rule: VisitorRuleRecord | null
  unit: UnitRecord
  roommates: number
  manager: VisitorProfile | null
  nextReset: string
}

function formatLimit(value: number | null | undefined, fallback: string): string {
  if (value === null || value === undefined) {
    return fallback
  }

  return value.toString()
}

export default function VisitorRuleSummary({
  rule,
  unit,
  roommates,
  manager,
  nextReset,
}: VisitorRuleSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Household policy – {unit.building_name} {unit.unit_number}
          </span>
          <Badge variant={rule ? 'secondary' : 'outline'}>
            {rule ? 'Active' : 'Pending configuration'}
          </Badge>
        </CardTitle>
        <CardDescription>
          Overnight visitor limits keep the household compliant with your building&apos;s lease agreement.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Consecutive nights</p>
          <p className="text-lg font-semibold">
            {formatLimit(rule?.max_consecutive_nights, 'Not defined')}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Monthly allowance</p>
          <p className="text-lg font-semibold">
            {formatLimit(rule?.max_visitors_per_month, 'Unlimited')} nights
          </p>
          <p className="text-xs text-muted-foreground">Resets {nextReset}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pending requests allowed</p>
          <p className="text-lg font-semibold">
            {formatLimit(rule?.max_active_requests, 'Unlimited')}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Roommates on file</p>
          <p className="text-lg font-semibold">{roommates}</p>
          <p className="text-xs text-muted-foreground">
            {manager?.full_name ? `Manager: ${manager.full_name}` : 'Manager details unavailable'}
          </p>
        </div>
        {!rule && (
          <div className="md:col-span-4">
            <Separator className="my-2" />
            <p className="text-sm text-muted-foreground">
              Your property manager hasn&apos;t configured the visitor policy yet. You can still submit a request, and they&apos;ll
              review it manually.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
