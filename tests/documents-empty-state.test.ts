import { describe, expect, it } from 'vitest';

import {
  DOCS_URL,
  SAMPLE_DATA_URL,
  buildEmptyStateSuggestions,
  getActiveFilterChipLabels,
  hasActiveFilters,
} from '@/app/documents/components/empty-state-suggestions';
import type { DocumentListFilters } from '@/types/documents';

describe('document empty state suggestions', () => {
  it('includes filter relaxation guidance and chips when filters are active', () => {
    const filters: DocumentListFilters = {
      status: ['pending_signature', 'signed'],
      type: ['lease'],
      tenant_id: '123e4567-e89b-12d3-a456-426614174000',
      date_from: '2024-01-01T00:00:00Z',
      date_to: '2024-01-31T00:00:00Z',
    };

    const chips = getActiveFilterChipLabels(filters);
    expect(chips).toContain('Status: Pending Signature');
    expect(chips).toContain('Status: Signed');
    expect(chips).toContain('Type: Lease');
    expect(chips).toContain('Date range: 2024-01-01 → 2024-01-31');
    expect(hasActiveFilters(filters)).toBe(true);

    const suggestions = buildEmptyStateSuggestions(filters);
    const relaxationSuggestion = suggestions.find((item) => item.title === 'Relax active filters');
    expect(relaxationSuggestion).toBeDefined();
    expect(relaxationSuggestion?.chips).toEqual(chips);
  });

  it('provides documentation and sample data links when no filters are applied', () => {
    const filters: DocumentListFilters = {};

    expect(hasActiveFilters(filters)).toBe(false);
    expect(getActiveFilterChipLabels(filters)).toHaveLength(0);

    const suggestions = buildEmptyStateSuggestions(filters);
    const linkHrefs = suggestions
      .map((item) => item.link?.href)
      .filter((href): href is string => Boolean(href));

    expect(linkHrefs).toContain(DOCS_URL);
    expect(linkHrefs).toContain(SAMPLE_DATA_URL);
    expect(suggestions.every((item) => (item.chips?.length ?? 0) === 0)).toBe(true);
  });
});
