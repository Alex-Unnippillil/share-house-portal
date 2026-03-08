'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { createClient } from '@/utils/supa-server-actions'

export type ExportActionState = {
  status: 'idle' | 'success' | 'error'
  message: string | null
  downloadUrl: string | null
}

export const initialExportState: ExportActionState = {
  status: 'idle',
  message: null,
  downloadUrl: null,
}

export type DeletionActionState = {
  status: 'idle' | 'success' | 'error'
  message: string | null
}

export const initialDeletionState: DeletionActionState = {
  status: 'idle',
  message: null,
}

function parseCheckboxValue(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'on' || normalized === 'yes'
}

export async function requestPrivacyExport(
  _prevState: ExportActionState,
  formData: FormData,
): Promise<ExportActionState> {
  const includeDocuments = parseCheckboxValue(formData.get('includeDocuments'))
  const includeMessages = parseCheckboxValue(formData.get('includeMessages'))
  const includeRequests = parseCheckboxValue(formData.get('includeRequests'))

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: authData, error: userError } = await supabase.auth.getUser()
  const user = authData?.user

  if (userError || !user) {
    return {
      status: 'error',
      message: 'You must be signed in to request a data export.',
      downloadUrl: null,
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-privacy-export', {
      body: {
        user_id: user.id,
        options: {
          include_documents: includeDocuments,
          include_messages: includeMessages,
          include_requests: includeRequests,
        },
      },
    })

    if (error) {
      return {
        status: 'error',
        message: error.message ?? 'We could not start your export. Please try again.',
        downloadUrl: null,
      }
    }

    await revalidatePath('/privacy/dashboard')

    const downloadUrl =
      typeof data?.downloadUrl === 'string'
        ? data.downloadUrl
        : typeof data?.download_url === 'string'
          ? data.download_url
          : null

    const message =
      typeof data?.message === 'string'
        ? data.message
        : "We're compiling your archive. We'll email you when it's ready."

    return {
      status: 'success',
      message,
      downloadUrl,
    }
  } catch (_error) {
    return {
      status: 'error',
      message: 'We could not start your export. Please try again.',
      downloadUrl: null,
    }
  }
}

export async function submitDeletionRequest(
  _prevState: DeletionActionState,
  formData: FormData,
): Promise<DeletionActionState> {
  const confirmationValue = formData.get('confirmation')
  if (typeof confirmationValue !== 'string' || confirmationValue.trim().length === 0) {
    return {
      status: 'error',
      message: 'Please type DELETE to confirm account deletion.',
    }
  }

  const confirmation = confirmationValue.trim()

  if (confirmation.toUpperCase() !== 'DELETE') {
    return {
      status: 'error',
      message: 'Type DELETE to confirm you understand this action removes all of your data.',
    }
  }

  const reasonValue = formData.get('reason')
  let reason: string | null = null
  if (typeof reasonValue === 'string') {
    const trimmed = reasonValue.trim()
    if (trimmed.length > 0) {
      reason = trimmed.slice(0, 500)
    }
  }

  const exportBackup = parseCheckboxValue(formData.get('exportBackup'))

  const cookieStore = cookies()
  const supabase = createClient(cookieStore)
  const { data: authData, error: userError } = await supabase.auth.getUser()
  const user = authData?.user

  if (userError || !user) {
    return {
      status: 'error',
      message: 'You must be signed in to manage deletion requests.',
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke('schedule-account-deletion', {
      body: {
        user_id: user.id,
        reason,
        export_backup: exportBackup,
      },
    })

    if (error) {
      return {
        status: 'error',
        message: error.message ?? 'Unable to schedule account deletion right now.',
      }
    }

    await revalidatePath('/privacy/dashboard')

    const message =
      typeof data?.message === 'string'
        ? data.message
        : "We'll email you once your account deletion has been scheduled."

    return {
      status: 'success',
      message,
    }
  } catch (_error) {
    return {
      status: 'error',
      message: 'Unable to schedule account deletion right now.',
    }
  }
}
