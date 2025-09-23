import { DocumentListFilters, DocumentStatus, DocumentType } from '@/types/documents';

const STATUS_VALUES: readonly DocumentStatus[] = [
  'draft',
  'pending_signature',
  'signed',
  'expired',
  'cancelled',
];

const TYPE_VALUES: readonly DocumentType[] = [
  'lease',
  'addendum',
  'insurance',
  'maintenance',
  'other',
];

type SearchParamValue = string | string[] | undefined;
type SearchParamsInput = URLSearchParams | { [key: string]: SearchParamValue };

type SavedFilterKeys = keyof DocumentListFilters;

const FILTER_KEYS: SavedFilterKeys[] = [
  'status',
  'type',
  'tenant_id',
  'unit_id',
  'date_from',
  'date_to',
];

function toArray(value: SearchParamValue): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => entry.split(','))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getAllValues(params: SearchParamsInput, key: string): string[] {
  if (params instanceof URLSearchParams) {
    const values = params.getAll(key);
    if (values.length === 0) {
      const single = params.get(key);
      return toArray(single ?? undefined);
    }
    return toArray(values as string[]);
  }

  return toArray(params[key]);
}

function sanitizeArray<T extends string>(values: string[], allowed: readonly T[]): T[] {
  const allowedSet = new Set(allowed);
  return Array.from(
    new Set(
      values.filter((value): value is T => allowedSet.has(value as T))
    )
  );
}

function sanitizeFilters(filters: DocumentListFilters): DocumentListFilters {
  const sanitized: DocumentListFilters = {};

  if (filters.status?.length) {
    const values = sanitizeArray(filters.status, STATUS_VALUES);
    if (values.length) {
      sanitized.status = values;
    }
  }

  if (filters.type?.length) {
    const values = sanitizeArray(filters.type, TYPE_VALUES);
    if (values.length) {
      sanitized.type = values;
    }
  }

  if (filters.tenant_id) {
    sanitized.tenant_id = filters.tenant_id;
  }

  if (filters.unit_id) {
    sanitized.unit_id = filters.unit_id;
  }

  if (filters.date_from) {
    sanitized.date_from = filters.date_from;
  }

  if (filters.date_to) {
    sanitized.date_to = filters.date_to;
  }

  return sanitized;
}

export function parseDocumentFiltersFromSearchParams(
  params: SearchParamsInput
): DocumentListFilters {
  const filters: DocumentListFilters = {};

  const status = sanitizeArray(getAllValues(params, 'status'), STATUS_VALUES);
  if (status.length > 0) {
    filters.status = status;
  }

  const types = sanitizeArray(getAllValues(params, 'type'), TYPE_VALUES);
  if (types.length > 0) {
    filters.type = types;
  }

  const tenantId = getAllValues(params, 'tenant_id')[0];
  if (tenantId) {
    filters.tenant_id = tenantId;
  }

  const unitId = getAllValues(params, 'unit_id')[0];
  if (unitId) {
    filters.unit_id = unitId;
  }

  const dateFrom = getAllValues(params, 'date_from')[0];
  if (dateFrom) {
    filters.date_from = dateFrom;
  }

  const dateTo = getAllValues(params, 'date_to')[0];
  if (dateTo) {
    filters.date_to = dateTo;
  }

  return normalizeDocumentFilters(filters);
}

export function normalizeDocumentFilters(
  filters: DocumentListFilters
): DocumentListFilters {
  const sanitized = sanitizeFilters(filters);
  const normalized: DocumentListFilters = {};

  if (sanitized.status?.length) {
    normalized.status = [...sanitized.status].sort();
  }

  if (sanitized.type?.length) {
    normalized.type = [...sanitized.type].sort();
  }

  if (sanitized.tenant_id) {
    normalized.tenant_id = sanitized.tenant_id;
  }

  if (sanitized.unit_id) {
    normalized.unit_id = sanitized.unit_id;
  }

  if (sanitized.date_from) {
    normalized.date_from = sanitized.date_from;
  }

  if (sanitized.date_to) {
    normalized.date_to = sanitized.date_to;
  }

  return normalized;
}

export function documentFiltersToSearchParams(
  filters: DocumentListFilters,
  base?: URLSearchParams
): URLSearchParams {
  const params = base ? new URLSearchParams(base.toString()) : new URLSearchParams();

  for (const key of FILTER_KEYS) {
    params.delete(key);
  }

  const normalized = normalizeDocumentFilters(filters);

  normalized.status?.forEach((value) => {
    params.append('status', value);
  });

  normalized.type?.forEach((value) => {
    params.append('type', value);
  });

  if (normalized.tenant_id) {
    params.set('tenant_id', normalized.tenant_id);
  }

  if (normalized.unit_id) {
    params.set('unit_id', normalized.unit_id);
  }

  if (normalized.date_from) {
    params.set('date_from', normalized.date_from);
  }

  if (normalized.date_to) {
    params.set('date_to', normalized.date_to);
  }

  return params;
}

export function isDocumentFilterEmpty(filters: DocumentListFilters): boolean {
  const normalized = normalizeDocumentFilters(filters);
  return (
    !normalized.status?.length &&
    !normalized.type?.length &&
    !normalized.tenant_id &&
    !normalized.unit_id &&
    !normalized.date_from &&
    !normalized.date_to
  );
}

export function areDocumentFiltersEqual(
  first: DocumentListFilters,
  second: DocumentListFilters
): boolean {
  const normalizedFirst = normalizeDocumentFilters(first);
  const normalizedSecond = normalizeDocumentFilters(second);
  return JSON.stringify(normalizedFirst) === JSON.stringify(normalizedSecond);
}
