import {
  DocumentFilterCondition,
  DocumentListFilters,
  DocumentStatus,
  DocumentType,
} from '@/types/documents';

function uniqueArray<T>(values: T[] | undefined): T[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  return Array.from(new Set(values));
}

function hasAnyFilter(filters: DocumentListFilters): boolean {
  return Boolean(
    filters.status?.length ||
    filters.type?.length ||
    filters.tenant_id ||
    filters.unit_id ||
    filters.date_from ||
    filters.date_to
  );
}

export function normalizeDocumentFilters(
  filters?: DocumentListFilters | null,
): DocumentListFilters {
  if (!filters) {
    return {};
  }

  const normalized: DocumentListFilters = {};

  if (filters.status?.length) {
    normalized.status = uniqueArray<DocumentStatus>(filters.status);
  }

  if (filters.type?.length) {
    normalized.type = uniqueArray<DocumentType>(filters.type);
  }

  if (filters.tenant_id) {
    normalized.tenant_id = filters.tenant_id;
  }

  if (filters.unit_id) {
    normalized.unit_id = filters.unit_id;
  }

  if (filters.date_from) {
    normalized.date_from = filters.date_from;
  }

  if (filters.date_to) {
    normalized.date_to = filters.date_to;
  }

  if (filters.conditions?.length) {
    for (const condition of filters.conditions) {
      switch (condition.field) {
        case 'status': {
          const value = Array.isArray(condition.value)
            ? condition.value
            : [condition.value];
          if (condition.operator === 'in' || condition.operator === 'eq') {
            normalized.status = uniqueArray(
              [...(normalized.status ?? []), ...value] as DocumentStatus[],
            );
          }
          break;
        }
        case 'type': {
          const value = Array.isArray(condition.value)
            ? condition.value
            : [condition.value];
          if (condition.operator === 'in' || condition.operator === 'eq') {
            normalized.type = uniqueArray(
              [...(normalized.type ?? []), ...value] as DocumentType[],
            );
          }
          break;
        }
        case 'tenant_id': {
          if (typeof condition.value === 'string') {
            normalized.tenant_id = condition.value;
          }
          break;
        }
        case 'unit_id': {
          if (typeof condition.value === 'string') {
            normalized.unit_id = condition.value;
          }
          break;
        }
        case 'created_at': {
          if (typeof condition.value === 'string') {
            if (condition.operator === 'gte') {
              normalized.date_from = condition.value;
            }

            if (condition.operator === 'lte') {
              normalized.date_to = condition.value;
            }
          }
          break;
        }
        default: {
          break;
        }
      }
    }
  }

  return normalized;
}

export function filtersToConditions(
  filters: DocumentListFilters,
): DocumentFilterCondition[] {
  const normalized = normalizeDocumentFilters(filters);
  const conditions: DocumentFilterCondition[] = [];

  if (normalized.status?.length) {
    conditions.push({
      field: 'status',
      operator: 'in',
      value: normalized.status,
    });
  }

  if (normalized.type?.length) {
    conditions.push({
      field: 'type',
      operator: 'in',
      value: normalized.type,
    });
  }

  if (normalized.tenant_id) {
    conditions.push({
      field: 'tenant_id',
      operator: 'eq',
      value: normalized.tenant_id,
    });
  }

  if (normalized.unit_id) {
    conditions.push({
      field: 'unit_id',
      operator: 'eq',
      value: normalized.unit_id,
    });
  }

  if (normalized.date_from) {
    conditions.push({
      field: 'created_at',
      operator: 'gte',
      value: normalized.date_from,
    });
  }

  if (normalized.date_to) {
    conditions.push({
      field: 'created_at',
      operator: 'lte',
      value: normalized.date_to,
    });
  }

  return conditions;
}

export function cleanDocumentFilters(
  filters?: DocumentListFilters | null,
): DocumentListFilters {
  const normalized = normalizeDocumentFilters(filters);
  if (!hasAnyFilter(normalized)) {
    return {};
  }

  const conditions = filtersToConditions(normalized);
  return conditions.length > 0
    ? { ...normalized, conditions }
    : { ...normalized };
}

export function serializeDocumentFilters(
  filters: DocumentListFilters,
): string | null {
  const cleaned = cleanDocumentFilters(filters);
  if (!hasAnyFilter(cleaned)) {
    return null;
  }

  return encodeURIComponent(JSON.stringify(cleaned));
}

export function parseDocumentFilters(
  value: string | string[] | null | undefined,
): DocumentListFilters {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return {};
  }

  const firstValue = Array.isArray(value) ? value[0] : value;

  try {
    const parsed = JSON.parse(decodeURIComponent(firstValue));
    return cleanDocumentFilters(parsed);
  } catch (error) {
    console.warn('Failed to parse document filters from query string', error);
    return {};
  }
}

export function countActiveDocumentFilters(filters: DocumentListFilters): number {
  const normalized = normalizeDocumentFilters(filters);
  return [
    normalized.status?.length ?? 0,
    normalized.type?.length ?? 0,
    normalized.tenant_id ? 1 : 0,
    normalized.unit_id ? 1 : 0,
    normalized.date_from ? 1 : 0,
    normalized.date_to ? 1 : 0,
  ].reduce((total, count) => total + count, 0);
}

export function mergeDocumentFilters(
  base: DocumentListFilters,
  override: DocumentListFilters,
): DocumentListFilters {
  const normalizedBase = normalizeDocumentFilters(base);
  const normalizedOverride = normalizeDocumentFilters(override);

  const combined: DocumentListFilters = {
    status: normalizedOverride.status ?? normalizedBase.status,
    type: normalizedOverride.type ?? normalizedBase.type,
    tenant_id: normalizedOverride.tenant_id ?? normalizedBase.tenant_id,
    unit_id: normalizedOverride.unit_id ?? normalizedBase.unit_id,
    date_from: normalizedOverride.date_from ?? normalizedBase.date_from,
    date_to: normalizedOverride.date_to ?? normalizedBase.date_to,
  };

  const conditions = filtersToConditions(combined);
  return conditions.length > 0 ? { ...combined, conditions } : combined;
}

export function describeDocumentFilters(
  filters: DocumentListFilters,
): string[] {
  const normalized = normalizeDocumentFilters(filters);
  const descriptions: string[] = [];

  if (normalized.status?.length) {
    descriptions.push(`Status is ${normalized.status.join(', ')}`);
  }

  if (normalized.type?.length) {
    descriptions.push(`Type is ${normalized.type.join(', ')}`);
  }

  if (normalized.tenant_id) {
    descriptions.push(`Tenant matches ${normalized.tenant_id}`);
  }

  if (normalized.unit_id) {
    descriptions.push(`Unit matches ${normalized.unit_id}`);
  }

  if (normalized.date_from) {
    descriptions.push(`Created after ${normalized.date_from}`);
  }

  if (normalized.date_to) {
    descriptions.push(`Created before ${normalized.date_to}`);
  }

  return descriptions;
}
