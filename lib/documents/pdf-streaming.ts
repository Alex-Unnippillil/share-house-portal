export const PDF_STREAM_CHUNK_SIZE = 64 * 1024

export type ByteRange = {
  start: number
  end?: number
}

export function buildInitialRangeHeader(chunkSize: number = PDF_STREAM_CHUNK_SIZE) {
  const size = Math.max(chunkSize - 1, 0)
  return `bytes=0-${size}`
}

export function parseRangeHeader(rangeHeader: string | null): ByteRange | null {
  if (!rangeHeader) {
    return null
  }

  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/i)
  if (!match) {
    return null
  }

  const start = Number.parseInt(match[1], 10)
  const end = match[2] ? Number.parseInt(match[2], 10) : undefined

  if (Number.isNaN(start)) {
    return null
  }

  if (end !== undefined && Number.isNaN(end)) {
    return null
  }

  return { start, end }
}

export function createContentRange(
  range: ByteRange,
  totalSize: number
): { contentRange: string; contentLength: number } | null {
  if (!Number.isFinite(totalSize) || totalSize <= 0) {
    return null
  }

  const upperBound = totalSize - 1
  const safeEnd =
    typeof range.end === "number" && range.end >= range.start
      ? Math.min(range.end, upperBound)
      : upperBound

  if (range.start > safeEnd) {
    return null
  }

  const contentLength = safeEnd - range.start + 1
  if (contentLength <= 0) {
    return null
  }

  return {
    contentRange: `bytes ${range.start}-${safeEnd}/${totalSize}`,
    contentLength,
  }
}

export function isFirstPageRenderFast(
  startTime: number,
  endTime: number,
  thresholdMs = 1000
) {
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return false
  }

  return endTime - startTime <= thresholdMs
}

export function createPdfJsLoadingParams(documentId: string) {
  return {
    url: `/api/documents/${documentId}/stream`,
    rangeChunkSize: PDF_STREAM_CHUNK_SIZE,
    disableAutoFetch: true,
    withCredentials: true,
  } as const
}

export function isPartialRequest(rangeHeader: string | null) {
  return parseRangeHeader(rangeHeader) !== null
}
