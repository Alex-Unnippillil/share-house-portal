import { Fragment } from "react"

import { TenantDomainCard } from "./components/tenant-domain-card"
import { createSupbaseServerClient } from "@/utils/supaone"
import type { Tables } from "@/lib/supabase"

interface TenantRecord {
  id: string
  name: string
  domain: Tables<'tenant_email_domains'> | null
}

export default async function EmailDomainsPage() {
  const supabase = await createSupbaseServerClient()

  const [{ data: households, error: householdsError }, { data: domains, error: domainsError }] =
    await Promise.all([
      supabase.from("households").select("id, name"),
      supabase.from("tenant_email_domains").select("*"),
    ])

  if (householdsError) {
    console.error("Failed to load households", householdsError)
  }
  if (domainsError) {
    console.error("Failed to load tenant domains", domainsError)
  }

  const domainRecords = domains ?? []
  const tenants: TenantRecord[] = (households ?? []).map((household) => ({
    id: household.id,
    name: household.name ?? "Unnamed tenant",
    domain: domainRecords.find((record) => record.household_id === household.id) ?? null,
  }))

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Email domains</h1>
        <p className="text-muted-foreground">
          Generate and verify DNS records so that Roomsily can send notifications from your trusted domain.
        </p>
      </div>

      <div className="space-y-6">
        {tenants.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
            No tenants found. Create a household to configure email domains.
          </div>
        ) : (
          tenants.map((tenant) => (
            <Fragment key={tenant.id}>
              <TenantDomainCard tenant={tenant} />
            </Fragment>
          ))
        )}
      </div>
    </div>
  )
}
