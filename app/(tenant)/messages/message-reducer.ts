import type { Database, Json } from "@/lib/supabase"

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"]

export type MessageStatus = "pending" | "confirmed" | "failed"

export type AttachmentMetadata = {
  id: string
  name: string
  url?: string
  bucket?: string
  path?: string
  size?: number
  contentType?: string
}

export type MessageWithStatus = Omit<MessageRow, "attachments"> & {
  attachments: AttachmentMetadata[]
  status: MessageStatus
  clientId: string
}

export interface MessagesState {
  messages: MessageWithStatus[]
}

export const initialMessagesState: MessagesState = { messages: [] }

const FALLBACK_ID = "attachment"

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return undefined
}

const isJsonObject = (value: Json | Json[]): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export function normalizeAttachments(value: MessageRow["attachments"]): AttachmentMetadata[] {
  if (!value) {
    return []
  }

  const candidates = Array.isArray(value) ? value : [value]
  const attachments: AttachmentMetadata[] = []

  for (const candidate of candidates) {
    if (!isJsonObject(candidate)) {
      continue
    }

    const idCandidate = candidate.id
    const nameCandidate = candidate.name ?? candidate.filename

    const resolvedId = typeof idCandidate === "string" ? idCandidate : undefined
    const resolvedName = typeof nameCandidate === "string" ? nameCandidate : undefined

    if (!resolvedId && !resolvedName) {
      continue
    }

    const attachment: AttachmentMetadata = {
      id: resolvedId ?? resolvedName ?? FALLBACK_ID,
      name: resolvedName ?? resolvedId ?? FALLBACK_ID,
    }

    const urlCandidate = candidate.url ?? candidate.signedUrl
    if (typeof urlCandidate === "string") {
      attachment.url = urlCandidate
    }

    if (typeof candidate.bucket === "string") {
      attachment.bucket = candidate.bucket
    }

    const pathCandidate = candidate.path ?? candidate.filepath
    if (typeof pathCandidate === "string") {
      attachment.path = pathCandidate
    }

    const sizeCandidate = candidate.size ?? candidate.fileSize
    const parsedSize = toNumber(sizeCandidate)
    if (typeof parsedSize === "number") {
      attachment.size = parsedSize
    }

    const contentTypeCandidate =
      candidate.contentType ?? candidate.mimeType ?? candidate["content_type"]
    if (typeof contentTypeCandidate === "string") {
      attachment.contentType = contentTypeCandidate
    }

    attachments.push(attachment)
  }

  return attachments
}

export function mapRowToMessage(
  row: MessageRow,
  overrides: Partial<Pick<MessageWithStatus, "status" | "clientId">> = {}
): MessageWithStatus {
  return {
    ...row,
    attachments: normalizeAttachments(row.attachments),
    status: overrides.status ?? "confirmed",
    clientId: overrides.clientId ?? row.id,
  }
}

export function createInitialState(rows: MessageRow[]): MessagesState {
  return {
    messages: sortMessages(rows.map((row) => mapRowToMessage(row))),
  }
}

export function createOptimisticMessage(params: {
  clientId: string
  body: string
  threadId: string
  householdId: string
  authorId: string
  attachments?: AttachmentMetadata[]
  createdAt?: string
}): MessageWithStatus {
  const timestamp = params.createdAt ?? new Date().toISOString()
  const attachments = params.attachments?.map((item) => ({ ...item })) ?? []

  return {
    id: params.clientId,
    clientId: params.clientId,
    thread_id: params.threadId,
    household_id: params.householdId,
    author_id: params.authorId,
    body: params.body,
    attachments,
    created_at: timestamp,
    updated_at: timestamp,
    status: "pending",
  }
}

export type MessageAction =
  | { type: "set"; messages: MessageRow[] }
  | { type: "optimistic-add"; message: MessageWithStatus }
  | { type: "confirm"; clientId: string; message: MessageRow }
  | { type: "receive"; message: MessageRow }
  | { type: "update"; message: MessageRow }
  | { type: "fail"; clientId: string }

const toTimestamp = (value: string): number => {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function sortMessages(messages: MessageWithStatus[]): MessageWithStatus[] {
  return [...messages].sort((a, b) => {
    const diff = toTimestamp(a.created_at) - toTimestamp(b.created_at)
    if (diff !== 0) {
      return diff
    }

    return a.clientId.localeCompare(b.clientId)
  })
}

function replaceMessage(
  messages: MessageWithStatus[],
  incoming: MessageWithStatus,
  predicate: (message: MessageWithStatus) => boolean
): MessageWithStatus[] {
  const next = [...messages]
  const index = next.findIndex(predicate)

  if (index === -1) {
    next.push(incoming)
    return next
  }

  next[index] = incoming
  return next
}

export function messageReducer(
  state: MessagesState,
  action: MessageAction
): MessagesState {
  switch (action.type) {
    case "set":
      return createInitialState(action.messages)
    case "optimistic-add": {
      const next = state.messages.filter((message) => message.clientId !== action.message.clientId)
      next.push(action.message)
      return { messages: sortMessages(next) }
    }
    case "confirm": {
      const confirmed = mapRowToMessage(action.message)
      const withoutPending = state.messages.filter(
        (message) => message.clientId !== action.clientId && message.id !== confirmed.id
      )
      withoutPending.push(confirmed)
      return { messages: sortMessages(withoutPending) }
    }
    case "receive": {
      const incoming = mapRowToMessage(action.message)
      const withoutDuplicateId = state.messages.filter((message) => message.id !== incoming.id)

      const pendingIndex = withoutDuplicateId.findIndex(
        (message) =>
          message.status === "pending" &&
          message.author_id === incoming.author_id &&
          message.body === incoming.body
      )

      if (pendingIndex !== -1) {
        withoutDuplicateId.splice(pendingIndex, 1)
      }

      withoutDuplicateId.push(incoming)
      return { messages: sortMessages(withoutDuplicateId) }
    }
    case "update": {
      const incoming = mapRowToMessage(action.message)
      const next = replaceMessage(
        state.messages,
        incoming,
        (message) => message.id === incoming.id
      )
      return { messages: sortMessages(next) }
    }
    case "fail": {
      const next = state.messages.map((message) =>
        message.clientId === action.clientId
          ? { ...message, status: "failed" as MessageStatus }
          : message
      )
      return { messages: next }
    }
    default:
      return state
  }
}
