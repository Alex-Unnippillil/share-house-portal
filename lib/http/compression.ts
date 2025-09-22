import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib'

export type CompressionRequest = Pick<Request, 'headers'>

type SupportedEncoding = 'br' | 'gzip'

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8'

function parseAcceptEncoding(headerValue: string | null | undefined): SupportedEncoding | null {
  if (!headerValue) {
    return null
  }

  let bestBr = -1
  let bestGzip = -1

  for (const rawPart of headerValue.split(',')) {
    const part = rawPart.trim()

    if (!part) {
      continue
    }

    const [token, ...params] = part.split(';').map(value => value.trim())

    if (!token) {
      continue
    }

    let quality = 1

    for (const param of params) {
      if (param.startsWith('q=')) {
        const value = Number.parseFloat(param.slice(2))

        if (!Number.isNaN(value)) {
          quality = value
        }
      }
    }

    if (quality <= 0) {
      continue
    }

    const normalizedToken = token.toLowerCase()

    if (normalizedToken === 'br') {
      bestBr = Math.max(bestBr, quality)
    } else if (normalizedToken === 'gzip' || normalizedToken === 'x-gzip') {
      bestGzip = Math.max(bestGzip, quality)
    } else if (normalizedToken === '*') {
      bestBr = Math.max(bestBr, quality)
      bestGzip = Math.max(bestGzip, quality)
    }
  }

  const hasBr = bestBr > -1
  const hasGzip = bestGzip > -1

  if (!hasBr && !hasGzip) {
    return null
  }

  if (hasBr && (!hasGzip || bestBr >= bestGzip)) {
    return 'br'
  }

  return 'gzip'
}

function ensureVaryAcceptEncoding(headers: Headers) {
  const existing = headers.get('Vary')

  if (existing) {
    const varyValues = existing
      .split(',')
      .map(value => value.trim().toLowerCase())

    if (!varyValues.includes('accept-encoding')) {
      headers.set('Vary', `${existing}, Accept-Encoding`)
    }
  } else {
    headers.set('Vary', 'Accept-Encoding')
  }
}

function createResponseHeaders(
  init: ResponseInit | undefined,
  contentType: string | undefined
) {
  const headers = new Headers(init?.headers)

  headers.delete('content-length')

  if (contentType && !headers.has('content-type')) {
    headers.set('Content-Type', contentType)
  }

  ensureVaryAcceptEncoding(headers)

  return headers
}

function buildCompressedResponse(
  request: CompressionRequest,
  payload: string,
  contentType: string,
  init?: ResponseInit
) {
  const headers = createResponseHeaders(init, contentType)
  const encoding = parseAcceptEncoding(request.headers.get('accept-encoding'))

  if (encoding === 'br') {
    const compressed = brotliCompressSync(Buffer.from(payload), {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: 5,
      },
    })

    headers.set('Content-Encoding', 'br')
    headers.set('Content-Length', compressed.byteLength.toString())

    return new Response(compressed, {
      ...init,
      headers,
    })
  }

  if (encoding === 'gzip') {
    const compressed = gzipSync(payload, {
      level: zlibConstants.Z_BEST_COMPRESSION,
    })

    headers.set('Content-Encoding', 'gzip')
    headers.set('Content-Length', compressed.byteLength.toString())

    return new Response(compressed, {
      ...init,
      headers,
    })
  }

  headers.delete('Content-Encoding')

  return new Response(payload, {
    ...init,
    headers,
  })
}

export function createCompressedJsonResponse(
  request: CompressionRequest,
  data: unknown,
  init?: ResponseInit
) {
  const json = JSON.stringify(data)

  return buildCompressedResponse(request, json, JSON_CONTENT_TYPE, init)
}

export function createCompressedTextResponse(
  request: CompressionRequest,
  text: string,
  init?: ResponseInit & { contentType?: string }
) {
  const contentType = init?.contentType ?? 'text/plain; charset=utf-8'
  const { contentType: _ignored, ...rest } = init ?? {}

  return buildCompressedResponse(request, text, contentType, rest)
}

export function createStreamingResponse(
  request: CompressionRequest,
  stream: ReadableStream<Uint8Array>,
  init?: ResponseInit & { contentType?: string }
) {
  const contentType = init?.contentType
  const headers = createResponseHeaders(init, contentType)

  headers.set('Content-Encoding', 'identity')

  const { contentType: _ignored, ...rest } = init ?? {}

  return new Response(stream, {
    ...rest,
    headers,
  })
}
