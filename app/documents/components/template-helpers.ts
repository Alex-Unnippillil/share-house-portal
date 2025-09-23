import type { DocumentTemplate } from '@/types/documents';
import type { DocumentType } from '@/types/documents';

type MetadataRecord = Record<string, any>;

export interface UploadDocumentFormState {
  title: string;
  description: string;
  document_type: DocumentType;
  tenant_id: string;
  unit_id: string;
  requires_signature: boolean;
  expires_at: string;
  documenso_template_id: string;
}

export const createEmptyUploadDocumentFormState = (): UploadDocumentFormState => ({
  title: '',
  description: '',
  document_type: 'other',
  tenant_id: '',
  unit_id: '',
  requires_signature: false,
  expires_at: '',
  documenso_template_id: '',
});

export function resolveTemplateSelection(
  templates: DocumentTemplate[],
  templateId: string,
): DocumentTemplate {
  if (!templateId) {
    throw new Error('Template id is required');
  }

  const template = templates.find((item) => item.id === templateId);

  if (!template) {
    throw new Error(`Template '${templateId}' not found`);
  }

  return template;
}

export function applyTemplateToFormState({
  template,
  currentForm,
}: {
  template: DocumentTemplate;
  currentForm: UploadDocumentFormState;
}): UploadDocumentFormState {
  const prefill = template.prefill ?? {};
  const requiresSignature =
    typeof prefill.requires_signature === 'boolean'
      ? prefill.requires_signature
      : typeof template.requires_signature === 'boolean'
        ? template.requires_signature
        : currentForm.requires_signature;

  return {
    ...currentForm,
    title: prefill.title ?? template.title ?? currentForm.title,
    description: prefill.description ?? template.description ?? currentForm.description,
    document_type: prefill.document_type ?? template.document_type ?? currentForm.document_type,
    requires_signature: requiresSignature,
    expires_at: prefill.expires_at ?? currentForm.expires_at,
    documenso_template_id:
      prefill.documenso_template_id ??
      template.documenso_template_id ??
      currentForm.documenso_template_id ??
      '',
  };
}

export interface DraftFromTemplatePayload {
  template_id: string;
  title: string;
  description?: string;
  document_type: DocumentType;
  requires_signature: boolean;
  documenso_template_id?: string;
  metadata?: MetadataRecord;
  source?: DocumentTemplate['source'];
}

export function buildDraftPayloadFromTemplate(
  template: DocumentTemplate,
): DraftFromTemplatePayload {
  const prefill = template.prefill ?? {};
  const metadata: MetadataRecord = {
    ...(template.metadata ?? {}),
    ...(prefill.metadata ?? {}),
  };

  const documensoTemplateId =
    prefill.documenso_template_id ?? template.documenso_template_id ?? undefined;

  const requiresSignature =
    typeof prefill.requires_signature === 'boolean'
      ? prefill.requires_signature
      : typeof template.requires_signature === 'boolean'
        ? template.requires_signature
        : true;

  return {
    template_id: template.id,
    title: prefill.title ?? template.title,
    description: prefill.description ?? template.description ?? '',
    document_type: prefill.document_type ?? template.document_type,
    requires_signature: requiresSignature,
    documenso_template_id: documensoTemplateId,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    source: template.source,
  };
}
