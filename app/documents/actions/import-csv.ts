'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/utils/supa-server-actions';
import { DOCUMENT_IMPORT_FIELDS, DOCUMENT_TYPE_VALUES, IMPORT_FIELD_PRESETS, MEMBER_IMPORT_FIELDS, MEMBER_ROLE_VALUES } from '@/lib/import/presets';
import type { DocumentType } from '@/types/documents';
import type { CsvImportEntity, CsvImportPreview, CsvImportResponse, CsvPreviewRow } from '@/types/import';

const PREVIEW_ROW_LIMIT = 25;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const TRUE_VALUES = new Set(['true', '1', 'yes', 'y']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'n']);

interface ParsedCsvRow {
  rowNumber: number;
  raw: Record<string, string>;
}

export interface DocumentImportRecord {
  title: string;
  document_type: DocumentType;
  tenant_email?: string;
  unit?: string;
  requires_signature: boolean;
  expires_at?: string;
}

export interface MemberImportRecord {
  full_name: string;
  email: string;
  role: (typeof MEMBER_ROLE_VALUES)[number];
  unit?: string;
  phone?: string;
}

type ImportRecord = DocumentImportRecord | MemberImportRecord;

type PreviewComputationResult<T extends ImportRecord> = {
  preview: CsvImportPreview;
  records: T[];
};

function normaliseHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normaliseValue(value: string | null | undefined) {
  return (value ?? '').trim();
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseCsv(content: string): { headers: string[]; rows: ParsedCsvRow[] } {
  const sanitized = content.replace(/^\uFEFF/, '');
  const lines = sanitized.split(/\r?\n/);

  let headers: string[] | null = null;
  const rows: ParsedCsvRow[] = [];

  lines.forEach((line, index) => {
    if (!line.trim()) {
      return;
    }

    const values = splitCsvLine(line);
    if (!headers) {
      headers = values;
      return;
    }

    const raw: Record<string, string> = {};
    headers.forEach((header, idx) => {
      raw[header] = values[idx] ?? '';
    });

    rows.push({
      rowNumber: index + 1,
      raw,
    });
  });

  if (!headers) {
    throw new Error('CSV file must include a header row.');
  }

  return { headers, rows };
}

function suggestMapping(entity: CsvImportEntity, headers: string[]): Record<string, string> {
  const fields = IMPORT_FIELD_PRESETS[entity];
  const headerMap = new Map(headers.map(header => [normaliseHeader(header), header] as const));

  const suggestions: Record<string, string> = {};
  fields.forEach(field => {
    const direct = headerMap.get(normaliseHeader(field.label));
    if (direct) {
      suggestions[field.key] = direct;
      return;
    }

    const keyMatch = headerMap.get(normaliseHeader(field.key));
    if (keyMatch) {
      suggestions[field.key] = keyMatch;
    }
  });

  return suggestions;
}

function parseBoolean(value: string): boolean | null {
  const lower = value.toLowerCase();
  if (TRUE_VALUES.has(lower)) {
    return true;
  }
  if (FALSE_VALUES.has(lower)) {
    return false;
  }
  return null;
}

function computeDocumentPreview(
  rows: ParsedCsvRow[],
  mapping: Record<string, string>,
  existingIdentifiers: Set<string>
): PreviewComputationResult<DocumentImportRecord> {
  const previewRows: CsvPreviewRow[] = [];
  const records: DocumentImportRecord[] = [];
  const duplicateTracker = new Map<string, number>();
  let conflictRows = 0;
  let duplicateRows = 0;
  let validRows = 0;

  rows.forEach(row => {
    const values: Record<string, string> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    DOCUMENT_IMPORT_FIELDS.forEach(field => {
      const header = mapping[field.key];
      const rawValue = header ? row.raw[header] : '';
      values[field.key] = normaliseValue(rawValue);
      if (field.required && !values[field.key]) {
        errors.push(`${field.label} is required.`);
      }
    });

    const title = values.title;
    const documentType = values.document_type.toLowerCase() as DocumentType;
    const tenantEmail = values.tenant_email;
    const unit = values.unit;
    const requiresSignatureValue = values.requires_signature;
    const expiresAt = values.expires_at;

    if (values.document_type && !DOCUMENT_TYPE_VALUES.includes(documentType)) {
      errors.push(`Document type must be one of: ${DOCUMENT_TYPE_VALUES.join(', ')}.`);
    }

    if (tenantEmail && !EMAIL_REGEX.test(tenantEmail)) {
      errors.push('Tenant email must be a valid email address.');
    }

    let requiresSignature = false;
    if (requiresSignatureValue) {
      const booleanValue = parseBoolean(requiresSignatureValue);
      if (booleanValue === null) {
        errors.push('Requires Signature must be TRUE or FALSE.');
      } else {
        requiresSignature = booleanValue;
      }
    }

    let normalisedExpiresAt: string | undefined;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        errors.push('Expires At must be a valid date.');
      } else {
        normalisedExpiresAt = parsed.toISOString();
      }
    }

    let conflict: string | undefined;
    const identifier = title.toLowerCase();
    if (identifier) {
      const existing = existingIdentifiers.has(identifier);
      if (existing) {
        conflict = 'A document with this title already exists.';
        conflictRows += 1;
      }

      const firstOccurrence = duplicateTracker.get(identifier);
      if (firstOccurrence) {
        conflict = `Duplicate of row ${firstOccurrence}.`;
        duplicateRows += 1;
      } else {
        duplicateTracker.set(identifier, row.rowNumber);
      }
    }

    previewRows.push({
      rowNumber: row.rowNumber,
      raw: row.raw,
      values: {
        title,
        document_type: values.document_type,
        tenant_email: tenantEmail,
        unit,
        requires_signature: requiresSignatureValue,
        expires_at: expiresAt,
      },
      errors,
      warnings,
      conflict,
    });

    if (errors.length === 0 && !conflict) {
      validRows += 1;
      records.push({
        title,
        document_type: documentType,
        tenant_email: tenantEmail || undefined,
        unit: unit || undefined,
        requires_signature: requiresSignature,
        expires_at: normalisedExpiresAt,
      });
    }
  });

  const preview: CsvImportPreview = {
    rows: previewRows,
    summary: {
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      conflictRows,
      duplicateRows,
    },
  };

  return { preview, records };
}

function computeMemberPreview(
  rows: ParsedCsvRow[],
  mapping: Record<string, string>,
  existingIdentifiers: Set<string>
): PreviewComputationResult<MemberImportRecord> {
  const previewRows: CsvPreviewRow[] = [];
  const records: MemberImportRecord[] = [];
  const duplicateTracker = new Map<string, number>();
  let conflictRows = 0;
  let duplicateRows = 0;
  let validRows = 0;

  rows.forEach(row => {
    const values: Record<string, string> = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    MEMBER_IMPORT_FIELDS.forEach(field => {
      const header = mapping[field.key];
      const rawValue = header ? row.raw[header] : '';
      values[field.key] = normaliseValue(rawValue);
      if (field.required && !values[field.key]) {
        errors.push(`${field.label} is required.`);
      }
    });

    const fullName = values.full_name;
    const email = values.email.toLowerCase();
    const role = values.role.toLowerCase();
    const unit = values.unit;
    const phone = values.phone;

    if (email && !EMAIL_REGEX.test(email)) {
      errors.push('Email must be a valid email address.');
    }

    if (role && !MEMBER_ROLE_VALUES.includes(role as MemberImportRecord['role'])) {
      errors.push(`Role must be one of: ${MEMBER_ROLE_VALUES.join(', ')}.`);
    }

    if (phone && phone.replace(/[^0-9]/g, '').length < 7) {
      warnings.push('Phone number looks incomplete.');
    }

    let conflict: string | undefined;
    const identifier = email;
    if (identifier) {
      if (existingIdentifiers.has(identifier)) {
        conflict = 'A member with this email already exists.';
        conflictRows += 1;
      }
      const firstOccurrence = duplicateTracker.get(identifier);
      if (firstOccurrence) {
        conflict = `Duplicate of row ${firstOccurrence}.`;
        duplicateRows += 1;
      } else {
        duplicateTracker.set(identifier, row.rowNumber);
      }
    }

    previewRows.push({
      rowNumber: row.rowNumber,
      raw: row.raw,
      values: {
        full_name: fullName,
        email,
        role,
        unit,
        phone,
      },
      errors,
      warnings,
      conflict,
    });

    if (errors.length === 0 && !conflict) {
      validRows += 1;
      records.push({
        full_name: fullName,
        email,
        role: role as MemberImportRecord['role'],
        unit: unit || undefined,
        phone: phone || undefined,
      });
    }
  });

  const preview: CsvImportPreview = {
    rows: previewRows,
    summary: {
      totalRows: rows.length,
      validRows,
      invalidRows: rows.length - validRows,
      conflictRows,
      duplicateRows,
    },
  };

  return { preview, records };
}

export function buildImportPreview(
  entity: CsvImportEntity,
  rows: ParsedCsvRow[],
  mapping: Record<string, string>,
  existingIdentifiers: Set<string>
): PreviewComputationResult<DocumentImportRecord> | PreviewComputationResult<MemberImportRecord> {
  if (entity === 'documents') {
    return computeDocumentPreview(rows, mapping, existingIdentifiers);
  }
  return computeMemberPreview(rows, mapping, existingIdentifiers);
}

async function fetchExistingIdentifiers(entity: CsvImportEntity): Promise<Set<string>> {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    if (entity === 'documents') {
      const { data, error } = await supabase.from('documents').select('title');
      if (error) {
        throw error;
      }
      const identifiers = (data ?? [])
        .map((row: { title: string | null }) => normaliseValue(row.title).toLowerCase())
        .filter(Boolean);
      return new Set(identifiers);
    }

    const { data, error } = await supabase.from('profiles').select('email');
    if (error) {
      throw error;
    }
    const identifiers = (data ?? [])
      .map((row: { email: string | null }) => normaliseValue(row.email).toLowerCase())
      .filter(Boolean);
    return new Set(identifiers);
  } catch (error) {
    console.error('Failed to resolve existing identifiers for import:', error);
    return new Set();
  }
}

function truncatePreview(preview: CsvImportPreview): CsvImportPreview {
  if (preview.rows.length <= PREVIEW_ROW_LIMIT) {
    return preview;
  }
  return {
    summary: preview.summary,
    rows: preview.rows.slice(0, PREVIEW_ROW_LIMIT),
  };
}

function parseMapping(value: FormDataEntryValue | null, headers: string[]): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(String(value)) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed).filter(([_, header]) => header && headers.includes(header))
    );
  } catch (error) {
    console.error('Failed to parse CSV mapping:', error);
    return {};
  }
}

export async function importCsvAction(formData: FormData): Promise<CsvImportResponse> {
  const file = formData.get('file');
  const intent = String(formData.get('intent') ?? 'analyze') as 'analyze' | 'preview' | 'commit';
  const entity = String(formData.get('entity') ?? 'documents') as CsvImportEntity;

  if (!(file instanceof File)) {
    return { success: false, error: 'A CSV file is required.' };
  }

  const buffer = await file.arrayBuffer();
  const text = new TextDecoder().decode(buffer);
  let parsed;
  try {
    parsed = parseCsv(text);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unable to parse CSV file.',
    };
  }

  const { headers, rows } = parsed;
  const suggestedMapping = suggestMapping(entity, headers);

  if (intent === 'analyze') {
    return {
      success: true,
      headers,
      suggestedMapping,
      message: `Detected ${rows.length} rows in the uploaded file.`,
    };
  }

  const mapping = parseMapping(formData.get('mapping'), headers);
  const requiredFields = IMPORT_FIELD_PRESETS[entity].filter(field => field.required);
  const missingMappings = requiredFields.filter(field => !mapping[field.key]);
  if (missingMappings.length) {
    return {
      success: false,
      headers,
      suggestedMapping,
      error: `Please map required fields: ${missingMappings.map(field => field.label).join(', ')}.`,
    };
  }

  const existingIdentifiers = await fetchExistingIdentifiers(entity);
  const previewResult = buildImportPreview(entity, rows, mapping, existingIdentifiers);
  const preview = truncatePreview(previewResult.preview);

  if (intent === 'preview') {
    return {
      success: true,
      headers,
      suggestedMapping: { ...suggestedMapping, ...mapping },
      preview,
      message: 'Review detected issues before importing.',
    };
  }

  const hasBlockingIssues =
    previewResult.preview.summary.invalidRows > 0 ||
    previewResult.preview.summary.conflictRows > 0;

  if (hasBlockingIssues) {
    return {
      success: false,
      headers,
      suggestedMapping: { ...suggestedMapping, ...mapping },
      preview,
      error: 'Resolve validation errors and conflicts before importing.',
    };
  }

  return {
    success: true,
    headers,
    suggestedMapping: { ...suggestedMapping, ...mapping },
    preview,
    committedCount: previewResult.records.length,
    message: `Successfully prepared ${previewResult.records.length} ${entity} for import.`,
  };
}
