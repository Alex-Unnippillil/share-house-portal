import { DocumentListFilters, DocumentStatus, DocumentType } from '@/types/documents';

export interface EmptyStateSuggestionLink {
  href: string;
  label: string;
}

export interface EmptyStateSuggestion {
  title: string;
  description: string;
  chips?: string[];
  link?: EmptyStateSuggestionLink;
}

export const DOCS_URL = 'https://documenso.com/docs/templates';
export const SAMPLE_DATA_URL = 'https://github.com/documenso/documenso/tree/main/examples';

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  pending_signature: 'Pending Signature',
  signed: 'Signed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const TYPE_LABELS: Record<DocumentType, string> = {
  lease: 'Lease',
  addendum: 'Addendum',
  insurance: 'Insurance',
  maintenance: 'Maintenance',
  other: 'Other',
};

function formatDateLabel(value: string) {
  if (!value) return value;
  const [datePart] = value.split('T');
  return datePart ?? value;
}

export function getActiveFilterChipLabels(filter: DocumentListFilters): string[] {
  const chips: string[] = [];

  if (filter.status?.length) {
    for (const status of filter.status) {
      chips.push(`Status: ${STATUS_LABELS[status] ?? status}`);
    }
  }

  if (filter.type?.length) {
    for (const type of filter.type) {
      chips.push(`Type: ${TYPE_LABELS[type] ?? type}`);
    }
  }

  if (filter.tenant_id) {
    chips.push('Tenant filter active');
  }

  if (filter.unit_id) {
    chips.push(`Unit: ${filter.unit_id}`);
  }

  if (filter.date_from || filter.date_to) {
    const from = filter.date_from ? formatDateLabel(filter.date_from) : 'Any';
    const to = filter.date_to ? formatDateLabel(filter.date_to) : 'Any';
    chips.push(`Date range: ${from} → ${to}`);
  }

  return chips;
}

export function hasActiveFilters(filter: DocumentListFilters) {
  return getActiveFilterChipLabels(filter).length > 0;
}

export function buildEmptyStateSuggestions(filter: DocumentListFilters): EmptyStateSuggestion[] {
  const chips = getActiveFilterChipLabels(filter);
  const suggestions: EmptyStateSuggestion[] = [];

  if (chips.length > 0) {
    suggestions.push({
      title: 'Relax active filters',
      description: 'Clear or adjust the filters above to broaden your results.',
      chips,
    });
    suggestions.push({
      title: 'Still need the document?',
      description: 'Use Create from template to spin up a fresh copy without modifying your saved filters.',
    });
  } else {
    suggestions.push({
      title: 'Jump-start your workspace',
      description: 'Use Create from template to generate your first lease or addendum in seconds.',
    });
  }

  suggestions.push({
    title: 'Review Documenso template workflows',
    description: 'Learn how Roomsily automates lease distribution and renewals.',
    link: {
      href: DOCS_URL,
      label: 'Documenso templates documentation',
    },
  });

  suggestions.push({
    title: 'Import sample roommate paperwork',
    description: 'Download a pack of example leases, addenda, and insurance forms to experiment with.',
    link: {
      href: SAMPLE_DATA_URL,
      label: 'Download sample data',
    },
  });

  return suggestions;
}
