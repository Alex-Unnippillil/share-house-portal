export type StreamMetrics = {
  totalMs: number
  firstChunkMs: number | null
  itemCount: number
  fallback: "ndjson" | "json" | "text"
}

type StreamHandlers<TMeta, TItem> = {
  response: Response
  itemType: string
  onMeta?: (meta: TMeta) => void
  onItem?: (item: TItem) => void
}

function now() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now()
  }
  return Date.now()
}

export async function readStreamedResponse<TMeta, TItem>({
  response,
  itemType,
  onMeta,
  onItem,
}: StreamHandlers<TMeta, TItem>) {
  const metrics: StreamMetrics = {
    totalMs: 0,
    firstChunkMs: null,
    itemCount: 0,
    fallback: "ndjson",
  }

  const start = now()
  const items: TItem[] = []
  let meta: TMeta | undefined

  const finalize = () => {
    metrics.totalMs = now() - start
    return { meta, items, metrics }
  }

  const processLine = (line: string) => {
    if (!line) return

    try {
      const payload = JSON.parse(line) as
        | { type: string; meta?: TMeta; data?: TItem }
        | undefined

      if (!payload || typeof payload !== "object" || !("type" in payload)) {
        return
      }

      if (payload.type === "meta" && "meta" in payload) {
        meta = payload.meta as TMeta
        onMeta?.(meta)
        return
      }

      if (payload.type === itemType && "data" in payload) {
        const item = payload.data as TItem
        metrics.itemCount += 1
        items.push(item)
        onItem?.(item)
        return
      }
    } catch (error) {
      console.warn("Failed to parse stream line", error)
    }
  }

  const contentType = response.headers.get("content-type") ?? ""

  if (!contentType.includes("application/x-ndjson") || !response.body) {
    metrics.fallback = contentType.includes("application/json") ? "json" : "text"

    try {
      const payload = await response.clone().json()
      if (payload && typeof payload === "object") {
        if ("meta" in payload) {
          meta = payload.meta as TMeta
          onMeta?.(meta)
        }
        const dataField =
          "data" in payload && Array.isArray((payload as Record<string, unknown>).data)
            ? ((payload as { data: TItem[] }).data)
            : "items" in payload && Array.isArray((payload as Record<string, unknown>).items)
            ? ((payload as { items: TItem[] }).items)
            : []

        for (const item of dataField) {
          metrics.itemCount += 1
          items.push(item)
          onItem?.(item)
        }
      }
      return finalize()
    } catch {
      const text = await response.text()
      const lines = text.split("\n")
      for (const line of lines) {
        processLine(line.trim())
      }
      return finalize()
    }
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    if (metrics.firstChunkMs === null) {
      metrics.firstChunkMs = now() - start
    }

    let newlineIndex = buffer.indexOf("\n")
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      if (line) {
        processLine(line)
      }
      newlineIndex = buffer.indexOf("\n")
    }
  }

  const remainder = buffer + decoder.decode()
  const remainingLines = remainder.split("\n")
  for (const line of remainingLines) {
    const trimmed = line.trim()
    if (trimmed) {
      processLine(trimmed)
    }
  }

  return finalize()
}
