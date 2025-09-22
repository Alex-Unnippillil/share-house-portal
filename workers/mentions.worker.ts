/// <reference lib="webworker" />

import type {
  MentionDirectoryEntry,
  MentionSuggestion,
  MentionsWorkerRequest,
  MentionsWorkerResponse,
} from "../types/mentions"

type InternalMentionEntry = MentionDirectoryEntry & {
  tokens: string[]
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

let mentionDirectory: InternalMentionEntry[] = []
let defaultSuggestions: MentionSuggestion[] = []

const sanitizeForWorker = (value: string) => value.replace(/[\u0000-\u001F\u007F<>]/g, "").trim()

const normalize = (value: string) =>
  sanitizeForWorker(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim()

const computeFuzzyScore = (value: string, query: string): number => {
  if (!value || !query) {
    return 0
  }

  if (value === query) {
    return 320
  }

  if (value.startsWith(query)) {
    return 260 - value.length
  }

  const directMatchIndex = value.indexOf(query)
  if (directMatchIndex !== -1) {
    return 200 - directMatchIndex * 4
  }

  let score = 0
  let searchIndex = 0

  for (let i = 0; i < query.length; i += 1) {
    const char = query.charAt(i)
    const foundIndex = value.indexOf(char, searchIndex)

    if (foundIndex === -1) {
      return 0
    }

    if (foundIndex === searchIndex) {
      score += 8
    } else {
      score += Math.max(1, 5 - (foundIndex - searchIndex))
    }

    searchIndex = foundIndex + 1
  }

  return Math.max(score - Math.max(0, value.length - query.length), 1)
}

const createInternalEntry = (entry: MentionDirectoryEntry): InternalMentionEntry => {
  const sanitizedHandle = sanitizeForWorker(entry.handle)
  const sanitizedName = sanitizeForWorker(entry.name)
  const sanitizedRole = entry.role ? sanitizeForWorker(entry.role) : undefined

  const tokens = [normalize(sanitizedHandle), normalize(sanitizedName)]
  if (sanitizedRole) {
    tokens.push(normalize(sanitizedRole))
  }

  return {
    ...entry,
    handle: sanitizedHandle,
    name: sanitizedName,
    role: sanitizedRole,
    tokens,
  }
}

const handleInit = (payload: MentionDirectoryEntry[]) => {
  mentionDirectory = payload.map(createInternalEntry)
  defaultSuggestions = mentionDirectory
    .slice()
    .sort((a, b) => a.handle.localeCompare(b.handle))
    .slice(0, 5)
    .map<MentionSuggestion>((entry) => ({
      id: entry.id,
      handle: entry.handle,
      name: entry.name,
      role: entry.role,
      score: 1,
    }))
}

const handleSearch = (payload: { id: number; query: string }) => {
  const requestId = payload.id
  const queryFromMessage = sanitizeForWorker(payload.query).replace(/^@+/, "")
  const normalizedQuery = normalize(queryFromMessage)

  if (!normalizedQuery) {
    const response: MentionsWorkerResponse = {
      type: "results",
      payload: {
        id: requestId,
        query: normalizedQuery,
        results: defaultSuggestions.slice(),
        duration: 0,
      },
    }

    ctx.postMessage(response)
    return
  }

  const startTime = performance.now()

  const scoredResults = mentionDirectory
    .map((entry) => {
      const [handleToken, nameToken, roleToken] = entry.tokens
      const handleScore = computeFuzzyScore(handleToken ?? "", normalizedQuery) * 1.6
      const nameScore = computeFuzzyScore(nameToken ?? "", normalizedQuery) * 1.1
      const roleScore = roleToken ? computeFuzzyScore(roleToken, normalizedQuery) * 0.6 : 0
      const score = handleScore + nameScore + roleScore

      return {
        entry,
        score,
      }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score === a.score) {
        return a.entry.handle.localeCompare(b.entry.handle)
      }

      return b.score - a.score
    })
    .slice(0, 5)

  const duration = performance.now() - startTime

  const response: MentionsWorkerResponse = {
    type: "results",
    payload: {
      id: requestId,
      query: normalizedQuery,
      results: scoredResults.map<MentionSuggestion>(({ entry, score }) => ({
        id: entry.id,
        handle: entry.handle,
        name: entry.name,
        role: entry.role,
        score: Number(score.toFixed(2)),
      })),
      duration: Number(duration.toFixed(3)),
    },
  }

  ctx.postMessage(response)
}

ctx.onmessage = (event: MessageEvent<MentionsWorkerRequest>) => {
  const message = event.data

  if (message.type === "init") {
    handleInit(message.payload)
    return
  }

  if (message.type === "search") {
    handleSearch(message.payload)
  }
}

export {}
