import { ExternalLink, ListChecks } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import SmartLink from '@/components/navigation/SmartLink'

const docsHref = '/docs/engineering/custom-domain-dns'

export function DnsHelp() {
  return (
    <Card className="h-full border-border/60 bg-muted/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4" /> DNS checklist
        </CardTitle>
        <CardDescription>
          Align your DNS host with Roomsily&apos;s certificate automation. Start with the steps below and
          share them with property stakeholders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Create a <strong>CNAME</strong> record for the tenant host (for example <code>www</code>) that
            points to the target shown in the onboarding form.
          </li>
          <li>
            Add the <strong>_acme-challenge</strong> CNAME record so Vercel can issue and renew TLS
            certificates automatically.
          </li>
          <li>
            Keep the TTL at <code>300</code> seconds (or lower) while verifying ownership. This speeds up
            propagation when retrying.
          </li>
          <li>
            Wait for the record to resolve globally (use <code>dig</code> or a DNS checker), then click
            <em>Verify DNS</em> in the domain list.
          </li>
          <li>
            Schedule renewals after the first certificate is issued so Roomsily can log upcoming attempts
            for admins.
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">
          Detailed provider examples live in our deployment guide. Share the link with operations teams so
          everyone follows the same checklist.
        </p>
        <SmartLink
          className="inline-flex items-center gap-2 text-sm font-medium"
          href={docsHref}
          intent="secondary"
        >
          Read DNS guide
          <ExternalLink className="size-4" />
        </SmartLink>
      </CardContent>
    </Card>
  )
}
