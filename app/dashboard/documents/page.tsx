import { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Documents",
  description: "Organise leases, addendums, and household policies with Documenso workflows.",
}

const documentHighlights = [
  {
    title: "Lease library",
    description: "Download signed agreements, utility responsibilities, and renewal offers whenever you need them.",
  },
  {
    title: "Chore checklists",
    description: "Share household guidelines, cleaning rotations, and storage assignments with roommate acknowledgements.",
  },
  {
    title: "Upload centre",
    description: "Securely upload renter’s insurance, ID verifications, and pet documentation with access logs.",
  },
]

export default function DocumentsPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">
          Documenso keeps every signed file versioned and auditable so tenants, roommates, and property managers know where to find
          critical paperwork.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documentHighlights.map((item) => (
          <Card key={item.title} className="h-full">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Permissioning follows Supabase row-level security so roommates only see files relevant to their unit.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
