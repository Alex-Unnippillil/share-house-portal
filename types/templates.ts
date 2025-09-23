import type { Database } from '@/lib/supabase'

export type TemplateRecord = Database['public']['Tables']['templates']['Row']
export type TemplateContext = TemplateRecord['context']

export type TemplatePrefillValues = Record<string, unknown>

export type TemplateSelectionSource = 'auto' | 'manual'

export interface TemplateSelectionMeta {
  source: TemplateSelectionSource
}
