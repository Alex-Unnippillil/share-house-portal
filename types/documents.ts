import type { PaginationMetadata, PaginationParams } from './pagination';

export type DocumentType = 'lease' | 'addendum' | 'insurance' | 'maintenance' | 'other';

export type DocumentStatus = 'draft' | 'pending_signature' | 'signed' | 'expired' | 'cancelled';

export type SignatureStatus = 'pending' | 'signed' | 'declined' | 'expired';

export interface Document {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description?: string;
  document_type: DocumentType;
  status: DocumentStatus;
  file_url?: string;
  documenso_envelope_id?: string;
  documenso_template_id?: string;
  metadata: Record<string, any>;
  created_by?: string;
  property_id?: string;
  tenant_id?: string;
  unit_id?: string;
  requires_signature: boolean;
  expires_at?: string;
  signed_at?: string;
  version: number;
  parent_document_id?: string;
}

export interface DocumentSignature {
  id: string;
  created_at: string;
  updated_at: string;
  document_id: string;
  signer_id: string;
  signer_email: string;
  signer_name?: string;
  status: SignatureStatus;
  signed_at?: string;
  declined_at?: string;
  decline_reason?: string;
  documenso_signature_id?: string;
  ip_address?: string;
  user_agent?: string;
  signature_data?: Record<string, any>;
}

export interface DocumentAccessLog {
  id: string;
  created_at: string;
  document_id: string;
  user_id: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
}

export interface Lease {
  id: string;
  document_id: string;
  created_at: string;
  updated_at: string;
  start_date: string;
  end_date?: string;
  rent_amount?: number;
  rent_frequency: string;
  security_deposit?: number;
  tenant_ids: string[];
  property_address?: string;
  unit_number?: string;
  landlord_name?: string;
  landlord_email?: string;
  auto_renew: boolean;
  renewal_notice_days: number;
  special_terms?: string;
  status: DocumentStatus;
}

export interface DocumentWithLease extends Document {
  lease?: Lease;
  signatures?: DocumentSignature[];
  access_logs?: DocumentAccessLog[];
}

export interface DocumentSigningRequest {
  document_id: string;
  signer_email: string;
  signer_name?: string;
  message?: string;
  expires_in_days?: number;
}

export interface DocumentSigningResponse {
  success: boolean;
  envelope_id?: string;
  signing_url?: string;
  error?: string;
}

export interface DocumentUploadRequest {
  file: File;
  title: string;
  description?: string;
  document_type: DocumentType;
  tenant_id?: string;
  unit_id?: string;
  requires_signature?: boolean;
  expires_at?: string;
}

export interface DocumentListFilters {
  status?: DocumentStatus[];
  type?: DocumentType[];
  tenant_id?: string;
  unit_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface DocumentStats {
  total_documents: number;
  pending_signatures: number;
  signed_documents: number;
  expired_documents: number;
  draft_documents: number;
}

export interface DocumentListParams {
  filters?: DocumentListFilters;
  pagination?: PaginationParams;
}

export interface PaginatedDocumentsResponse {
  items: DocumentWithLease[];
  pagination: PaginationMetadata;
  filters?: DocumentListFilters;
}
