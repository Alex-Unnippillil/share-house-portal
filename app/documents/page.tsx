import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Users, Clock, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardSkeleton, ListSkeleton } from "@/components/ui/skeletons";
import { UploadDocumentDialog } from "./components/upload-document-dialog";
import { DocumentsStats } from "./components/documents-stats";
import { DocumentsList } from "./components/documents-list";
import { DocumentsFilters } from "./components/documents-filters";
import { DocumentListFilters } from '@/types/documents';

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
      <Suspense
        fallback={
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <CardSkeleton key={index} variant="metric" />
            ))}
          </div>
        }
      >
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
          <Suspense fallback={<ListSkeleton count={5} />}>
            <DocumentsList filter={{}} />
          </Suspense>
        </TabsContent>

        <TabsContent value="leases" className="space-y-6">
          <Suspense fallback={<ListSkeleton count={5} />}>
            <DocumentsList filter={{ type: ['lease'] }} />
          </Suspense>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Suspense fallback={<ListSkeleton count={5} />}>
            <DocumentsList filter={{ status: ['pending_signature'] }} />
          </Suspense>
        </TabsContent>

        <TabsContent value="signed" className="space-y-6">
          <Suspense fallback={<ListSkeleton count={5} />}>
            <DocumentsList filter={{ status: ['signed'] }} />
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

