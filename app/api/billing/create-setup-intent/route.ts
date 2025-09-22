import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getStripeClient } from '@/lib/stripe'
import { createClient } from '@/utils/supa-server-actions'

const requestSchema = z.object({
  setupIntentId: z.string().optional(),
})

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error)

export async function POST(request: Request) {
  const stripe = getStripeClient()
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown = null

  try {
    body = await request.json()
  } catch (error) {
    body = {}
  }

  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { data: existingMember, error: memberFetchError } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberFetchError) {
    return NextResponse.json({ error: memberFetchError.message }, { status: 500 })
  }

  let stripeCustomerId = existingMember?.stripe_customer_id ?? null

  if (!stripeCustomerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      stripeCustomerId = customer.id
    } catch (error) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 502 })
    }
  }

  const upserted = await supabase
    .from('members')
    .upsert(
      {
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (upserted.error) {
    return NextResponse.json({ error: upserted.error.message }, { status: 500 })
  }

  let member = upserted.data

  if (parsed.data?.setupIntentId) {
    let setupIntent

    try {
      setupIntent = await stripe.setupIntents.retrieve(parsed.data.setupIntentId)
    } catch (error) {
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 502 })
    }

    if (
      setupIntent.customer &&
      typeof setupIntent.customer === 'string' &&
      member.stripe_customer_id &&
      setupIntent.customer !== member.stripe_customer_id
    ) {
      return NextResponse.json({ error: 'Setup intent does not belong to this customer.' }, { status: 403 })
    }

    if (setupIntent.status !== 'succeeded') {
      return NextResponse.json(
        {
          status: setupIntent.status,
          clientSecret: setupIntent.client_secret,
        },
        { status: 200 },
      )
    }

    const mandateId =
      typeof setupIntent.latest_mandate === 'string'
        ? setupIntent.latest_mandate
        : setupIntent.latest_mandate?.id ?? null
    let mandateReference: string | null = null

    if (mandateId) {
      try {
        const mandate = await stripe.mandates.retrieve(mandateId)
        mandateReference = mandate.payment_method_details?.acss_debit?.reference ?? null
      } catch (error) {
        return NextResponse.json({ error: getErrorMessage(error) }, { status: 502 })
      }
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id ?? null

    const updatedMember = await supabase
      .from('members')
      .update({
        pad_mandate_id: mandateId,
        pad_mandate_reference: mandateReference,
        pad_payment_method_id: paymentMethodId,
        pad_status: mandateId ? 'active' : 'pending',
        auto_pay_enabled: Boolean(mandateId),
        pad_enrolled_at: mandateId ? new Date().toISOString() : null,
        pad_last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updatedMember.error) {
      return NextResponse.json({ error: updatedMember.error.message }, { status: 500 })
    }

    member = updatedMember.data

    return NextResponse.json({
      status: member.pad_status,
      mandateId: member.pad_mandate_id,
      mandateReference: member.pad_mandate_reference,
      paymentMethodId: member.pad_payment_method_id,
    })
  }

  await supabase
    .from('members')
    .update({
      pad_status: 'pending',
      auto_pay_enabled: false,
      pad_last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  let setupIntent

  try {
    setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId ?? undefined,
      payment_method_types: ['acss_debit'],
      usage: 'off_session',
      payment_method_options: {
        acss_debit: {
          currency: 'cad',
          verification_method: 'automatic',
        },
      },
      metadata: {
        supabase_user_id: user.id,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 502 })
  }

  return NextResponse.json({
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
    customerId: stripeCustomerId,
  })
}
