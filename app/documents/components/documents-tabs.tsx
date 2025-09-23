'use client';

import { Suspense, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DocumentListFilters } from '@/types/documents';

import { DocumentsList } from './documents-list';
import { DocumentsFilters } from './documents-filters';
import { ExportDocumentsButton } from './export-documents-button';

const TAB_FILTERS = {
  all: {},
  leases: { type: ['lease'] as DocumentListFilters['type'] },
  pending: { status: ['pending_signature'] as DocumentListFilters['status'] },
  signed: { status: ['signed'] as DocumentListFilters['status'] },
} satisfies Record<string, DocumentListFilters>;

type TabValue = keyof typeof TAB_FILTERS;

function mergeFilters(
  base: DocumentListFilters,
  overrides: DocumentListFilters
): DocumentListFilters {
  return {
    ...overrides,
    ...base,
  };
}

function DocumentsListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-48 rounded bg-muted" />
                <div className="h-4 w-32 rounded bg-muted" />
              </div>
              <div className="h-6 w-20 rounded bg-muted" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-muted" />
              <div className="flex space-x-2">
                <div className="h-8 w-16 rounded bg-muted" />
                <div className="h-8 w-16 rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DocumentsTabsSection() {
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [filterOverrides, setFilterOverrides] = useState<DocumentListFilters>({});

  const currentFilters = useMemo(
    () => mergeFilters(TAB_FILTERS[activeTab], filterOverrides),
    [activeTab, filterOverrides]
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as TabValue)}
      className="space-y-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="signed">Signed</TabsTrigger>
        </TabsList>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <DocumentsFilters onFiltersChange={setFilterOverrides} />
          <ExportDocumentsButton filters={currentFilters} />
        </div>
      </div>

      {(Object.keys(TAB_FILTERS) as TabValue[]).map((tab) => {
        const filtersForTab = mergeFilters(TAB_FILTERS[tab], filterOverrides);

        return (
          <TabsContent key={tab} value={tab} className="space-y-6">
            <Suspense fallback={<DocumentsListSkeleton />}>
              <DocumentsList filter={filtersForTab} />
            </Suspense>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
