'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { isValidCidr } from '@/lib/security/tenant-policy'
import { createSupbaseServerClient } from '@/utils/supaone'

export type SecurityFormState = {
  status: 'idle' | 'success' | 'error'
  message: string | null
  errors?: {
    ipAllowCidrs?: string[]
    sessionTtlMinutes?: string[]
  }
}

export const initialSecurityFormState: SecurityFormState = {
  status: 'idle',
  message: null,
}

const cidrListSchema = z
  .array(z.string())
  .max(50, { message: 'Limit allowlists to 50 CIDR ranges.' })
  .superRefine((cidrs, ctx) => {
    for (const cidr of cidrs) {
      if (!isValidCidr(cidr)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid CIDR: ${cidr}`,
        })
      }
    }
  })

const ttlSchema = z
  .number({ invalid_type_error: 'Session TTL must be a positive number of minutes.' })
  .int('Session TTL must be a whole number of minutes.')
  .min(5, 'Session TTL must be at least 5 minutes when specified.')
  .max(10080, 'Session TTL cannot exceed 7 days (10080 minutes).')

export async function updateTenantSecuritySettings(
  _prev: SecurityFormState,
  formData: FormData
): Promise<SecurityFormState> {
  const rawCidrs = formData.get('ipAllowCidrs')
  const rawTtl = formData.get('sessionTtlMinutes')

  const cidrCandidates = typeof rawCidrs === 'string' ? rawCidrs : ''
  const cidrs = cidrCandidates
    .split(/\r?\n|,/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0)

  const ttlInput = typeof rawTtl === 'string' ? rawTtl.trim() : ''

  const validationResult = cidrListSchema.safeParse(cidrs)
  if (!validationResult.success) {
    return {
      status: 'error',
      message: 'Review the highlighted CIDR ranges and try again.',
      errors: {
        ipAllowCidrs: validationResult.error.errors.map(issue => issue.message),
      },
    }
  }

  let sessionTtlMinutes: number | null = null
  if (ttlInput.length > 0) {
    const parsed = Number(ttlInput)
    const ttlResult = ttlSchema.safeParse(parsed)
    if (!ttlResult.success) {
      return {
        status: 'error',
        message: 'Session TTL must be a whole number of minutes between 5 and 10080.',
        errors: {
          sessionTtlMinutes: ttlResult.error.errors.map(issue => issue.message),
        },
      }
    }
    sessionTtlMinutes = ttlResult.data
  }

  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      status: 'error',
      message: 'You must be signed in to update security settings.',
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ip_allow_cidrs: validationResult.data,
      session_ttl_seconds: sessionTtlMinutes ? sessionTtlMinutes * 60 : null,
    })
    .eq('id', user.id)

  if (error) {
    console.error('Failed to update tenant security settings', error)
    return {
      status: 'error',
      message: 'Unable to update security settings. Please try again shortly.',
    }
  }

  revalidatePath('/dashboard/security')

  return {
    status: 'success',
    message: 'Security settings updated successfully.',
  }
}
