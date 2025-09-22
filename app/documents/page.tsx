import React, { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, Users, Clock, Upload } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadDocumentDialog } from "./components/upload-document-dialog"
import { DocumentsStats } from "./components/documents-stats"
import { DocumentsList } from "./components/documents-list"
import { DocumentsFilters } from "./components/documents-filters"
import { DocumentsListSkeleton, DocumentsStatsSkeleton } from './components/skeletons'

export default function DocumentsPage() {
  return (
    <div className="container max-w-7xl space-y-8 py-8">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Documents</h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Manage leases, agreements, and household documents with secure signing and version control.
            </p>
          </div>
          <UploadDocumentDialog />
        </div>
        <Separator />
      </header>

      {/* Stats Overview */}
      <Suspense fallback={<DocumentsStatsSkeleton />}>
        <DocumentsStats />
      </Suspense>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="leases">Leases</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="signed">Signed</TabsTrigger>
          </TabsList>
          <DocumentsFilters />
        </div>

        <TabsContent value="all" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton variant="all" />}>
            <DocumentsList
              filter={{}}
              emptyTitle="No documents yet"
              emptyDescription="Upload your first lease, addendum, or policy to get started."
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="leases" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton variant="leases" />}>
            <DocumentsList
              filter={{ type: ['lease'] }}
              emptyTitle="No lease documents"
              emptyDescription="Upload a new lease or request one from your property manager."
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton variant="pending" />}>
            <DocumentsList
              filter={{ status: ['pending_signature'] }}
              emptyTitle="All caught up"
              emptyDescription="No pending signatures right now. We'll notify you when something needs attention."
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="signed" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton variant="signed" />}>
            <DocumentsList
              filter={{ status: ['signed'] }}
              emptyTitle="No signed documents"
              emptyDescription="Once a document is completed it will show up here for quick reference."
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Feature Highlights */}
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
              <CardTitle className="text-sm font-medium">Bulk Operations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-xs">
              Upload multiple documents and manage permissions at scale.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
