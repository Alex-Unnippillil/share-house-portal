'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { createClient } from '@/utils/supa-server-actions';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const uploadLeaseSchema = z.object({
  unit_id: z.string().min(1, 'Household is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  lease_start: z.string().optional(),
  lease_end: z.string().optional(),
  rent_amount: z.string().optional(),
  notes: z.string().optional(),
});

function normaliseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return trimmed;
}

function buildMetadata(input: { rent_amount?: string | null; notes?: string | null }) {
  const metadata: Record<string, unknown> = {};

  if (input.rent_amount && input.rent_amount.trim()) {
    const rentAmount = Number.parseFloat(input.rent_amount);
    if (Number.isFinite(rentAmount)) {
      metadata.rent_amount = rentAmount;
    }
  }

  if (input.notes && input.notes.trim()) {
    metadata.notes = input.notes.trim();
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
}

function toStringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : undefined;
}

export async function uploadHouseholdLease(formData: FormData): Promise<ActionResult> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const file = formData.get('file');

  const parsed = uploadLeaseSchema.safeParse({
    unit_id: toStringValue(formData.get('unit_id')),
    title: toStringValue(formData.get('title')),
    description: toStringValue(formData.get('description')),
    lease_start: toStringValue(formData.get('lease_start')),
    lease_end: toStringValue(formData.get('lease_end')),
    rent_amount: toStringValue(formData.get('rent_amount')),
    notes: toStringValue(formData.get('notes')),
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Invalid form data provided.';
    return { success: false, error: firstError };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Please attach a lease PDF before submitting.' };
  }

  if (file.type && file.type !== 'application/pdf') {
    return { success: false, error: 'Only PDF files are supported for leases.' };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be signed in to upload documents.' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Unable to load your profile.' };
    }

    if (profile.role !== 'admin') {
      return { success: false, error: 'Only admins can upload lease documents.' };
    }

    const unitId = parsed.data.unit_id.trim();
    const filePath = `${unitId}/${randomUUID()}-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage.from('docs').upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

    if (uploadError) {
      console.error('Error uploading lease PDF', uploadError);
      return { success: false, error: 'Uploading the lease PDF failed. Please try again.' };
    }

    const leaseStart = normaliseDate(parsed.data.lease_start);
    const leaseEnd = normaliseDate(parsed.data.lease_end);
    const metadata = buildMetadata({
      rent_amount: parsed.data.rent_amount,
      notes: parsed.data.notes,
    });

    const { error: insertError } = await supabase.from('household_documents').insert({
      unit_id: unitId,
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      file_name: file.name,
      file_path: filePath,
      lease_start: leaseStart,
      lease_end: leaseEnd,
      metadata,
      file_size: file.size,
      content_type: 'application/pdf',
      uploaded_by: profile.id,
    });

    if (insertError) {
      console.error('Error storing lease metadata', insertError);
      await supabase.storage.from('docs').remove([filePath]);
      return { success: false, error: 'Saving lease metadata failed. The upload was cancelled.' };
    }

    revalidatePath('/documents');
    return { success: true };
  } catch (error) {
    console.error('Unexpected error uploading lease', error);
    return {
      success: false,
      error: 'An unexpected error occurred while uploading the lease. Please try again.',
    };
  }
}

export async function createLeaseDownloadLink(
  documentId: string,
): Promise<ActionResult<{ url: string }>> {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  if (!documentId) {
    return { success: false, error: 'Invalid document identifier.' };
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'You must be signed in to download documents.' };
    }

    const { data: document, error: documentError } = await supabase
      .from('household_documents')
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (documentError || !document) {
      console.error('Unable to locate household document', documentError);
      return { success: false, error: 'We could not find that document.' };
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from('docs')
      .createSignedUrl(document.file_path, 300);

    if (signedError || !signed?.signedUrl) {
      console.error('Unable to create signed lease URL', signedError);
      return { success: false, error: 'Failed to create a download link.' };
    }

    return { success: true, data: { url: signed.signedUrl } };
  } catch (error) {
    console.error('Unexpected error creating lease download link', error);
    return {
      success: false,
      error: 'Something went wrong while preparing your download.',
    };
  }
}
