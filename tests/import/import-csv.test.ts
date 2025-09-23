import { describe, expect, it } from 'vitest';
import { buildImportPreview, parseCsv } from '@/app/documents/actions/import-csv';

describe('CSV import validation', () => {
  it('flags invalid document rows before commit', () => {
    const csv = `Document Title,Document Type,Tenant Email,Requires Signature,Expires At
,lease,tenant@example.com,true,2025-01-01
Lease Agreement,invalid_type,tenant-two@example.com,false,
Duplicate Doc,lease,duplicate@example.com,false,
Duplicate Doc,lease,duplicate-second@example.com,true,
`;

    const { rows } = parseCsv(csv);
    const mapping = {
      title: 'Document Title',
      document_type: 'Document Type',
      tenant_email: 'Tenant Email',
      requires_signature: 'Requires Signature',
      expires_at: 'Expires At',
    };

    const previewResult = buildImportPreview('documents', rows, mapping, new Set(['duplicate doc']));

    expect(previewResult.preview.summary.invalidRows).toBeGreaterThan(0);
    const [firstRow, secondRow, thirdRow, fourthRow] = previewResult.preview.rows;

    expect(firstRow.errors).toContain('Document Title is required.');
    expect(secondRow.errors).toContain(
      'Document type must be one of: lease, addendum, insurance, maintenance, other.'
    );
    expect(thirdRow.conflict).toBe('A document with this title already exists.');
    expect(fourthRow.conflict).toMatch(/Duplicate of row/);
    expect(previewResult.records.length).toBe(0);
  });

  it('flags invalid member rows and duplicates before commit', () => {
    const csv = `Full Name,Email,Role,Phone
Jane Doe,not-an-email,tenant,555-0100
,valid@example.com,tenant,
Alex Smith,alex@example.com,manager,
Alex Smith,alex@example.com,tenant,555-0101
`;

    const { rows } = parseCsv(csv);
    const mapping = {
      full_name: 'Full Name',
      email: 'Email',
      role: 'Role',
      phone: 'Phone',
    };

    const previewResult = buildImportPreview('members', rows, mapping, new Set(['alex@example.com']));

    expect(previewResult.preview.summary.invalidRows).toBeGreaterThan(0);

    const [firstRow, secondRow, thirdRow, fourthRow] = previewResult.preview.rows;
    expect(firstRow.errors).toContain('Email must be a valid email address.');
    expect(secondRow.errors).toContain('Full Name is required.');
    expect(thirdRow.errors).toContain('Role must be one of: tenant, roommate, property_manager, admin.');
    expect(thirdRow.conflict).toBe('A member with this email already exists.');
    expect(fourthRow.conflict).toMatch(/Duplicate of row/);
    expect(previewResult.records.length).toBe(0);
  });
});
