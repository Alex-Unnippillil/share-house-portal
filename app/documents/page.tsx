import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const documentHighlights = [
  {
    title: "Lease lifecycle",
    description:
      "Distribute Documenso templates for new roommates, capture signatures, and archive executed agreements automatically.",
  },
  {
    title: "Secure storage",
    description:
      "Store IDs, insurance policies, and move-in checklists with access logging for compliance peace of mind.",
  },
  {
    title: "Version history",
    description:
      "Track revisions, amendments, and roommate acknowledgements in one place with timestamped audit trails.",
  },
  {
    title: "Role-aware access",
    description:
      "Tenant, roommate, and property manager permissions ensure the right people can upload, review, or approve files.",
  },
]

export default function DocumentsPage() {
  return (
    <div className="container max-w-5xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Documents</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Keep leases, addendums, and household paperwork centralized with secure sharing and detailed audit logs.
          </p>
        </div>
        <Separator />
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {documentHighlights.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
