import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { VisitorRuleSummary } from '@/types/visitors'

interface VisitorPolicySummaryProps {
  rule: VisitorRuleSummary | null
  unitLabel: string
  buildingLabel?: string | null
}

export function VisitorPolicySummary({
  rule,
  unitLabel,
  buildingLabel,
}: VisitorPolicySummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Visitor policy</span>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Unit:</span>
            <Badge variant="secondary">{unitLabel}</Badge>
            {buildingLabel ? (
              <>
                <span className="font-medium text-foreground">Building:</span>
                <Badge variant="outline">{buildingLabel}</Badge>
              </>
            ) : null}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rule ? (
          <>
            <p className="text-sm text-muted-foreground">
              {rule.description ?? 'Policy details for overnight visitors.'}
            </p>
            <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <li>
                <span className="font-medium text-foreground">Max consecutive nights:</span>{' '}
                {rule.maxConsecutiveNights}
              </li>
              <li>
                <span className="font-medium text-foreground">Requires manager approval:</span>{' '}
                {rule.requireManagerApproval ? 'Yes' : 'No'}
              </li>
              <li>
                <span className="font-medium text-foreground">Monthly visitor allowance:</span>{' '}
                {rule.maxVisitsPerMonth ?? 'Not specified'}
              </li>
              <li>
                <span className="font-medium text-foreground">Advance notice:</span>{' '}
                {rule.advanceNoticeHours != null
                  ? `${rule.advanceNoticeHours} hour${rule.advanceNoticeHours === 1 ? '' : 's'}`
                  : 'Not specified'}
              </li>
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No visitor policy has been configured for your unit yet. Please contact your property manager for
            assistance.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
