'use server';

import { createClient } from '@/utils/supa-server-actions';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { documensoService } from '@/lib/documenso';
import { fetchWithTagCache, invalidateTagCache } from '@/lib/cache/tags';
import {
  Document,
  DocumentWithLease,
  DocumentListFilters,
  DocumentUploadRequest,
  DocumentSigningRequest,
  DocumentStats
} from '@/types/documents';

const DOCUMENTS_TAG = 'documents';
const DOCUMENT_STATS_TAG = 'document-stats';

// Validation schemas
const documentUploadSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  document_type: z.enum(['lease', 'addendum', 'insurance', 'maintenance', 'other']),
  tenant_id: z.string().uuid().optional(),
  unit_id: z.string().optional(),
  requires_signature: z.boolean().default(false),
  expires_at: z.string().datetime().optional(),
});

const documentSigningSchema = z.object({
  document_id: z.string().uuid(),
  signer_email: z.string().email(),
  signer_name: z.string().optional(),
  message: z.string().optional(),
  expires_in_days: z.number().min(1).max(365).optional(),
});

const documentListFiltersSchema = z.object({
  status: z.array(z.enum(['draft', 'pending_signature', 'signed', 'expired', 'cancelled'])).optional(),
  type: z.array(z.enum(['lease', 'addendum', 'insurance', 'maintenance', 'other'])).optional(),
  tenant_id: z.string().uuid().optional(),
  unit_id: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

// Action result interface
interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Get documents with optional filters
export async function getDocumentsAction(
  filters?: DocumentListFilters
): Promise<ActionResult<DocumentWithLease[]>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to view documents.' };
    }

    // Validate filters
    const validatedFilters = filters ? documentListFiltersSchema.parse(filters) : {};

    // Determine role for scoping
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = (supabase as any)
      .from('documents')
      .select(`
        *,
        lease:leases(*),
        signatures:document_signatures(*),
        access_logs:document_access_logs(*, profiles:signer_id(username, full_name))
      `)
      .order('created_at', { ascending: false });

    // Scope non-admin/property_manager users to their own documents or ones they need to sign
    if (profile?.role !== 'property_manager' && profile?.role !== 'admin') {
      query = query.or(
        `tenant_id.eq.${user.id},signatures.signer_id.eq.${user.id}`
      );
    }

    // Apply filters
    if (validatedFilters.status?.length) {
      query = query.in('status', validatedFilters.status);
    }
    if (validatedFilters.type?.length) {
      query = query.in('document_type', validatedFilters.type);
    }
    if (validatedFilters.tenant_id) {
      query = query.eq('tenant_id', validatedFilters.tenant_id);
    }
    if (validatedFilters.unit_id) {
      query = query.eq('unit_id', validatedFilters.unit_id);
    }
    if (validatedFilters.date_from) {
      query = query.gte('created_at', validatedFilters.date_from);
    }
    if (validatedFilters.date_to) {
      query = query.lte('created_at', validatedFilters.date_to);
    }

    const cacheKey = `documents:${user.id}:${JSON.stringify(validatedFilters)}`;
    const { data: documents, cacheHit } = await fetchWithTagCache<DocumentWithLease[]>(
      cacheKey,
      [DOCUMENTS_TAG, `${DOCUMENTS_TAG}:${user.id}`],
      async () => {
        const { data: docs, error } = await query;

        if (error) {
          console.error('Error fetching documents:', error);
          throw new Error('Failed to fetch documents.');
        }

        return docs || [];
      }
    );

    if (!cacheHit) {
      for (const doc of documents) {
        await (supabase as any).rpc('log_document_access', {
          p_document_id: doc.id,
          p_action: 'view',
          p_metadata: { source: 'documents_page' }
        });
      }
    }

    return { success: true, data: documents };
  } catch (error) {
    if (error instanceof Error && error.message === 'Failed to fetch documents.') {
      return { success: false, error: error.message };
    }
    console.error('Unexpected error in getDocumentsAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.'
    };
  }
}

// Upload and create a new document
export async function uploadDocumentAction(
  formData: FormData
): Promise<ActionResult<Document>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to upload documents.' };
    }

    // Get file from form data
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided.' };
    }

    // Validate other form data
    const rawData = {
      title: formData.get('title'),
      description: formData.get('description'),
      document_type: formData.get('document_type'),
      tenant_id: formData.get('tenant_id'),
      unit_id: formData.get('unit_id'),
      requires_signature: formData.get('requires_signature') === 'true',
      expires_at: formData.get('expires_at'),
    };

    const validationResult = documentUploadSchema.safeParse(rawData);
    if (!validationResult.success) {
      const errorMessages = Object.values(validationResult.error.flatten().fieldErrors)
        .map(errors => errors?.join('. '))
        .filter(Boolean)
        .join(' ');
      return { success: false, error: errorMessages || 'Invalid form data provided.' };
    }

    const validatedData = validationResult.data;

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return { success: false, error: 'Failed to upload file.' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Create document record
    const { data: document, error: dbError } = await (supabase as any)
      .from('documents')
      .insert({
        title: validatedData.title,
        description: validatedData.description,
        document_type: validatedData.document_type,
        file_url: publicUrl,
        tenant_id: validatedData.tenant_id,
        unit_id: validatedData.unit_id,
        requires_signature: validatedData.requires_signature,
        expires_at: validatedData.expires_at,
        created_by: user.id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating document:', dbError);
      // Clean up uploaded file if document creation fails
      await supabase.storage.from('documents').remove([filePath]);
      return { success: false, error: 'Failed to create document record.' };
    }

    // Log document creation
    await (supabase as any).rpc('log_document_access', {
      p_document_id: document.id,
      p_action: 'upload',
      p_metadata: { file_name: file.name, file_size: file.size }
    });

    invalidateTagCache([DOCUMENTS_TAG, DOCUMENT_STATS_TAG]);
    await revalidateTag(DOCUMENTS_TAG);
    await revalidateTag(DOCUMENT_STATS_TAG);
    return { success: true, data: document, message: 'Document uploaded successfully.' };
  } catch (error) {
    console.error('Unexpected error in uploadDocumentAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.'
    };
  }
}

// Create a signing request for a document
export async function createSigningRequestAction(
  formData: FormData
): Promise<ActionResult<{ signing_url?: string; envelope_id?: string }>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to create signing requests.' };
    }

    // Validate form data
    const rawData = {
      document_id: formData.get('document_id'),
      signer_email: formData.get('signer_email'),
      signer_name: formData.get('signer_name'),
      message: formData.get('message'),
      expires_in_days: formData.get('expires_in_days') ? parseInt(formData.get('expires_in_days') as string) : undefined,
    };

    const validationResult = documentSigningSchema.safeParse(rawData);
    if (!validationResult.success) {
      const errorMessages = Object.values(validationResult.error.flatten().fieldErrors)
        .map(errors => errors?.join('. '))
        .filter(Boolean)
        .join(' ');
      return { success: false, error: errorMessages || 'Invalid form data provided.' };
    }

    const validatedData = validationResult.data;

    // Get document details
    const { data: document, error: docError } = await (supabase as any)
      .from('documents')
      .select('*')
      .eq('id', validatedData.document_id)
      .single();

    if (docError || !document) {
      return { success: false, error: 'Document not found.' };
    }

    // Check permissions (user must be property manager or admin, or document owner)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'property_manager' && profile?.role !== 'admin' && document.tenant_id !== user.id) {
      return { success: false, error: 'You do not have permission to create signing requests for this document.' };
    }

    // Download file from Supabase Storage
    const fileResponse = await fetch(document.file_url!);
    if (!fileResponse.ok) {
      return { success: false, error: 'Failed to download document file.' };
    }

    const fileBlob = await fileResponse.blob();
    const file = new File([fileBlob], `${document.title}.pdf`, { type: 'application/pdf' });

    // Upload file to Documenso to obtain documentDataId
    const uploadResult = await documensoService.uploadDocument(file);

    // Get tenant emails for lease documents
    let tenantEmails = [validatedData.signer_email];
    let tenantNames = [validatedData.signer_name];
    let tenantProfiles: { id: string; email: string | null; full_name: string | null }[] = [];

    if (document.document_type === 'lease') {
      const { data: lease } = await (supabase as any)
        .from('leases')
        .select('tenant_ids')
        .eq('document_id', document.id)
        .single();

      if (lease) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', lease.tenant_ids);

        tenantProfiles = profiles || [];
        tenantEmails = tenantProfiles.map(p => p.email || '').filter(Boolean);
        tenantNames = tenantProfiles.map(p => p.full_name || '');
      }
    }

    // Create signing request via Documenso
    const signingResult = await documensoService.createDocumentSigningEnvelope({
      title: document.title,
      documentDataId: uploadResult.documentDataId,
      recipients: tenantEmails.map((email, index) => ({
        email,
        name: tenantNames[index] || email.split('@')[0],
        role: 'SIGNER' as const,
        signingOrder: index + 1,
      })),
      message: validatedData.message,
      expiresAt: validatedData.expires_in_days
        ? new Date(Date.now() + validatedData.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    });

    if (!signingResult) {
      return { success: false, error: 'Failed to create signing request.' };
    }

    // Update document with Documenso envelope ID
    await (supabase as any)
      .from('documents')
      .update({
        documenso_envelope_id: signingResult.id,
        status: 'pending_signature'
      })
      .eq('id', document.id);

    // Create signature records with signer_id mapping
    const emailToProfileId = new Map<string, string>();
    if (tenantProfiles.length === 0) {
      // Fallback: try to resolve signer from provided email
      const { data: maybeProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', validatedData.signer_email)
        .single();
      if (maybeProfile?.id && maybeProfile.email) {
        emailToProfileId.set(maybeProfile.email, maybeProfile.id);
      }
    } else {
      for (const p of tenantProfiles) {
        if (p.email && p.id) emailToProfileId.set(p.email, p.id);
      }
    }

    for (const recipient of signingResult.recipients) {
      const signerId = emailToProfileId.get(recipient.email);
      if (!signerId) {
        continue; // skip recipients we cannot map to a user
      }
      await supabase
        .from('document_signatures')
        .insert({
          document_id: document.id,
          signer_id: signerId,
          signer_email: recipient.email,
          signer_name: recipient.name || null,
          status: 'pending',
          documenso_signature_id: recipient.id,
        });
    }

    // Log signing request creation
    await supabase.rpc('log_document_access', {
      p_document_id: document.id,
      p_action: 'signing_request_created',
      p_metadata: { envelope_id: signingResult.id, recipients: tenantEmails }
    });

    invalidateTagCache([DOCUMENTS_TAG, DOCUMENT_STATS_TAG]);
    await revalidateTag(DOCUMENTS_TAG);
    await revalidateTag(DOCUMENT_STATS_TAG);
    return {
      success: true,
      data: { envelope_id: signingResult.id },
      message: 'Signing request created successfully.'
    };
  } catch (error) {
    console.error('Unexpected error in createSigningRequestAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.'
    };
  }
}

// Sign a document (mark as signed)
export async function signDocumentAction(
  documentId: string,
  signatureData?: Record<string, any>
): Promise<ActionResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to sign documents.' };
    }

    // Get signature record
    const { data: signature, error: sigError } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('document_id', documentId)
      .eq('signer_id', user.id)
      .single();

    if (sigError || !signature) {
      return { success: false, error: 'Signature record not found.' };
    }

    // Update signature
    await supabase
      .from('document_signatures')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_data: signatureData,
      })
      .eq('id', signature.id);

    // Check if all signatures are complete
    const { data: allSignatures } = await supabase
      .from('document_signatures')
      .select('status')
      .eq('document_id', documentId);

    const allSigned = allSignatures?.every(sig => sig.status === 'signed');

    if (allSigned) {
      // Update document status
      await supabase
        .from('documents')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
        })
        .eq('id', documentId);
    }

    // Log signing action
    await supabase.rpc('log_document_access', {
      p_document_id: documentId,
      p_action: 'signed',
      p_metadata: signatureData
    });

    invalidateTagCache([DOCUMENTS_TAG, DOCUMENT_STATS_TAG]);
    await revalidateTag(DOCUMENTS_TAG);
    await revalidateTag(DOCUMENT_STATS_TAG);
    return { success: true, message: 'Document signed successfully.' };
  } catch (error) {
    console.error('Unexpected error in signDocumentAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.'
    };
  }
}

// Get Documenso signing URL for the current user for a document
export async function getSigningUrlAction(
  documentId: string
): Promise<ActionResult<{ signing_url: string }>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to sign documents.' };
    }

    // Get document with envelope id
    const { data: document } = await supabase
      .from('documents')
      .select('id, documenso_envelope_id')
      .eq('id', documentId)
      .single();

    if (!document?.documenso_envelope_id) {
      return { success: false, error: 'Signing session is not available for this document.' };
    }

    // Find the signature record for this user
    const { data: signature } = await supabase
      .from('document_signatures')
      .select('id, documenso_signature_id')
      .eq('document_id', documentId)
      .eq('signer_id', user.id)
      .single();

    if (!signature?.documenso_signature_id) {
      return { success: false, error: 'No signing request found for your account.' };
    }

    // Get signing URL from Documenso
    const url = await documensoService.getSigningUrl(
      document.documenso_envelope_id,
      signature.documenso_signature_id
    );

    return { success: true, data: { signing_url: url } };
  } catch (error) {
    console.error('Unexpected error in getSigningUrlAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.'
    };
  }
}

// Get document statistics
export async function getDocumentStatsAction(): Promise<ActionResult<DocumentStats>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'You must be logged in to view document statistics.' };
    }

    // Get stats based on user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase.from('documents').select('status');

    // If not admin/property manager, filter by tenant_id
    if (profile?.role !== 'property_manager' && profile?.role !== 'admin') {
      query = query.eq('tenant_id', user.id);
    }

    const cacheKey = `document-stats:${user.id}`;
    const { data: stats } = await fetchWithTagCache<DocumentStats>(
      cacheKey,
      [DOCUMENT_STATS_TAG, `${DOCUMENT_STATS_TAG}:${user.id}`],
      async () => {
        const { data: documents, error } = await query;

        if (error) {
          console.error('Error fetching document stats:', error);
          throw new Error('Failed to fetch document statistics.');
        }

        return {
          total_documents: documents?.length || 0,
          pending_signatures: documents?.filter(d => d.status === 'pending_signature').length || 0,
          signed_documents: documents?.filter(d => d.status === 'signed').length || 0,
          expired_documents: documents?.filter(d => d.status === 'expired').length || 0,
          draft_documents: documents?.filter(d => d.status === 'draft').length || 0,
        } satisfies DocumentStats;
      }
    );

    return { success: true, data: stats };
  } catch (error) {
    if (error instanceof Error && error.message === 'Failed to fetch document statistics.') {
      return { success: false, error: error.message };
    }
    console.error('Unexpected error in getDocumentStatsAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred.'
    };
  }
}
