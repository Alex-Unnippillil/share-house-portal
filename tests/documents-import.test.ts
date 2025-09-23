import { describe, expect, it, vi } from 'vitest';

import {
  applyDocumentImportPlan,
  buildDocumentImportPlan,
  parseCsvRecords,
  type DocumentImportMapping,
} from '@/lib/documents/import';

const baseDocument = {
  id: '11111111-1111-1111-8111-111111111111',
  created_at: new Date('2024-01-01').toISOString(),
  updated_at: new Date('2024-01-10').toISOString(),
  title: 'Signed Lease',
  description: 'Existing description',
  document_type: 'lease' as const,
  status: 'draft' as const,
  state: 'draft' as const,
  file_url: null,
  documenso_envelope_id: null,
  documenso_template_id: null,
  metadata: {},
  created_by: 'manager-1',
  tenant_id: 'tenant-1',
  unit_id: 'unit-4b',
  requires_signature: true,
  expires_at: null,
  signed_at: null,
  version: 2,
  parent_document_id: null,
  published_at: null,
};

describe('buildDocumentImportPlan', () => {
  it('maps headers and classifies create vs update rows', () => {
    const csv = `Title,Type,Status,Tenant Email,Document ID\n` +
      `New Lease,Lease,pending_signature,tenant@example.com,\n` +
      `Existing Lease,Lease,signed,tenant@example.com,${baseDocument.id}`;

    const { headers, rows } = parseCsvRecords(csv);

    const mapping: DocumentImportMapping = {
      title: 'Title',
      document_type: 'Type',
      status: 'Status',
      tenant_email: 'Tenant Email',
      document_id: 'Document ID',
    };

    const plan = buildDocumentImportPlan({
      headers,
      rows,
      mapping,
      documents: [baseDocument],
      profiles: [{ id: 'tenant-1', email: 'tenant@example.com' }],
    });

    expect(plan.summary.total).toBe(2);
    expect(plan.summary.creates).toBe(1);
    expect(plan.summary.updates).toBe(1);
    expect(plan.rows[0].action).toBe('create');
    expect(plan.rows[0].payload?.title).toBe('New Lease');
    expect(plan.rows[1].action).toBe('update');
    expect(plan.rows[1].payload?.document_id).toBe(baseDocument.id);
    expect(plan.rows[1].errors).toHaveLength(0);
  });

  it('surfaces validation feedback for bad rows', () => {
    const csv = `Title,Type,Status,Tenant Email\n` +
      `Lease Draft,Lease,invalid status,tenant@example.com\n` +
      `Pending Lease,Lease,pending_signature,missing@example.com`;

    const { headers, rows } = parseCsvRecords(csv);
    const mapping: DocumentImportMapping = {
      title: 'Title',
      document_type: 'Type',
      status: 'Status',
      tenant_email: 'Tenant Email',
    };

    const plan = buildDocumentImportPlan({
      headers,
      rows,
      mapping,
      documents: [],
      profiles: [{ id: 'tenant-1', email: 'tenant@example.com' }],
    });

    expect(plan.summary.invalid).toBe(2);
    expect(plan.rows[0].errors.some((msg) => msg.includes('Invalid status'))).toBe(true);
    expect(plan.rows[1].errors.some((msg) => msg.includes('No tenant found'))).toBe(true);
  });
});

describe('applyDocumentImportPlan', () => {
  it('inserts new documents and updates existing ones', async () => {
    const csv = `Title,Type,Status,Tenant Email,Document ID\n` +
      `New Lease,Lease,pending_signature,tenant@example.com,\n` +
      `Existing Lease,Lease,signed,tenant@example.com,${baseDocument.id}`;

    const { headers, rows } = parseCsvRecords(csv);
    const mapping: DocumentImportMapping = {
      title: 'Title',
      document_type: 'Type',
      status: 'Status',
      tenant_email: 'Tenant Email',
      document_id: 'Document ID',
    };

    const plan = buildDocumentImportPlan({
      headers,
      rows,
      mapping,
      documents: [baseDocument],
      profiles: [{ id: 'tenant-1', email: 'tenant@example.com' }],
    });

    const insertMock = vi.fn(async (payload: Record<string, unknown>) => ({
      ...baseDocument,
      id: '99999999-9999-9999-9999-999999999999',
      title: payload.title as string,
      status: payload.status as typeof baseDocument.status,
      state: payload.state as typeof baseDocument.state,
      requires_signature: payload.requires_signature as boolean,
      tenant_id: payload.tenant_id as string | null,
      unit_id: payload.unit_id as string | null,
      expires_at: payload.expires_at as string | null,
      signed_at: payload.signed_at as string | null,
      version: payload.version as number,
      published_at: payload.published_at as string | null,
      created_at: payload.created_at as string,
      updated_at: payload.updated_at as string,
      metadata: payload.metadata as Record<string, unknown>,
    }));

    const updateMock = vi.fn(async (id: string, payload: Record<string, unknown>) => ({
      ...baseDocument,
      id,
      title: payload.title as string,
      status: payload.status as typeof baseDocument.status,
      state: payload.state as typeof baseDocument.state,
      requires_signature: payload.requires_signature as boolean,
      tenant_id: payload.tenant_id as string | null,
      unit_id: payload.unit_id as string | null,
      expires_at: payload.expires_at as string | null,
      signed_at: payload.signed_at as string | null,
      version: payload.version as number,
      updated_at: payload.updated_at as string,
      published_at: payload.published_at as string | null,
    }));

    const recordVersionMock = vi.fn(async () => undefined);

    const execution = await applyDocumentImportPlan({
      plan,
      repository: {
        insert: insertMock,
        update: updateMock,
        recordVersion: recordVersionMock,
      },
      actorId: 'manager-1',
    });

    expect(execution.inserted).toBe(1);
    expect(execution.updated).toBe(1);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(recordVersionMock).toHaveBeenCalledTimes(2);
    expect(recordVersionMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: '99999999-9999-9999-9999-999999999999' }),
      'manager-1',
      1,
    );
    expect(recordVersionMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: baseDocument.id }),
      'manager-1',
      (baseDocument.version ?? 1) + 1,
    );
  });
});
