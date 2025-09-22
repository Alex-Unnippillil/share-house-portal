import { describe, expect, it } from "vitest"

import {
  PDF_STREAM_CHUNK_SIZE,
  createContentRange,
  createPdfJsLoadingParams,
  isFirstPageRenderFast,
  parseRangeHeader,
} from "@/lib/documents/pdf-streaming"

describe("pdf streaming helpers", () => {
  it("flags first page renders under one second as fast", () => {
    expect(isFirstPageRenderFast(0, 900)).toBe(true)
    expect(isFirstPageRenderFast(100, 1200)).toBe(false)
  })

  it("configures PDF.js to request partial content", () => {
    const params = createPdfJsLoadingParams("doc-123")
    expect(params.url).toBe("/api/documents/doc-123/stream")
    expect(params.rangeChunkSize).toBe(PDF_STREAM_CHUNK_SIZE)
    expect(params.disableAutoFetch).toBe(true)
  })

  it("parses range headers for partial content", () => {
    expect(parseRangeHeader("bytes=0-1023")).toEqual({ start: 0, end: 1023 })
    expect(parseRangeHeader("bytes=500-")).toEqual({ start: 500, end: undefined })
    expect(parseRangeHeader("invalid")).toBeNull()
  })

  it("derives content-range metadata for partial responses", () => {
    const range = { start: 0, end: 1023 }
    const details = createContentRange(range, 8192)
    expect(details).toEqual({ contentRange: "bytes 0-1023/8192", contentLength: 1024 })
    expect(createContentRange({ start: 9000, end: 9100 }, 8192)).toBeNull()
  })
})
