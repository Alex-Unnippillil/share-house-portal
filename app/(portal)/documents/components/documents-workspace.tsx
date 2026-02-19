'use client';

import { useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentListFilters } from '@/types/documents';
import { DocumentsFilters } from './documents-filters';
import { DocumentsList } from './documents-list';

const BASE_TAB_FILTERS: Record<string, DocumentListFilters> = {
  all: {},
  leases: { type: ['lease'] },
  notices: { type: ['notice'] },
  account_files: { type: ['account_file'] },
};

export function DocumentsWorkspace() {
  const [tab, setTab] = useState<keyof typeof BASE_TAB_FILTERS>('all');
  const [dynamicFilters, setDynamicFilters] = useState<DocumentListFilters>({});

  const activeFilter = useMemo<DocumentListFilters>(() => {
    const tabFilter = BASE_TAB_FILTERS[tab] ?? {};
    return {
      ...tabFilter,
      ...dynamicFilters,
      type: dynamicFilters.type ?? tabFilter.type,
    };
  }, [tab, dynamicFilters]);

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as keyof typeof BASE_TAB_FILTERS)} className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TabsList className="grid w-full max-w-xl grid-cols-4">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="account_files">Account Files</TabsTrigger>
        </TabsList>
        <DocumentsFilters onFiltersChange={setDynamicFilters} />
      </div>

      {Object.keys(BASE_TAB_FILTERS).map((key) => (
        <TabsContent key={key} value={key} className="space-y-6">
          <DocumentsList filter={activeFilter} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
