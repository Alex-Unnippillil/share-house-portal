import { describe, expect, it } from 'vitest';

import {
  applyTemplateToFormState,
  buildDraftPayloadFromTemplate,
  createEmptyUploadDocumentFormState,
  resolveTemplateSelection,
} from '@/app/documents/components/template-helpers';
import type { DocumentTemplate } from '@/types/documents';

const templates: DocumentTemplate[] = [
  {
    id: 'tmpl-lease',
    title: 'Lease Template',
    description: 'A reusable lease agreement',
    document_type: 'lease',
    source: 'documenso',
    documenso_template_id: 'doc-lease-001',
    tags: ['Lease', 'Documenso'],
    requires_signature: true,
    metadata: { base: 'value' },
    prefill: {
      title: 'Residential Lease Agreement',
      description: 'Prefilled lease draft',
      requires_signature: true,
      documenso_template_id: 'doc-lease-001',
      metadata: { extra: 'field' },
    },
    autoCreateDraft: true,
  },
  {
    id: 'tmpl-maintenance',
    title: 'Maintenance Authorization',
    description: 'Consent for scheduled maintenance visits',
    document_type: 'maintenance',
    source: 'supabase',
    tags: ['Maintenance'],
    requires_signature: false,
  },
];

describe('document template selection', () => {
  it('applies template prefill to upload form state', () => {
    const currentForm = createEmptyUploadDocumentFormState();
    const template = templates[0];

    const result = applyTemplateToFormState({ template, currentForm });

    expect(result.title).toBe(template.prefill?.title);
    expect(result.description).toBe(template.prefill?.description);
    expect(result.document_type).toBe('lease');
    expect(result.requires_signature).toBe(true);
    expect(result.documenso_template_id).toBe(template.prefill?.documenso_template_id);
    expect(result.expires_at).toBe(currentForm.expires_at);
  });

  it('throws when a template id does not exist', () => {
    expect(() => resolveTemplateSelection(templates, 'missing-template')).toThrow(
      "Template 'missing-template' not found",
    );
  });

  it('builds a draft payload with merged metadata', () => {
    const payload = buildDraftPayloadFromTemplate(templates[0]);

    expect(payload.template_id).toBe('tmpl-lease');
    expect(payload.documenso_template_id).toBe('doc-lease-001');
    expect(payload.metadata).toMatchObject({ base: 'value', extra: 'field' });
    expect(payload.requires_signature).toBe(true);
  });
});
