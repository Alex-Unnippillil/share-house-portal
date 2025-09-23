"use client"

import { Suspense, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, Users, Clock, Upload } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UploadDocumentDialog } from "./components/upload-document-dialog"
import { DocumentsStats } from "./components/documents-stats"
import { DocumentsList } from "./components/documents-list"
import { DocumentsFilters } from "./components/documents-filters"
import type { DocumentListFilters } from "@/types/documents"
import type { SearchResult } from "@/lib/search/client"
import { SearchBar } from "@/components/search/search-bar"

type TabKey = "all" | "leases" | "pending" | "signed"

const TAB_FILTERS: Record<TabKey, DocumentListFilters> = {
  all: {},
  leases: { type: ["lease"] },
  pending: { status: ["pending_signature"] },
  signed: { status: ["signed"] },
}

const mergeFilters = (
  base: DocumentListFilters,
  user: DocumentListFilters
): DocumentListFilters => {
  const intersect = (baseValues?: string[], userValues?: string[]) => {
    if (baseValues && baseValues.length) {
      if (userValues && userValues.length) {
        return baseValues.filter((value) => userValues.includes(value))
      }
      return baseValues
    }
    return userValues
  }

  const next: DocumentListFilters = {
    status: intersect(base.status, user.status) ?? undefined,
    type: intersect(base.type, user.type) ?? undefined,
    tenant_id: user.tenant_id ?? base.tenant_id,
    unit_id: user.unit_id ?? base.unit_id,
    date_from: user.date_from ?? base.date_from,
    date_to: user.date_to ?? base.date_to,
  }

  if (!next.status?.length) {
    delete next.status
  }
  if (!next.type?.length) {
    delete next.type
  }
  if (!next.tenant_id) {
    delete next.tenant_id
  }
  if (!next.unit_id) {
    delete next.unit_id
  }
  if (!next.date_from) {
    delete next.date_from
  }
  if (!next.date_to) {
    delete next.date_to
  }

  return next
}

const toSearchFilters = (filters: DocumentListFilters): Record<string, string[]> => {
  const record: Record<string, string[]> = {}
  if (filters.status?.length) {
    record.status = filters.status
  }
  if (filters.type?.length) {
    record.type = filters.type
  }
  if (filters.tenant_id) {
    record.tenant_id = [filters.tenant_id]
  }
  if (filters.unit_id) {
    record.unit_id = [filters.unit_id]
  }
  if (filters.date_from) {
    record.date_from = [filters.date_from]
  }
  if (filters.date_to) {
    record.date_to = [filters.date_to]
  }
  return record
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const [filters, setFilters] = useState<DocumentListFilters>({})
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [searchIds, setSearchIds] = useState<string[] | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const activeBaseFilters = TAB_FILTERS[activeTab]
  const combinedFilters = useMemo(
    () => mergeFilters(activeBaseFilters, filters),
    [activeBaseFilters, filters]
  )
  const searchFilters = useMemo(() => toSearchFilters(combinedFilters), [combinedFilters])

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabKey)
  }

  const handleSearchResults = (result: SearchResult) => {
    setSearchResult(result)
    setSearchQuery(result.query)

    const appliedFilterCount = Object.values(result.appliedFilters ?? {}).reduce(
      (count, values) => count + (values?.length ?? 0),
      0
    )

    if (result.query.trim().length === 0 && result.hits.length === 0 && appliedFilterCount === 0) {
      setSearchIds(null)
      return
    }

    const ids = result.hits
      .filter((hit) => hit.scope === "documents")
      .map((hit) => hit.id)
    setSearchIds(ids)
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="space-y-4">
          <SearchBar
            scope="documents"
            placeholder="Search agreements, leases, and signatures"
            activeFilters={searchFilters}
            onResults={handleSearchResults}
            onQueryChange={setSearchQuery}
          />
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="leases">Leases</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="signed">Signed</TabsTrigger>
            </TabsList>
            <DocumentsFilters
              value={filters}
              facets={searchResult?.facets ?? null}
              onValueChange={setFilters}
            />
          </div>
        </div>

        <TabsContent value="all" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton />}>
            <DocumentsList
              filter={mergeFilters(TAB_FILTERS.all, filters)}
              searchIds={activeTab === "all" ? searchIds : undefined}
              searchQuery={activeTab === "all" ? searchQuery : undefined}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="leases" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton />}>
            <DocumentsList
              filter={mergeFilters(TAB_FILTERS.leases, filters)}
              searchIds={activeTab === "leases" ? searchIds : undefined}
              searchQuery={activeTab === "leases" ? searchQuery : undefined}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton />}>
            <DocumentsList
              filter={mergeFilters(TAB_FILTERS.pending, filters)}
              searchIds={activeTab === "pending" ? searchIds : undefined}
              searchQuery={activeTab === "pending" ? searchQuery : undefined}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="signed" className="space-y-6">
          <Suspense fallback={<DocumentsListSkeleton />}>
            <DocumentsList
              filter={mergeFilters(TAB_FILTERS.signed, filters)}
              searchIds={activeTab === "signed" ? searchIds : undefined}
              searchQuery={activeTab === "signed" ? searchQuery : undefined}
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
