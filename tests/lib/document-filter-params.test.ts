import { describe, expect, it } from 'vitest';
import {
  documentFiltersToSearchParams,
  parseDocumentFiltersFromSearchParams,
  normalizeDocumentFilters,
  isDocumentFilterEmpty,
  areDocumentFiltersEqual,
} from '@/lib/document-filter-params';
import type { DocumentListFilters } from '@/types/documents';

describe('document filter URL helpers', () => {
  it('round-trips filters through URL parameters for bookmarking', () => {
    const filters: DocumentListFilters = {
      status: ['signed', 'draft'],
      type: ['lease'],
      tenant_id: 'tenant-1',
      unit_id: 'unit-2',
      date_from: '2024-01-01',
      date_to: '2024-02-01',
    };

    const params = documentFiltersToSearchParams(filters);
    expect(params.getAll('status')).toEqual(['draft', 'signed']);
    expect(params.getAll('type')).toEqual(['lease']);
    expect(params.get('tenant_id')).toBe('tenant-1');
    expect(params.get('unit_id')).toBe('unit-2');

    const parsed = parseDocumentFiltersFromSearchParams(params);
    const normalized = normalizeDocumentFilters(filters);

    expect(parsed).toEqual(normalized);
    expect(areDocumentFiltersEqual(parsed, filters)).toBe(true);
  });

  it('parses values provided as strings or arrays from server search params', () => {
    const parsed = parseDocumentFiltersFromSearchParams({
      status: 'signed,draft',
      type: ['maintenance', 'lease'],
      tenant_id: 'tenant-2',
      date_from: '2024-03-01',
      date_to: '2024-03-31',
    });

    expect(parsed).toEqual({
      status: ['draft', 'signed'],
      type: ['lease', 'maintenance'],
      tenant_id: 'tenant-2',
      date_from: '2024-03-01',
      date_to: '2024-03-31',
    });
  });

  it('detects empty filter sets and avoids serializing noise', () => {
    const filters: DocumentListFilters = {
      status: [],
      type: undefined,
      tenant_id: undefined,
    };

    expect(isDocumentFilterEmpty(filters)).toBe(true);
    const params = documentFiltersToSearchParams(filters);
    expect(params.toString()).toBe('');
  });
});
