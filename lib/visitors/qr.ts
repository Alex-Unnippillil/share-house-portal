const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" as const
const BASE32_LOOKUP = Object.fromEntries(
  BASE32_ALPHABET.split("").map((char, index) => [char, index]),
) as Record<string, number>

const VISITOR_QR_VERSION = 1
const MAX_GUEST_NAME_LENGTH = 40

type VisitorQrWirePayload = {
  v: number
  i: string
  g: string
  ci: string
  co: string
}

export type VisitorQrData = {
  version: number
  inviteId: string
  guestName: string
  checkInDate: string
  checkOutDate: string
}

export function encodeInviteId(inviteId: string): string {
  const normalized = inviteId.replace(/-/g, "").toLowerCase()

  if (!/^[0-9a-f]{32}$/.test(normalized)) {
    throw new Error("Invalid invite ID format")
  }

  const bytes = hexToBytes(normalized)
  return base32Encode(bytes)
}

export function decodeInviteId(encoded: string): string {
  const normalized = encoded.replace(/\s+/g, "").toUpperCase()

  if (!normalized || /[^A-Z2-7]/.test(normalized)) {
    throw new Error("Invalid Base32 invite ID")
  }

  const bytes = base32Decode(normalized)

  if (bytes.length !== 16) {
    throw new Error("Invite ID must decode to 16 bytes")
  }

  const hex = bytesToHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function createVisitorQrPayload(input: {
  inviteId: string
  guestName: string
  checkInDate: Date | string
  checkOutDate: Date | string
}): string {
  const payload: VisitorQrWirePayload = {
    v: VISITOR_QR_VERSION,
    i: encodeInviteId(input.inviteId),
    g: sanitizeGuestName(input.guestName),
    ci: formatCompactDate(input.checkInDate),
    co: formatCompactDate(input.checkOutDate),
  }

  return JSON.stringify(payload)
}

export function parseVisitorQrPayload(payload: string): VisitorQrData {
  let data: unknown
  try {
    data = JSON.parse(payload)
  } catch (error) {
    throw new Error("QR payload is not valid JSON")
  }

  if (!data || typeof data !== "object") {
    throw new Error("QR payload must be an object")
  }

  const { v, i, g, ci, co } = data as Partial<VisitorQrWirePayload>

  if (typeof v !== "number" || v !== VISITOR_QR_VERSION) {
    throw new Error("Unsupported QR payload version")
  }

  if (typeof i !== "string" || !i) {
    throw new Error("QR payload missing invite identifier")
  }

  if (typeof g !== "string" || !g.trim()) {
    throw new Error("QR payload missing guest name")
  }

  if (typeof ci !== "string" || typeof co !== "string") {
    throw new Error("QR payload missing visit dates")
  }

  return {
    version: v,
    inviteId: decodeInviteId(i),
    guestName: g,
    checkInDate: parseCompactDate(ci),
    checkOutDate: parseCompactDate(co),
  }
}

function sanitizeGuestName(name: string): string {
  const normalized = name.replace(/\s+/g, " ").trim()
  if (!normalized) {
    throw new Error("Guest name is required")
  }

  return normalized.slice(0, MAX_GUEST_NAME_LENGTH)
}

function formatCompactDate(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date provided")
  }

  const iso = date.toISOString().slice(0, 10)
  return iso.replace(/-/g, "")
}

function parseCompactDate(input: string): string {
  if (!/^\d{8}$/.test(input)) {
    throw new Error("Invalid compact date value")
  }

  return `${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6)}`
}

function base32Encode(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let output = ""

  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 0b11111]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 0b11111]
  }

  return output
}

function base32Decode(input: string): Uint8Array {
  let bits = 0
  let value = 0
  const output: number[] = []

  for (const char of input) {
    const lookup = BASE32_LOOKUP[char]
    if (lookup === undefined) {
      throw new Error("Invalid character in Base32 string")
    }

    value = (value << 5) | lookup
    bits += 5

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return Uint8Array.from(output)
}

function hexToBytes(hex: string): Uint8Array {
  const output = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16)
    if (Number.isNaN(byte)) {
      throw new Error("Invalid hexadecimal value")
    }

    output[i / 2] = byte
  }
  return output
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export { VISITOR_QR_VERSION }
