import type { Metadata } from "next"
import Link from "next/link"

import { SubprocessorSubscriptionForm } from "@/components/compliance/subprocessor-subscription-form"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  fetchSubprocessorChangeLog,
  fetchSubprocessors,
  type SubprocessorChange,
  type SubprocessorChangeLogEntry,
  type SubprocessorRecord,
} from "@/lib/compliance/subprocessors"

export const metadata: Metadata = {
  title: "Subprocessors & compliance notifications",
  description:
    "Review Roomsily's current subprocessor roster, historical change log, and manage compliance notification preferences.",
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function renderList(items?: string[] | null) {
  if (!items || items.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function ChangeDetails({ change }: { change: SubprocessorChange }) {
  return (
    <li className="rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground">{change.vendor}</p>
      <p className="mt-2 text-sm text-foreground">{change.change}</p>
      {change.dataImpacts && change.dataImpacts.length > 0 ? (
        <div className="mt-3 text-sm">
          <p className="font-medium text-foreground">Data impacted</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {change.dataImpacts.map((impact) => (
              <li key={impact}>{impact}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {change.action ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Recommended action:</span> {change.action}
        </p>
      ) : null}
    </li>
  )
}

function ChangeLog({ entries }: { entries: SubprocessorChangeLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No changes have been published yet.</p>
  }

  return (
    <div className="space-y-6">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <CardTitle className="flex flex-col gap-1 text-xl font-semibold">
              {entry.title}
              <span className="text-sm font-normal text-muted-foreground">
                Effective {formatDate(entry.effective_at)}
              </span>
            </CardTitle>
            <CardDescription>{entry.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            {entry.changes.length > 0 ? (
              <ul className="space-y-3">
                {entry.changes.map((change, index) => (
                  <ChangeDetails key={`${entry.id}-${index}`} change={change} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Additional details will be published shortly.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SubprocessorTable({ vendors }: { vendors: SubprocessorRecord[] }) {
  if (vendors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        No subprocessors are currently registered.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[780px] border-collapse text-sm">
        <thead className="bg-muted/60">
          <tr className="text-left">
            <th className="px-6 py-3 font-medium text-muted-foreground">Vendor</th>
            <th className="px-6 py-3 font-medium text-muted-foreground">Services</th>
            <th className="px-6 py-3 font-medium text-muted-foreground">Data types</th>
            <th className="px-6 py-3 font-medium text-muted-foreground">Region & basis</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id} className="border-t border-border">
              <td className="align-top px-6 py-6">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">{vendor.name}</p>
                    <Badge variant="secondary" className="w-fit">
                      {vendor.category}
                    </Badge>
                  </div>
                  {vendor.description ? (
                    <p className="text-sm text-muted-foreground">{vendor.description}</p>
                  ) : null}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Review cadence:</span> {vendor.review_frequency || "Annual"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Last reviewed:</span> {formatDate(vendor.last_reviewed)}
                    </p>
                  </div>
                  {vendor.dpa_url ? (
                    <Link
                      href={vendor.dpa_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary underline"
                    >
                      View data processing terms
                    </Link>
                  ) : null}
                </div>
              </td>
              <td className="align-top px-6 py-6">{renderList(vendor.services)}</td>
              <td className="align-top px-6 py-6">{renderList(vendor.data_types)}</td>
              <td className="align-top px-6 py-6">
                <div className="space-y-3 text-sm">
                  <p className="text-foreground">{vendor.data_location || "—"}</p>
                  {vendor.lawful_basis ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Lawful basis:</span> {vendor.lawful_basis}
                    </p>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function SubprocessorsPage() {
  const [vendors, changeLog] = await Promise.all([
    fetchSubprocessors(),
    fetchSubprocessorChangeLog(),
  ])

  return (
    <div className="container mx-auto max-w-6xl space-y-12 px-4 py-12">
      <section className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight">Subprocessor disclosures</h1>
        <p className="text-lg text-muted-foreground">
          Roomsily maintains a concise roster of subprocessors to deliver the Share House Portal. This page mirrors the
          canonical documentation in <span className="font-medium text-foreground">docs/compliance/subprocessors.md</span> and
          offers live change tracking plus email notifications.
        </p>
      </section>

      <section className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Current vendors</h2>
          <p className="text-sm text-muted-foreground">
            The list below reflects the subprocessors currently engaged on behalf of Roomsily tenants and property managers.
            Each provider is subject to contractual safeguards and annual reviews.
          </p>
          <SubprocessorTable vendors={vendors} />
        </div>
        <Card className="self-start">
          <CardHeader>
            <CardTitle>Stay informed</CardTitle>
            <CardDescription>
              Get an email whenever we onboard a new vendor, modify processing scope, or retire an integration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubprocessorSubscriptionForm />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Change log</h2>
            <p className="text-sm text-muted-foreground">
              Material updates are timestamped and archived for transparency. Subscribers receive an email shortly after
              publication.
            </p>
          </div>
        </div>
        <ChangeLog entries={changeLog} />
      </section>
    </div>
  )
}
