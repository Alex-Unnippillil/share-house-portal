import { describe, expect, it } from 'vitest'

import { applyTemplatePrefill, clearLastTemplateChoice, loadLastTemplateChoice, saveLastTemplateChoice } from '@/lib/templates'
import type { TemplateRecord } from '@/types/templates'

type DocumentFormState = {
  title: string
  description: string
  document_type: string
  tenant_id: string
  unit_id: string
  requires_signature: boolean
  expires_at: string
  emergency_contact: {
    name: string
    phone: string
  }
}

const baseTemplate: TemplateRecord = {
  id: 'template-123',
  name: 'Lease starter',
  description: 'Prefills standard lease metadata',
  category: 'lease',
  context: 'document',
  form_values: {
    title: 'Lease agreement - Unit 2B',
    requires_signature: true,
    emergency_contact: {
      name: 'Jamie Lee',
    },
  },
  is_curated: true,
  metadata: null,
  created_at: null,
  updated_at: null,
}

describe('template helpers', () => {
  it('prefills form state while preserving untouched fields', () => {
    const initialForm: DocumentFormState = {
      title: 'Original title',
      description: 'Existing description',
      document_type: 'other',
      tenant_id: '',
      unit_id: '',
      requires_signature: false,
      expires_at: '',
      emergency_contact: {
        name: '',
        phone: '',
      },
    }

    const result = applyTemplatePrefill(initialForm, baseTemplate, {
      allowedKeys: [
        'title',
        'requires_signature',
        'emergency_contact',
      ],
    })

    expect(result).not.toBe(initialForm)
    expect(result.title).toBe('Lease agreement - Unit 2B')
    expect(result.description).toBe('Existing description')
    expect(result.requires_signature).toBe(true)
    expect(result.emergency_contact).toEqual({ name: 'Jamie Lee', phone: '' })
  })

  it('ignores non-whitelisted template values', () => {
    const templateWithExtra: TemplateRecord = {
      ...baseTemplate,
      id: 'template-extra',
      form_values: {
        ...baseTemplate.form_values,
        document_type: 'lease',
        unexpected_field: 'ignore-me',
      },
    }

    const initialForm: DocumentFormState = {
      title: '',
      description: '',
      document_type: 'other',
      tenant_id: '',
      unit_id: '',
      requires_signature: false,
      expires_at: '',
      emergency_contact: {
        name: '',
        phone: '',
      },
    }

    const result = applyTemplatePrefill(initialForm, templateWithExtra, {
      allowedKeys: ['title'],
    })

    expect(result.title).toBe('Lease agreement - Unit 2B')
    expect(result.document_type).toBe('other')
    expect((result as any).unexpected_field).toBeUndefined()
  })

  it("persists the user's last selected template", () => {
    const storage = createMemoryStorage()

    expect(loadLastTemplateChoice('document', storage)).toBeNull()
    saveLastTemplateChoice('document', 'template-xyz', storage)
    expect(loadLastTemplateChoice('document', storage)).toBe('template-xyz')

    clearLastTemplateChoice('document', storage)
    expect(loadLastTemplateChoice('document', storage)).toBeNull()
  })
})

function createMemoryStorage() {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}
