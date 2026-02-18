import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, Clock, Upload } from "lucide-react"
import { FlowStateCard } from "@/components/feedback/flow-state"
import { PageShell } from "@/components/layout/page-shell"
import { UploadDocumentDialog } from "./components/upload-document-dialog"
import { DocumentsStats } from "./components/documents-stats"
import { DocumentsWorkspace } from "./components/documents-workspace"
import { TenantHistoryTimelines } from "./components/tenant-history-timelines"

export default function DocumentsPage() {
  return (
    <PageShell
      title="Documents"
      description="Manage leases, notices, and account files with secure access, version history, and audit tracking."
      maxWidthClassName="max-w-7xl"
      action={<UploadDocumentDialog />}
    >

      <Suspense
        fallback={
          <FlowStateCard
            variant="loading"
            title="Loading document metrics"
            description="We are syncing lease health, signature completion, and audit activity."
          />
        }
      >
        <DocumentsStats />
      </Suspense>

      <DocumentsWorkspace />

      <Suspense
        fallback={
          <FlowStateCard
            variant="loading"
            title="Building tenant timeline"
            description="Gathering signature history and payment-linked milestones for each lease."
          />
        }
      >
        <TenantHistoryTimelines />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">Secure Storage</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Encrypted document storage with access logging for compliance.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Users className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">Multi-Signature</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Collect signatures from all tenants and property managers.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">Version History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Track document changes with complete audit trails.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Upload className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">Controlled Sharing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Signed access URLs ensure files are only retrieved through verified sessions.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
