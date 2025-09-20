import { DiagramCard } from "./diagram-card"
import type { SharedSpaceDiagramGroup } from "@/lib/shared-space-maps"

export function DiagramGrid({ groups }: { groups: SharedSpaceDiagramGroup[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-12 text-center">
        <h2 className="text-lg font-semibold">No shared space diagrams yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your property manager hasn&apos;t published any shared area diagrams for your lease. Check
          back soon or reach out to your community team for an update.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.leaseId} className="space-y-4">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold">Lease {group.leaseId}</h2>
            <p className="text-sm text-muted-foreground">
              {group.diagrams.length === 1
                ? `1 shared space diagram`
                : `${group.diagrams.length} shared space diagrams`}
            </p>
          </header>
          <div className="grid gap-6 md:grid-cols-2">
            {group.diagrams.map((diagram) => (
              <DiagramCard key={diagram.id} diagram={diagram} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
