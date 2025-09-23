import type { NavItem } from "@/types/nav"

export type VoiceIntent =
  | {
      type: "navigate"
      href: string
      label: string
      transcript: string
    }
  | {
      type: "search"
      query: string
      transcript: string
    }
  | {
      type: "unknown"
      transcript: string
    }

const DEFAULT_SYNONYMS: Record<string, string[]> = {
  "/": ["home", "start", "landing"],
  "/dashboard": ["dashboard", "overview", "home base"],
  "/payments": ["payments", "pay rent", "rent", "billing"],
  "/documents": ["documents", "docs", "agreements", "leases"],
  "/messaging": ["messaging", "messages", "chat", "inbox"],
  "/visitors": ["visitors", "guest log", "guests", "overnight visitors"],
  "/maintenance": ["maintenance", "repairs", "fix it", "work orders"],
  "/account": ["account", "profile", "settings", "my info"],
  "/contact": ["contact", "support", "help", "help center"],
}

interface PreparedNavItem {
  item: Pick<NavItem, "title" | "href">
  phrases: string[]
}

export interface MapTranscriptOptions {
  navItems?: Array<Pick<NavItem, "title" | "href">>
}

export function mapTranscriptToIntent(
  transcript: string,
  options: MapTranscriptOptions = {}
): VoiceIntent {
  const trimmed = transcript.trim()
  if (!trimmed) {
    return { type: "unknown", transcript: "" }
  }

  const searchMatch = trimmed.match(
    /^(search|find|look up|lookup)(?:\s+for)?\s+(.+)$/i
  )
  if (searchMatch && searchMatch[2]) {
    const query = searchMatch[2].trim()
    if (query.length > 0) {
      return { type: "search", query, transcript: trimmed }
    }
  }

  const navItems = prepareNavItems(options.navItems)
  const normalizedTranscript = normalize(trimmed)

  for (const prepared of navItems) {
    const href = prepared.item.href
    if (!href) {
      continue
    }

    for (const phrase of prepared.phrases) {
      if (phrase && containsPhrase(normalizedTranscript, phrase)) {
        return {
          type: "navigate",
          href,
          label: prepared.item.title,
          transcript: trimmed,
        }
      }
    }
  }

  return { type: "unknown", transcript: trimmed }
}

function prepareNavItems(
  items: Array<Pick<NavItem, "title" | "href">> | undefined
): PreparedNavItem[] {
  if (!items?.length) {
    return []
  }

  return items
    .filter((item): item is Pick<NavItem, "title" | "href"> & { href: string } =>
      Boolean(item.href)
    )
    .map((item) => {
      const phrases = new Set<string>()
      const normalizedTitle = normalize(item.title)
      if (normalizedTitle) {
        phrases.add(normalizedTitle)
      }

      const slug = normalize(item.href.replace(/\//g, " "))
      if (slug) {
        phrases.add(slug)
      }

      const defaults = DEFAULT_SYNONYMS[item.href] ?? []
      for (const synonym of defaults) {
        const normalized = normalize(synonym)
        if (normalized) {
          phrases.add(normalized)
        }
      }

      return {
        item,
        phrases: Array.from(phrases),
      }
    })
}

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function containsPhrase(text: string, phrase: string): boolean {
  if (!text || !phrase) {
    return false
  }

  if (text === phrase) {
    return true
  }

  const words = text.split(" ")
  const phraseWords = phrase.split(" ")

  if (phraseWords.length === 1) {
    return words.includes(phraseWords[0])
  }

  for (let i = 0; i <= words.length - phraseWords.length; i++) {
    let matches = true
    for (let j = 0; j < phraseWords.length; j++) {
      if (words[i + j] !== phraseWords[j]) {
        matches = false
        break
      }
    }
    if (matches) {
      return true
    }
  }

  return false
}
