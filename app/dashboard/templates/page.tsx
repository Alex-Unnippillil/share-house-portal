import { redirect } from 'next/navigation'

import { TemplateMetadataTable } from './template-metadata-table'
import { createSupbaseServerClient } from '@/utils/supaone'
import type { TemplateRecord } from '@/types/templates'

export default async function TemplatesAdminPage() {
  const supabase = await createSupbaseServerClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(`Unable to read session: ${sessionError.message}`)
  }

  if (!session?.user) {
    redirect('/auth')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(`Failed to determine user role: ${profileError.message}`)
  }

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to load templates')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Template library</h1>
        <p className="text-muted-foreground">
          Maintain curated onboarding and document templates that power prefilled forms across the
          tenant experience.
        </p>
      </div>

      <TemplateMetadataTable templates={(templates ?? []) as TemplateRecord[]} />
    </div>
  )
}
