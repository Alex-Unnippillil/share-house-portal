'use client';

import React from 'react';
import { DocumentsEmptyState } from './documents-empty-state';
import { Button } from "@/components/ui/button";

const meta = {
  title: 'Documents/DocumentsEmptyState',
  component: DocumentsEmptyState,
};

export default meta;

export const DefaultEmptyState = () => (
  <div className="max-w-4xl">
    <DocumentsEmptyState
      filter={{}}
      primaryAction={<Button size="lg">Upload document</Button>}
      secondaryActions={[
        <Button key="templates" variant="outline" size="lg">
          Browse templates
        </Button>,
      ]}
      onSelectTemplate={() => {}}
    />
  </div>
);

export const FilteredEmptyState = () => (
  <div className="max-w-4xl">
    <DocumentsEmptyState
      filter={{
        status: ['pending_signature'],
        type: ['lease'],
        date_from: '2024-01-01',
      }}
      primaryAction={<Button size="lg">Upload document</Button>}
      secondaryActions={[
        <Button key="templates" variant="outline" size="lg">
          Browse templates
        </Button>,
      ]}
      onSelectTemplate={() => {}}
      onClearFilters={() => {}}
    />
  </div>
);
