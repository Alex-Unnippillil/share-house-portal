'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

import { createClient } from '@/utils/supa-server-actions'

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export async function disableAutoPay() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' as const }
  }

  const { error } = await supabase
    .from('members')
    .update({
      auto_pay_enabled: false,
      pad_status: 'not_enrolled',
      pad_mandate_id: null,
      pad_mandate_reference: null,
      pad_payment_method_id: null,
      pad_enrolled_at: null,
      pad_last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: getErrorMessage(error) }
  }

  revalidatePath('/account/billing')

  return { success: true as const }
}
