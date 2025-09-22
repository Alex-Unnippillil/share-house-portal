import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Clock, FileText } from "lucide-react"

import { fetchDocumentStats } from "@/lib/data/documents"

export async function DocumentsStats() {
  const stats = await fetchDocumentStats().catch((error) => {
    console.error("Error loading document stats in component:", error)
    return null
  })

  if (!stats) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Document insights unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We couldn't load the latest document metrics. Please refresh the page to try again.
          </p>
        </CardContent>
      </Card>
    )
  }

  const statItems = [
    {
      title: "Total Documents",
      value: stats.total_documents,
      icon: FileText,
      color: "text-blue-600",
      description: "All document types",
    },
    {
      title: "Pending Signatures",
      value: stats.pending_signatures,
      icon: Clock,
      color: "text-yellow-600",
      description: "Awaiting signatures",
    },
    {
      title: "Signed Documents",
      value: stats.signed_documents,
      icon: CheckCircle,
      color: "text-green-600",
      description: "Fully executed",
    },
    {
      title: "Expired Documents",
      value: stats.expired_documents,
      icon: AlertCircle,
      color: "text-red-600",
      description: "Past expiry date",
    },
  ] as const

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {statItems.map((item) => (
        <Card key={item.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
            <item.icon className={`size-4 ${item.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
