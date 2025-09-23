import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Users, Clock, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadDocumentDialog } from "./components/upload-document-dialog";
import { DocumentsStats } from "./components/documents-stats";
import { DocumentsList } from "./components/documents-list";
import { DocumentsFilters } from "./components/documents-filters";
import { DocumentListFilters, DocumentSavedView } from '@/types/documents';
import { parseDocumentFilters, cleanDocumentFilters, mergeDocumentFilters } from '@/lib/documents-filters';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supa-server-actions';
import type { TypedSupabaseClient } from '@/utils/typed-supabase-client';
import { fetchDocumentSavedViews } from '@/lib/data/documents';

type DocumentsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

async function loadSavedViews(): Promise<DocumentSavedView[]> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const typedSupabase = supabase as unknown as TypedSupabaseClient;

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return [];
  }

  try {
    const views = await fetchDocumentSavedViews({
      client: typedSupabase,
      userId: user.id,
    });

    return views;
  } catch (err) {
    console.error('Failed to load document saved views:', err);
    return [];
  }
}

export default async function DocumentsPage({ searchParams = {} }: DocumentsPageProps) {
  const filtersFromParams = cleanDocumentFilters(parseDocumentFilters(searchParams.filters));
  const activeViewId = typeof searchParams.view === 'string' ? searchParams.view : null;
  const savedViews = await loadSavedViews();

  let initialFilters: DocumentListFilters = filtersFromParams;

  if ((!initialFilters || Object.keys(initialFilters).length === 0) && activeViewId) {
    const matchingView = savedViews.find((view) => view.id === activeViewId);
    if (matchingView) {
      initialFilters = cleanDocumentFilters(matchingView.filters);
    }
  }

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
      <Suspense fallback={<div className="grid gap-4 md:grid-cols-4">
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
      </div>}>
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
          <DocumentsFilters
            initialFilters={initialFilters}
            savedViews={savedViews}
            activeViewId={activeViewId}
          />
        </div>

        <TabsContent value="all" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton />}>
            <DocumentsList filter={initialFilters} />
          </Suspense>
        </TabsContent>

        <TabsContent value="leases" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton />}>
            <DocumentsList filter={mergeDocumentFilters({ type: ['lease'] }, initialFilters)} />
          </Suspense>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton />}>
            <DocumentsList filter={mergeDocumentFilters({ status: ['pending_signature'] }, initialFilters)} />
          </Suspense>
        </TabsContent>

        <TabsContent value="signed" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton />}>
            <DocumentsList filter={mergeDocumentFilters({ status: ['signed'] }, initialFilters)} />
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

function DocumentsListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-48 rounded bg-muted"></div>
                <div className="h-4 w-32 rounded bg-muted"></div>
              </div>
              <div className="h-6 w-20 rounded bg-muted"></div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted"></div>
              <div className="flex space-x-2">
                <div className="h-8 w-16 rounded bg-muted"></div>
                <div className="h-8 w-16 rounded bg-muted"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
