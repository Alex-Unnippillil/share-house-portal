import { z } from 'zod';

import type { Database } from '@/lib/supabase';

export type DocumentType = Database['public']['Tables']['documents']['Row']['document_type'];
export type DocumentStatus = Database['public']['Tables']['documents']['Row']['status'];
export type DocumentRow = Database['public']['Tables']['documents']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export const DOCUMENT_IMPORT_FIELDS = [
  'title',
  'document_type',
  'status',
  'description',
  'tenant_email',
  'unit_id',
  'requires_signature',
  'expires_at',
  'document_id',
  'file_url',
] as const;

export type DocumentImportField = (typeof DOCUMENT_IMPORT_FIELDS)[number];

export type DocumentImportMapping = Partial<Record<DocumentImportField, string | null | undefined>>;

const REQUIRED_FIELDS: DocumentImportField[] = ['title', 'document_type', 'status'];

const DOCUMENT_TYPES: readonly DocumentType[] = ['lease', 'addendum', 'insurance', 'maintenance', 'other'];
const DOCUMENT_STATUSES: readonly DocumentStatus[] = [
  'draft',
  'pending_signature',
  'signed',
  'expired',
  'cancelled',
];

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

export interface DocumentImportRowPayload {
  title: string;
  description: string | null;
  document_type: DocumentType;
  status: DocumentStatus;
  tenant_email?: string;
  tenant_id: string | null;
  unit_id: string | null;
  requires_signature: boolean;
  expires_at: string | null;
  document_id?: string;
  file_url: string | null;
}

export interface DocumentImportPlanRow {
  index: number;
  raw: Record<string, string>;
  action: 'create' | 'update';
  errors: string[];
  payload?: DocumentImportRowPayload;
  existingDocument?: DocumentRow;
}

export interface DocumentImportPlanSummary {
  total: number;
  valid: number;
  invalid: number;
  creates: number;
  updates: number;
}

export interface DocumentImportPlan {
  rows: DocumentImportPlanRow[];
  summary: DocumentImportPlanSummary;
}

export interface DocumentImportPlanInput {
  headers: string[];
  rows: Record<string, string>[];
  mapping: DocumentImportMapping;
  documents?: DocumentRow[];
  profiles?: Pick<ProfileRow, 'id' | 'email'>[];
}

export interface DocumentImportRepository {
  insert: (payload: Record<string, unknown>) => Promise<DocumentRow>;
  update: (id: string, payload: Record<string, unknown>) => Promise<DocumentRow>;
  recordVersion: (document: DocumentRow, actorId: string, versionOverride?: number) => Promise<void>;
}

export interface DocumentImportExecutionResult {
  inserted: number;
  updated: number;
}

export function parseCsvRecords(csv: string): CsvParseResult {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());

  const rows = lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (values[index] ?? '').trim();
    });
    return record;
  });

  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

export function buildDocumentImportPlan(input: DocumentImportPlanInput): DocumentImportPlan {
  const { headers, rows, mapping, documents = [], profiles = [] } = input;

  const resolvedMapping = normaliseMapping(mapping);

  const missingRequired = REQUIRED_FIELDS.filter((field) => !resolvedMapping[field]);
  if (missingRequired.length > 0) {
    throw new Error(`Missing mappings for required fields: ${missingRequired.join(', ')}`);
  }

  for (const [field, column] of Object.entries(resolvedMapping)) {
    if (!column) continue;
    if (!headers.includes(column)) {
      throw new Error(`Column "${column}" selected for ${field} is not present in the CSV.`);
    }
  }

  const documentLookup = new Map<string, DocumentRow>();
  for (const document of documents) {
    documentLookup.set(document.id, document);
  }

  const profileLookup = new Map<string, Pick<ProfileRow, 'id' | 'email'>>();
  for (const profile of profiles) {
    if (!profile.email) continue;
    profileLookup.set(profile.email.toLowerCase(), profile);
  }

  const planRows: DocumentImportPlanRow[] = [];
  const documentIdCounts = new Map<string, number>();

  rows.forEach((row, index) => {
    const result = transformRow({
      row,
      index,
      mapping: resolvedMapping,
      documentLookup,
      profileLookup,
    });

    if (result.payload?.document_id) {
      const current = documentIdCounts.get(result.payload.document_id) ?? 0;
      documentIdCounts.set(result.payload.document_id, current + 1);
    }

    planRows.push(result);
  });

  for (const row of planRows) {
    const documentId = row.payload?.document_id;
    if (!documentId) continue;
    if ((documentIdCounts.get(documentId) ?? 0) > 1) {
      row.errors.push(`Duplicate document id ${documentId} detected in upload.`);
    }
  }

  const summary = planRows.reduce<DocumentImportPlanSummary>((acc, row) => {
    acc.total += 1;
    if (row.errors.length === 0 && row.payload) {
      acc.valid += 1;
      if (row.action === 'create') {
        acc.creates += 1;
      } else {
        acc.updates += 1;
      }
    } else {
      acc.invalid += 1;
    }
    return acc;
  }, {
    total: 0,
    valid: 0,
    invalid: 0,
    creates: 0,
    updates: 0,
  });

  return { rows: planRows, summary };
}

export async function applyDocumentImportPlan(options: {
  plan: DocumentImportPlan;
  repository: DocumentImportRepository;
  actorId: string;
}): Promise<DocumentImportExecutionResult> {
  const { plan, repository, actorId } = options;
  let inserted = 0;
  let updated = 0;

  for (const row of plan.rows) {
    if (row.errors.length > 0 || !row.payload) {
      continue;
    }

    if (row.action === 'create') {
      const now = new Date().toISOString();
      const state = row.payload.status === 'draft' ? 'draft' : 'published';

      const payload = {
        title: row.payload.title,
        description: row.payload.description,
        document_type: row.payload.document_type,
        status: row.payload.status,
        state,
        file_url: row.payload.file_url,
        documenso_envelope_id: null,
        documenso_template_id: null,
        metadata: {},
        created_by: actorId,
        tenant_id: row.payload.tenant_id,
        unit_id: row.payload.unit_id,
        requires_signature: row.payload.requires_signature,
        expires_at: row.payload.expires_at,
        signed_at: row.payload.status === 'signed' ? now : null,
        version: 1,
        parent_document_id: null,
        published_at: state === 'published' ? now : null,
        created_at: now,
        updated_at: now,
      };

      const document = await repository.insert(payload);
      await repository.recordVersion(document, actorId, 1);
      inserted += 1;
    } else {
      const existing = row.existingDocument;
      if (!existing) {
        row.errors.push('Document could not be loaded for update.');
        continue;
      }

      const now = new Date().toISOString();
      const nextVersion = (existing.version ?? 1) + 1;
      const state = row.payload.status === 'draft' ? 'draft' : 'published';
      const publishedAt = state === 'published' ? existing.published_at ?? now : null;
      const signedAt =
        row.payload.status === 'signed'
          ? existing.signed_at ?? now
          : row.payload.status === 'draft'
            ? null
            : existing.signed_at;

      const updatePayload = {
        title: row.payload.title,
        description: row.payload.description,
        document_type: row.payload.document_type,
        status: row.payload.status,
        state,
        file_url: row.payload.file_url,
        tenant_id: row.payload.tenant_id,
        unit_id: row.payload.unit_id,
        requires_signature: row.payload.requires_signature,
        expires_at: row.payload.expires_at,
        signed_at: signedAt,
        updated_at: now,
        version: nextVersion,
        published_at: publishedAt,
      };

      const document = await repository.update(existing.id, updatePayload);
      await repository.recordVersion(document, actorId, nextVersion);
      updated += 1;
    }
  }

  return { inserted, updated };
}

function normaliseMapping(mapping: DocumentImportMapping) {
  const resolved: Record<DocumentImportField, string | undefined> = {
    title: undefined,
    document_type: undefined,
    status: undefined,
    description: undefined,
    tenant_email: undefined,
    unit_id: undefined,
    requires_signature: undefined,
    expires_at: undefined,
    document_id: undefined,
    file_url: undefined,
  };

  for (const field of DOCUMENT_IMPORT_FIELDS) {
    const column = mapping[field];
    if (typeof column === 'string' && column.trim().length > 0) {
      resolved[field] = column.trim();
    }
  }

  return resolved;
}

function transformRow(options: {
  row: Record<string, string>;
  index: number;
  mapping: Record<DocumentImportField, string | undefined>;
  documentLookup: Map<string, DocumentRow>;
  profileLookup: Map<string, Pick<ProfileRow, 'id' | 'email'>>;
}): DocumentImportPlanRow {
  const { row, index, mapping, documentLookup, profileLookup } = options;

  const errors: string[] = [];
  const sanitised = sanitiseRow(row, mapping, errors);
  const action: 'create' | 'update' = sanitised?.document_id ? 'update' : 'create';

  const result: DocumentImportPlanRow = {
    index,
    raw: row,
    action,
    errors,
  };

  if (!sanitised) {
    return result;
  }

  const payload: DocumentImportRowPayload = {
    title: sanitised.title,
    description: sanitised.description ?? null,
    document_type: sanitised.document_type,
    status: sanitised.status,
    tenant_email: sanitised.tenant_email,
    tenant_id: null,
    unit_id: sanitised.unit_id ?? null,
    requires_signature: sanitised.requires_signature ?? false,
    expires_at: sanitised.expires_at ?? null,
    document_id: sanitised.document_id,
    file_url: sanitised.file_url ?? null,
  };

  if (payload.document_id) {
    const existing = documentLookup.get(payload.document_id);
    if (!existing) {
      result.errors.push(`Document with id ${payload.document_id} was not found.`);
    } else {
      result.existingDocument = existing;
      payload.description = sanitised.description ?? existing.description ?? null;
      payload.requires_signature = sanitised.requires_signature ?? existing.requires_signature ?? false;
      payload.unit_id = sanitised.unit_id ?? existing.unit_id ?? null;
      payload.expires_at = sanitised.expires_at ?? existing.expires_at ?? null;
      payload.file_url = sanitised.file_url ?? existing.file_url ?? null;
      payload.tenant_id = resolveTenantId({
        sanitisedEmail: sanitised.tenant_email,
        existingTenantId: existing.tenant_id,
        profileLookup,
        errors: result.errors,
      });
    }
  } else {
    payload.tenant_id = resolveTenantId({
      sanitisedEmail: sanitised.tenant_email,
      existingTenantId: null,
      profileLookup,
      errors: result.errors,
    });
  }

  result.payload = payload;
  return result;
}

function resolveTenantId(options: {
  sanitisedEmail?: string;
  existingTenantId: string | null;
  profileLookup: Map<string, Pick<ProfileRow, 'id' | 'email'>>;
  errors: string[];
}) {
  const { sanitisedEmail, existingTenantId, profileLookup, errors } = options;

  if (sanitisedEmail) {
    const profile = profileLookup.get(sanitisedEmail);
    if (!profile) {
      errors.push(`No tenant found for email ${sanitisedEmail}.`);
      return existingTenantId ?? null;
    }
    return profile.id;
  }

  return existingTenantId ?? null;
}

type SanitisedRow = {
  title: string;
  description?: string | null;
  document_type: DocumentType;
  status: DocumentStatus;
  tenant_email?: string;
  unit_id?: string | null;
  requires_signature?: boolean;
  expires_at?: string | null;
  document_id?: string;
  file_url?: string | null;
};

function sanitiseRow(
  row: Record<string, string>,
  mapping: Record<DocumentImportField, string | undefined>,
  errors: string[],
): SanitisedRow | null {
  const getValue = (field: DocumentImportField) => {
    const column = mapping[field];
    if (!column) return undefined;
    return row[column] ?? '';
  };

  const title = (getValue('title') ?? '').trim();
  if (!title) {
    errors.push('Title is required.');
  }

  const rawType = getValue('document_type');
  const document_type = normaliseEnum(rawType, DOCUMENT_TYPES);
  if (!document_type) {
    errors.push(
      rawType && rawType.trim().length > 0
        ? `Invalid document type "${rawType}".`
        : 'Document type is required.',
    );
  }

  const rawStatus = getValue('status');
  const status = normaliseEnum(rawStatus, DOCUMENT_STATUSES);
  if (!status) {
    errors.push(
      rawStatus && rawStatus.trim().length > 0
        ? `Invalid status "${rawStatus}".`
        : 'Status is required.',
    );
  }

  const description = (() => {
    if (!mapping.description) return undefined;
    const value = getValue('description');
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();

  const tenant_email = (() => {
    if (!mapping.tenant_email) return undefined;
    const value = getValue('tenant_email');
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const lowercase = trimmed.toLowerCase();
    if (!z.string().email().safeParse(lowercase).success) {
      errors.push(`Invalid tenant email "${value}".`);
    }
    return lowercase;
  })();

  const unit_id = (() => {
    if (!mapping.unit_id) return undefined;
    const value = getValue('unit_id');
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();

  const requires_signature = (() => {
    if (!mapping.requires_signature) return undefined;
    const value = getValue('requires_signature');
    if (value === undefined) return undefined;
    const normalised = value.trim().toLowerCase();
    if (normalised.length === 0) return undefined;
    if (['true', '1', 'yes', 'y'].includes(normalised)) return true;
    if (['false', '0', 'no', 'n'].includes(normalised)) return false;
    errors.push(`Invalid requires_signature value "${value}". Use yes or no.`);
    return undefined;
  })();

  const expires_at = (() => {
    if (!mapping.expires_at) return undefined;
    const value = getValue('expires_at');
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      errors.push(`Invalid expiration date "${value}". Use ISO or yyyy-mm-dd.`);
      return undefined;
    }
    return parsed.toISOString();
  })();

  const document_id = (() => {
    if (!mapping.document_id) return undefined;
    const value = getValue('document_id');
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (!isUuid(trimmed)) {
      errors.push(`Invalid document id "${value}".`);
      return undefined;
    }
    return trimmed;
  })();

  const file_url = (() => {
    if (!mapping.file_url) return undefined;
    const value = getValue('file_url');
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      errors.push(`Invalid file url "${value}".`);
      return undefined;
    }
  })();

  if (errors.length > 0 || !document_type || !status || !title) {
    return null;
  }

  return {
    title,
    description,
    document_type,
    status,
    tenant_email,
    unit_id,
    requires_signature,
    expires_at,
    document_id,
    file_url,
  };
}

function normaliseEnum<T extends string>(value: string | undefined, allowed: readonly T[]) {
  if (!value) return undefined;
  const normalised = value.trim().toLowerCase().replace(/[\s-]+/g, '_') as T;
  if (allowed.includes(normalised)) {
    return normalised;
  }
  return undefined;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
