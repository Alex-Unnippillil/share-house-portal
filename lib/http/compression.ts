import { brotliCompress, gzip } from 'node:zlib'
import { promisify } from 'node:util'

const brotliCompressAsync = promisify(brotliCompress)
const gzipCompressAsync = promisify(gzip)

export type SupportedEncoding = 'br' | 'gzip' | 'identity'

function normalizeVaryHeader(existing: string | null, value: string) {
  if (!existing) {
    return value
  }

  const values = new Set(
    existing
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  )
  values.add(value)

  return Array.from(values).join(', ')
}

async function applyCompression(
  encoding: SupportedEncoding,
  payload: Buffer
): Promise<{ encoding: SupportedEncoding; body: Buffer }> {
  switch (encoding) {
    case 'br':
      return {
        encoding,
        body: await brotliCompressAsync(payload),
      }
    case 'gzip':
      return {
        encoding,
        body: await gzipCompressAsync(payload),
      }
    default:
      return { encoding: 'identity', body: payload }
  }
}

export async function createCompressedJsonResponse(
  request: Request,
  data: unknown,
  init?: ResponseInit
): Promise<Response> {
  const rawJson = JSON.stringify(data)
  const rawBuffer = Buffer.from(rawJson)
  const acceptEncoding = request.headers.get('accept-encoding')
  const supportsBrotli = acceptEncoding?.toLowerCase().includes('br') ?? false
  const supportsGzip = acceptEncoding?.toLowerCase().includes('gzip') ?? false

  const targetEncoding: SupportedEncoding = supportsBrotli
    ? 'br'
    : supportsGzip || !acceptEncoding
      ? 'gzip'
      : 'identity'

  const { encoding, body } = await applyCompression(targetEncoding, rawBuffer)

  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set(
    'Vary',
    normalizeVaryHeader(headers.get('Vary'), 'Accept-Encoding')
  )
  headers.set('X-Original-Content-Length', String(rawBuffer.length))

  if (encoding !== 'identity') {
    headers.set('Content-Encoding', encoding)
  }

  headers.set('Content-Length', String(body.length))

  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store')
  }

  return new Response(body, {
    ...init,
    headers,
  })
}

export function selectStaticAssetEncoding(
  header: string | null
): Extract<SupportedEncoding, 'br' | 'gzip'> | null {
  if (!header) {
    return null
  }

  const lowered = header.toLowerCase()

  if (lowered.includes('br')) {
    return 'br'
  }

  if (lowered.includes('gzip')) {
    return 'gzip'
  }

  return null
}
