import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { EmailTemplate } from '@/components/email-template'
import type { Database } from '@/lib/supabase'
import { assertTenantAccess, createSupbaseServerClient } from '@/utils/supaone'
import { Resend } from 'resend'

const ALLOWED_ROLES: Database['public']['Enums']['user_role_type'][] = [
  'platform_admin',
  'property_manager',
  'building_staff',
]

export async function POST() {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return NextResponse.json(
      { error: 'Resend API key is not configured.' },
      { status: 500 }
    )
  }

  const headerStore = headers()
  const buildingId = headerStore.get('x-building-id') ?? headerStore.get('X-Building-Id')

  if (!buildingId) {
    return NextResponse.json(
      { error: 'X-Building-Id header is required for messaging actions.' },
      { status: 400 }
    )
  }

  const supabase = await createSupbaseServerClient()

  try {
    await assertTenantAccess(supabase, buildingId, ALLOWED_ROLES)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    return NextResponse.json({ error: message }, { status: 403 })
  }

  const resend = new Resend(resendApiKey)

  try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: 'Hello world',
      react: EmailTemplate({ firstName: 'John' }),
    })

    if (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ error: String(error) }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
