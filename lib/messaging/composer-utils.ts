import type { MentionSuggestion, MentionTrigger, StoredMention } from './types'

export interface MentionTriggerState {
  trigger: MentionTrigger
  start: number
  end: number
  query: string
}

const WORD_BREAK_REGEX = /[\s.,;!?()\[\]{}<>"'`]/
const EMAIL_PREFIX_REGEX = /[A-Za-z0-9._%+-]/

export function findActiveMentionTrigger(
  value: string,
  caret: number,
): MentionTriggerState | null {
  if (caret === 0) {
    return null
  }

  let index = caret - 1
  while (index >= 0) {
    const char = value[index]
    if (char === '@' || char === '#') {
      const prev = index > 0 ? value[index - 1] : undefined
      if (prev && !WORD_BREAK_REGEX.test(prev) && EMAIL_PREFIX_REGEX.test(prev)) {
        return null
      }

      const query = value.slice(index + 1, caret)
      if (query.includes('\n')) {
        return null
      }

      if (query.length === 0) {
        return { trigger: char, start: index, end: caret, query: '' }
      }

      if (WORD_BREAK_REGEX.test(query[query.length - 1])) {
        return null
      }

      return { trigger: char, start: index, end: caret, query }
    }

    if (WORD_BREAK_REGEX.test(char)) {
      break
    }

    index -= 1
  }

  return null
}

export function insertMentionToken(
  value: string,
  triggerState: MentionTriggerState,
  suggestion: MentionSuggestion,
): { value: string; caret: number } {
  const prefix = value.slice(0, triggerState.start)
  const suffix = value.slice(triggerState.end)
  const mentionText = `${suggestion.trigger}${suggestion.label}`

  let nextValue = `${prefix}${mentionText}`
  let nextCaret = nextValue.length

  const needsSpace = suffix.length === 0 || !/^\s/.test(suffix)
  if (needsSpace) {
    nextValue = `${nextValue} `
    nextCaret = nextValue.length
  }

  nextValue = `${nextValue}${suffix}`

  return { value: nextValue, caret: nextCaret }
}

export function pruneMissingMentions(
  value: string,
  mentions: StoredMention[],
): StoredMention[] {
  const ordered = [...mentions].sort((a, b) => a.order - b.order)
  const next: StoredMention[] = []
  let cursor = 0

  for (const mention of ordered) {
    const searchText = `${mention.trigger}${mention.label}`
    const index = value.indexOf(searchText, cursor)
    if (index !== -1) {
      next.push({ ...mention, order: next.length })
      cursor = index + searchText.length
    }
  }

  return next
}
