import { writeAuditRecord } from "@/lib/audit"
import { requirePrivilegedAccess } from "@/lib/authz"
import { getGlobalSearchResults } from "@/lib/operations/data"

export default async function OperationsGlobalSearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const { user, role } = await requirePrivilegedAccess()
  const query = searchParams.q?.trim() ?? ""

  if (query) {
    await writeAuditRecord({
      action: "operations.search.query",
      actorId: user.id,
      actorRole: role,
      targetType: "global_search",
      metadata: { query },
    })
  }

  const results = await getGlobalSearchResults(query)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Global search</h1>
        <p className="text-sm text-muted-foreground">
          Search tenants, units, requests, payments, and documents from one
          place.
        </p>
      </div>

      <form
        className="flex gap-2"
        action="/dashboard/operations/search"
        method="get"
      >
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search tenants, units, requests, payments, documents"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border px-3 py-2 text-sm">
          Search
        </button>
      </form>

      {query ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-md border p-4">
            <h2 className="font-medium">Tenants ({results.tenants.length})</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {results.tenants.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-md border p-4">
            <h2 className="font-medium">Units ({results.units.length})</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {results.units.map((item) => (
                <li key={item.id}>{item.unit}</li>
              ))}
            </ul>
          </section>
          <section className="rounded-md border p-4">
            <h2 className="font-medium">
              Requests ({results.requests.length})
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {results.requests.map((item) => (
                <li key={item.id}>
                  {item.title} · {item.status}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-md border p-4">
            <h2 className="font-medium">
              Payments ({results.payments.length})
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {results.payments.map((item) => (
                <li key={item.id}>
                  {item.id} · {item.tenant} · ${item.amount}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-md border p-4 lg:col-span-2">
            <h2 className="font-medium">
              Documents ({results.documents.length})
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {results.documents.map((item) => (
                <li key={item.id}>
                  {item.title} · {item.status}
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Enter a search query to view results.
        </p>
      )}
    </div>
  )
}
