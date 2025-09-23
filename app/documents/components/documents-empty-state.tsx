'use client';

import React, { type ReactNode } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DocumentListFilters, DocumentStatus, DocumentType } from '@/types/documents';
import { Sparkles, FileSignature, Users, ShieldCheck } from 'lucide-react';

const statusLabels: Record<DocumentStatus, string> = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const typeLabels: Record<DocumentType, string> = {
  lease: 'Lease',
  addendum: 'Addendum',
  insurance: 'Insurance',
  maintenance: 'Maintenance',
  other: 'Other',
};

const sampleTemplates = [
  {
    id: 'lease-template',
    title: 'Lease template',
    description: 'Documenso-ready lease with merge fields for every roommate.',
    badge: 'Popular',
    actionLabel: 'Use template',
    icon: FileSignature,
  },
  {
    id: 'roommate-addendum',
    title: 'Roommate addendum',
    description: 'Document move-in responsibilities and house expectations.',
    badge: 'Roommates',
    actionLabel: 'Draft addendum',
    icon: Users,
  },
  {
    id: 'insurance-proof',
    title: 'Insurance proof request',
    description: 'Collect renter insurance confirmations from tenants.',
    badge: 'Compliance',
    actionLabel: 'Request proof',
    icon: ShieldCheck,
  },
] as const;

interface DocumentsEmptyStateProps {
  filter: DocumentListFilters;
  primaryAction: ReactNode;
  secondaryActions?: ReactNode[];
  onSelectTemplate?: (templateId: string) => void;
  onClearFilters?: () => void;
}

export function DocumentsEmptyState({
  filter,
  primaryAction,
  secondaryActions = [],
  onSelectTemplate,
  onClearFilters,
}: DocumentsEmptyStateProps) {
  const appliedFilterChips = getFilterChips(filter);
  const hasFilters = appliedFilterChips.length > 0;
  const contextualTips = getContextualTips(filter);

  return (
    <Card className="p-10">
      <CardHeader className="items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
        <CardTitle className="text-2xl">Build your document hub</CardTitle>
        <CardDescription className="text-base">
          Upload a file or start from a template to keep every lease and household agreement in one place.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex flex-wrap justify-center gap-3">
          <div className="flex-shrink-0">{primaryAction}</div>
          {secondaryActions.map((action, index) => (
            <div key={index} className="flex-shrink-0">
              {action}
            </div>
          ))}
        </div>

        {hasFilters ? (
          <div className="space-y-4 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Filters applied
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {appliedFilterChips.map((chip) => (
                    <Badge key={chip} variant="outline" className="border-dashed">
                      {chip}
                    </Badge>
                  ))}
                </div>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {contextualTips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              </div>
              {onClearFilters && (
                <Button variant="secondary" size="sm" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Quick create
              </span>
              <div className="flex flex-wrap gap-2">
                {sampleTemplates.slice(0, 2).map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectTemplate?.(template.id)}
                  >
                    {template.title}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            No documents yet—use the quick actions and templates below to send your first agreement.
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {sampleTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Card key={template.id} className="h-full border-dashed transition hover:border-primary/60">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <CardTitle className="text-base font-semibold">
                        {template.title}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary">{template.badge}</Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onSelectTemplate?.(template.id)}
                  >
                    {template.actionLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getFilterChips(filter: DocumentListFilters) {
  const chips: string[] = [];

  filter.status?.forEach((status) => {
    chips.push(`Status: ${statusLabels[status] ?? status}`);
  });

  filter.type?.forEach((type) => {
    chips.push(`Type: ${typeLabels[type] ?? type}`);
  });

  if (filter.tenant_id) {
    chips.push(`Tenant ID: ${filter.tenant_id}`);
  }

  if (filter.unit_id) {
    chips.push(`Unit ID: ${filter.unit_id}`);
  }

  if (filter.date_from || filter.date_to) {
    const from = filter.date_from ? new Date(filter.date_from).toLocaleDateString() : 'Any';
    const to = filter.date_to ? new Date(filter.date_to).toLocaleDateString() : 'Now';
    chips.push(`Created: ${from} – ${to}`);
  }

  return chips;
}

function getContextualTips(filter: DocumentListFilters) {
  const tips: string[] = [];

  if (filter.status?.includes('pending_signature')) {
    tips.push('Kick off a signature flow by uploading a Documenso-ready file or using the lease template.');
  }

  if (filter.status?.includes('signed')) {
    tips.push('Renewals can start from last year’s template—spin up an updated copy below.');
  }

  if (filter.type?.includes('lease')) {
    tips.push('Need a fresh agreement? Launch the pre-built lease template to fill in tenant details.');
  }

  if (filter.type?.includes('insurance')) {
    tips.push('Request updated insurance proof and keep compliance records organized.');
  }

  if (filter.tenant_id || filter.unit_id) {
    tips.push('Create a document tailored to this tenant or unit with the quick actions.');
  }

  if (filter.date_from || filter.date_to) {
    tips.push('Adjust the date range or clear filters to review earlier paperwork.');
  }

  if (tips.length === 0) {
    tips.push('Your current filters are very specific. Clear filters or create a new document below.');
  }

  return tips;
}
