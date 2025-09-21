import type { Database } from '@/lib/supabase'
import { EmailTemplate } from '@/components/email-template'
import { assertTenantAccess, createSupbaseServerClient } from '@/utils/supaone'
import { Resend } from 'resend'

const STAFF_ROLES: Database['public']['Enums']['user_role'][] = [
  'platform_admin',
  'property_manager',
  'building_staff',
]

export async function POST(request: Request) {
  const buildingId = request.headers.get('x-building-id')

  if (!buildingId) {
    return Response.json(
      { error: 'Missing X-Building-Id header.' },
      { status: 400 }
    )
  }

  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    return Response.json(
      { error: 'Resend API key is not configured.' },
      { status: 500 }
    )
  }

  const supabase = createSupbaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  await assertTenantAccess(supabase, buildingId, STAFF_ROLES)

  const resend = new Resend(resendApiKey)

  try {
    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: ['delivered@resend.dev'],
      subject: `Building ${buildingId}: Hello world`,
      react: EmailTemplate({ firstName: 'John' }),
    })

    if (error) {
      if (error instanceof Error) {
        return Response.json({ error: error.message }, { status: 500 })
      }

      return Response.json({ error: String(error) }, { status: 500 })
    }

    return Response.json(data)
  } catch (error) {
    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ error: String(error) }, { status: 500 })
  }
}
