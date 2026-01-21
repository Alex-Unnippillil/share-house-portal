import type { TemplateContext, TemplateRecord, TemplatePrefillValues } from '@/types/templates'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const STORAGE_KEY_PREFIX = 'roomsily:last-template:'

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage) {
    return storage
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }

  return null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMergeRecords<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
): T {
  const next: Record<string, unknown> = { ...target }

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      next[key] = value.slice()
      continue
    }

    if (isPlainObject(value)) {
      const current = next[key]
      if (isPlainObject(current)) {
        next[key] = deepMergeRecords(current, value)
      } else {
        next[key] = deepMergeRecords({}, value)
      }
      continue
    }

    next[key] = value
  }

  return next as T
}

export function extractTemplatePrefill(template: TemplateRecord): TemplatePrefillValues {
  const values = template.form_values

  if (!isPlainObject(values)) {
    return {}
  }

  return values
}

export function applyTemplatePrefill<FormState extends Record<string, unknown>>(
  formState: FormState,
  template: TemplateRecord,
  options: { allowedKeys?: readonly (keyof FormState & string)[] } = {},
): FormState {
  const templateValues = extractTemplatePrefill(template)
  const { allowedKeys } = options

  const filteredEntries = allowedKeys
    ? Object.entries(templateValues).filter(([key]) =>
        allowedKeys.includes(key as keyof FormState & string),
      )
    : Object.entries(templateValues)

  if (!filteredEntries.length) {
    return formState
  }

  const filteredValues = Object.fromEntries(filteredEntries)

  return deepMergeRecords(formState, filteredValues as Record<string, unknown>)
}

export function getTemplateStorageKey(context: TemplateContext): string {
  return `${STORAGE_KEY_PREFIX}${context}`
}

export function loadLastTemplateChoice(
  context: TemplateContext,
  storage?: StorageLike | null,
): string | null {
  const resolved = resolveStorage(storage)
  if (!resolved) {
    return null
  }

  const value = resolved.getItem(getTemplateStorageKey(context))
  return value || null
}

export function saveLastTemplateChoice(
  context: TemplateContext,
  templateId: string | null,
  storage?: StorageLike | null,
): void {
  const resolved = resolveStorage(storage)
  if (!resolved) {
    return
  }

  const key = getTemplateStorageKey(context)

  if (!templateId) {
    resolved.removeItem(key)
    return
  }

  resolved.setItem(key, templateId)
}

export function clearLastTemplateChoice(
  context: TemplateContext,
  storage?: StorageLike | null,
): void {
  const resolved = resolveStorage(storage)
  if (!resolved) {
    return
  }

  resolved.removeItem(getTemplateStorageKey(context))
}

export type { StorageLike }
