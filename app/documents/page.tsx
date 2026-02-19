import { Suspense } from "react"
import Link from "next/link"
import { Clock, FileText, Upload, Users } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageTitle,
} from "@/components/ui/page-layout"

import { DocumentsStats } from "./components/documents-stats"
import { DocumentsWorkspace } from "./components/documents-workspace"
import { TenantHistoryTimelines } from "./components/tenant-history-timelines"
import { UploadDocumentDialog } from "./components/upload-document-dialog"

export default function DocumentsPage() {
  return (
    <PageContainer variant="dashboard">
      <PageHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-stack-sm">
            <PageTitle>Documents</PageTitle>
            <PageDescription>
              Manage leases, notices, and account files with secure access, version history, and audit tracking.
            </PageDescription>
          </div>
          <UploadDocumentDialog />
        </div>
      </PageHeader>

      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 w-3/4 rounded bg-muted"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-1/2 rounded bg-muted"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <DocumentsStats />
      </Suspense>

      <DocumentsWorkspace />

      <Card>
        <CardHeader>
          <CardTitle>Policy and signing disclosures</CardTitle>
          <CardDescription>
            Document access, signatures, and manager review actions are logged
            for compliance and dispute handling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>{" "}
            explains responsibilities for document upload, signing, and version
            integrity.
          </p>
          <p>
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>{" "}
            explains how lease metadata and access events are processed.
          </p>
          <p>
            <Link href="/data-retention" className="underline">
              Data Retention Policy
            </Link>{" "}
            lists retention windows for document and audit records.
          </p>
        </CardContent>
      </Card>

      <Suspense
        fallback={
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="h-64 animate-pulse" />
            <Card className="h-64 animate-pulse" />
          </div>
        }
      >
        <TenantHistoryTimelines />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <FileText className="size-5 text-primary" />
              <CardTitle className="text-sm font-medium">
                Secure Storage
              </CardTitle>
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
              <CardTitle className="text-sm font-medium">
                Multi-Signature
              </CardTitle>
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
              <CardTitle className="text-sm font-medium">
                Version History
              </CardTitle>
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
              <CardTitle className="text-sm font-medium">
                Controlled Sharing
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Signed access URLs ensure files are only retrieved through
              verified sessions.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
