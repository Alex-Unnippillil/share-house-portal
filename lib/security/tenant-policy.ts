const IPV4_BITS = 32
const IPV6_BITS = 128

function parseIpv4(ip: string): bigint | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null
  let value = 0n
  for (const part of parts) {
    if (part.length === 0) return null
    const segment = Number(part)
    if (!Number.isInteger(segment) || segment < 0 || segment > 255) return null
    value = (value << 8n) + BigInt(segment)
  }
  return value
}

function expandIpv6Parts(address: string): string[] | null {
  const hasCompression = address.includes('::')
  if (hasCompression) {
    if (address.indexOf('::') !== address.lastIndexOf('::')) return null
    const [left, right] = address.split('::')
    const leftParts = left ? left.split(':') : []
    const rightPartsRaw = right ? right.split(':') : []

    const rightParts: string[] = []
    for (const part of rightPartsRaw) {
      if (part.includes('.')) {
        const ipv4 = parseIpv4(part)
        if (ipv4 === null) return null
        rightParts.push(((ipv4 >> 16n) & 0xffffn).toString(16))
        rightParts.push((ipv4 & 0xffffn).toString(16))
      } else {
        rightParts.push(part)
      }
    }

    const missing = IPV6_BITS / 16 - (leftParts.length + rightParts.length)
    if (missing < 0) return null
    return [...leftParts, ...Array(missing).fill('0'), ...rightParts].map(part =>
      part === '' ? '0' : part
    )
  }

  const rawParts = address.split(':')
  const parts: string[] = []
  for (const part of rawParts) {
    if (part.includes('.')) {
      const ipv4 = parseIpv4(part)
      if (ipv4 === null) return null
      parts.push(((ipv4 >> 16n) & 0xffffn).toString(16))
      parts.push((ipv4 & 0xffffn).toString(16))
    } else {
      parts.push(part)
    }
  }

  if (parts.length !== IPV6_BITS / 16) return null
  return parts.map(part => (part === '' ? '0' : part))
}

function parseIpv6(ip: string): bigint | null {
  const parts = expandIpv6Parts(ip.trim().toLowerCase())
  if (!parts) return null

  let value = 0n
  for (const part of parts) {
    if (part.length > 4) return null
    const segment = parseInt(part, 16)
    if (!Number.isInteger(segment) || segment < 0 || segment > 0xffff) return null
    value = (value << 16n) + BigInt(segment)
  }
  return value
}

function parseIpAddress(ip: string): { version: 4 | 6; value: bigint } | null {
  const trimmed = ip.trim()
  if (!trimmed) return null
  if (trimmed.includes(':')) {
    const value = parseIpv6(trimmed)
    return value === null ? null : { version: 6, value }
  }
  const value = parseIpv4(trimmed)
  return value === null ? null : { version: 4, value }
}

type ParsedCidr = {
  version: 4 | 6
  network: bigint
  mask: number
  maskBits: bigint
}

function getMaskBits(version: 4 | 6, mask: number): bigint | null {
  const totalBits = version === 4 ? IPV4_BITS : IPV6_BITS
  if (mask < 0 || mask > totalBits) return null
  if (mask === 0) return 0n
  const bitLength = BigInt(mask)
  const shift = BigInt(totalBits - mask)
  const ones = (1n << bitLength) - 1n
  return ones << shift
}

function parseCidr(cidr: string): ParsedCidr | null {
  const [addressPart, maskPart] = cidr.split('/')
  if (!addressPart || !maskPart) return null
  const mask = Number.parseInt(maskPart, 10)
  if (!Number.isInteger(mask)) return null
  const parsedAddress = parseIpAddress(addressPart)
  if (!parsedAddress) return null
  const maskBits = getMaskBits(parsedAddress.version, mask)
  if (maskBits === null) return null
  const network = parsedAddress.value & maskBits
  return {
    version: parsedAddress.version,
    network,
    mask,
    maskBits,
  }
}

export function isValidCidr(cidr: string): boolean {
  return parseCidr(cidr) !== null
}

export function isIpAllowed(
  ip: string | null | undefined,
  cidrs: string[] | null | undefined
): boolean {
  if (!cidrs || cidrs.length === 0) {
    return true
  }
  if (!ip) {
    return false
  }

  const parsedIp = parseIpAddress(ip)
  if (!parsedIp) {
    return false
  }

  let hasValidEntry = false

  for (const entry of cidrs) {
    if (!entry) continue
    const parsedCidr = parseCidr(entry)
    if (!parsedCidr) continue
    hasValidEntry = true
    if (parsedCidr.version !== parsedIp.version) {
      continue
    }
    const masked = parsedIp.value & parsedCidr.maskBits
    if (masked === parsedCidr.network) {
      return true
    }
  }

  return hasValidEntry ? false : true
}

export function isSessionWithinTtl(
  lastSignInAt: string | null | undefined,
  ttlSeconds: number | null | undefined,
  now: Date = new Date()
): boolean {
  if (!ttlSeconds || ttlSeconds <= 0) {
    return true
  }
  if (!lastSignInAt) {
    return false
  }
  const last = new Date(lastSignInAt)
  if (Number.isNaN(last.getTime())) {
    return false
  }
  const elapsedMs = now.getTime() - last.getTime()
  return elapsedMs <= ttlSeconds * 1000
}

export type TenantSecurityEvaluationResult =
  | { allowed: true }
  | { allowed: false; reason: 'ip' | 'ttl' }

export function evaluateTenantSecurity(options: {
  requestIp: string | null
  allowedCidrs?: string[] | null
  sessionTtlSeconds?: number | null
  lastSignInAt?: string | null
  now?: Date
}): TenantSecurityEvaluationResult {
  const { requestIp, allowedCidrs, sessionTtlSeconds, lastSignInAt, now } = options

  if (!isIpAllowed(requestIp, allowedCidrs ?? undefined)) {
    return { allowed: false, reason: 'ip' }
  }

  if (!isSessionWithinTtl(lastSignInAt, sessionTtlSeconds, now)) {
    return { allowed: false, reason: 'ttl' }
  }

  return { allowed: true }
}

export function resolveClientIp(headers: Headers, fallbackIp?: string | null): string | null {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const forwardedCandidates = forwarded
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
    if (forwardedCandidates.length > 0) {
      return forwardedCandidates[0]
    }
  }
  const realIp = headers.get('x-real-ip')
  if (realIp) {
    const realCandidates = realIp
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
    if (realCandidates.length > 0) {
      return realCandidates[0]
    }
  }
  return fallbackIp ?? null
}

export type TenantSecurityInputs = {
  ipAllowCidrs: string[]
  sessionTtlSeconds: number | null
}
