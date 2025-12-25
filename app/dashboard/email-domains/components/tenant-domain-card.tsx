import type { ComponentProps } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DomainSettingsForm, VerifyDomainForm } from "./domain-forms"
import type { TenantEmailDomain } from "@/lib/notifications"

interface TenantDomainCardProps {
  tenant: {
    id: string
    name: string
    domain: TenantEmailDomain | null
  }
}

const statusLabel: Record<string, string> = {
  pending: "Pending",
  verified: "Verified",
  failed: "Failed",
  "not_started": "Not started",
}

const statusVariant: Record<string, ComponentProps<typeof Badge>["variant"]> = {
  pending: "secondary",
  verified: "default",
  failed: "destructive",
  "not_started": "outline",
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "Never"
  try {
    return new Date(timestamp).toLocaleString()
  } catch (error) {
    return timestamp
  }
}

export function TenantDomainCard({ tenant }: TenantDomainCardProps) {
  const domain = tenant.domain
  const providerMetadata =
    domain?.metadata &&
    typeof domain.metadata === "object" &&
    !Array.isArray(domain.metadata)
      ? (domain.metadata as Record<string, any>)
      : null
  const status = domain?.status ?? "not_started"

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle>{tenant.name || "Untitled tenant"}</CardTitle>
          <CardDescription>
            Configure the sender domain used for automated notifications and
            receipts.
          </CardDescription>
        </div>
        <Badge variant={statusVariant[status] ?? "outline"} className="uppercase">
          {statusLabel[status] ?? status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <DomainSettingsForm
          tenantId={tenant.id}
          defaultDomain={domain?.domain ?? ""}
        />

        {domain && (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <span className="font-medium text-foreground">Domain</span>
                <p>{domain.domain}</p>
              </div>
              <div>
                <span className="font-medium text-foreground">Last checked</span>
                <p>{formatTimestamp(domain.last_checked_at)}</p>
              </div>
              <div>
                <span className="font-medium text-foreground">Verified</span>
                <p>{formatTimestamp(domain.verified_at)}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Record</th>
                    <th className="px-4 py-3">Host</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-3 font-medium">SPF</td>
                    <td className="px-4 py-3">{domain.spf_name}</td>
                    <td className="px-4 py-3">{domain.spf_type}</td>
                    <td className="px-4 py-3">
                      <code className="break-all text-xs">{domain.spf_value}</code>
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-4 py-3 font-medium">DKIM</td>
                    <td className="px-4 py-3">{domain.dkim_name}</td>
                    <td className="px-4 py-3">{domain.dkim_type}</td>
                    <td className="px-4 py-3">
                      <code className="break-all text-xs">{domain.dkim_value}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Add these records to your DNS provider. Verification can take up
                to 24 hours depending on TTL.
              </p>
              {providerMetadata?.provider === "fallback" && (
                <p className="text-amber-600">
                  Email provider credentials are not configured. Records are
                  generated for sandbox use only.
                </p>
              )}
            </div>

            <VerifyDomainForm tenantId={tenant.id} />
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Only property managers and admins can modify sender domains.
      </CardFooter>
    </Card>
  )
}
