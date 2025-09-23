#!/usr/bin/env node
import { performance } from "node:perf_hooks"

function generateNotifications(count) {
  const now = Date.now()
  return Array.from({ length: count }, (_, index) => ({
    id: `notif-${index}`,
    title: `Notification ${index}`,
    message: `Body for notification ${index} with enough text to simulate a realistic payload chunk ${index % 5}`,
    type: index % 4 === 0 ? "success" : index % 4 === 1 ? "warning" : index % 4 === 2 ? "error" : "info",
    read: index % 3 === 0,
    created_at: new Date(now - index * 60_000).toISOString(),
  }))
}

function generateDocuments(count) {
  const now = Date.now()
  return Array.from({ length: count }, (_, index) => ({
    id: `doc-${index}`,
    title: `Lease agreement ${index}`,
    description: `Comprehensive lease description with clauses ${(index % 7) + 1}.`,
    document_type: index % 2 === 0 ? "lease" : "addendum",
    status: index % 5 === 0 ? "signed" : index % 5 === 1 ? "pending_signature" : "draft",
    created_at: new Date(now - index * 3600_000).toISOString(),
    requires_signature: index % 2 === 0,
    lease: {
      id: `lease-${index}`,
      tenant_ids: Array.from({ length: (index % 4) + 1 }, (_, tenantIndex) => `tenant-${tenantIndex}`),
      start_date: new Date(now - 86_400_000 * 90).toISOString(),
      end_date: new Date(now + 86_400_000 * 275).toISOString(),
    },
    signatures: Array.from({ length: (index % 3) + 1 }, (_, signatureIndex) => ({
      id: `signature-${index}-${signatureIndex}`,
      signer_id: `user-${signatureIndex}`,
      status: signatureIndex % 2 === 0 ? "signed" : "pending",
    })),
    access_logs: Array.from({ length: 2 }, (_, logIndex) => ({
      id: `log-${index}-${logIndex}`,
      action: "view",
      user_id: `user-${logIndex}`,
      created_at: new Date(now - logIndex * 6_000).toISOString(),
    })),
  }))
}

function buildJsonPayload({ items, metadata }) {
  return JSON.stringify({ data: items, meta: metadata })
}

function buildNdjsonPayload({ items, metadata, itemType }) {
  const lines = [
    JSON.stringify({ type: "meta", meta: metadata }),
    ...items.map((item) => JSON.stringify({ type: itemType, data: item })),
    JSON.stringify({ type: "end" }),
  ]
  return `${lines.join("\n")}\n`
}

function processNdjson({ payload, itemType }) {
  const CHUNK_SIZE = 16_384
  let buffer = ""
  let processedItems = 0
  let firstItemTimestamp = null

  const start = performance.now()

  for (let offset = 0; offset < payload.length; offset += CHUNK_SIZE) {
    const chunk = payload.slice(offset, offset + CHUNK_SIZE)
    buffer += chunk

    let newlineIndex = buffer.indexOf("\n")
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      if (line) {
        const parsed = JSON.parse(line)
        if (parsed.type === itemType) {
          processedItems += 1
          if (firstItemTimestamp === null) {
            firstItemTimestamp = performance.now()
          }
        }
      }
      newlineIndex = buffer.indexOf("\n")
    }
  }

  if (buffer.trim()) {
    const parsed = JSON.parse(buffer.trim())
    if (parsed.type === itemType) {
      processedItems += 1
      if (firstItemTimestamp === null) {
        firstItemTimestamp = performance.now()
      }
    }
  }

  const totalDuration = performance.now() - start
  const firstItemLatency = firstItemTimestamp ? firstItemTimestamp - start : totalDuration

  return { totalDuration, firstItemLatency, processedItems }
}

function benchmark({ label, items, metadata, itemType }) {
  const jsonPayload = buildJsonPayload({ items, metadata })
  const ndjsonPayload = buildNdjsonPayload({ items, metadata, itemType })

  const jsonStart = performance.now()
  JSON.parse(jsonPayload)
  const jsonDuration = performance.now() - jsonStart

  const ndjsonMetrics = processNdjson({ payload: ndjsonPayload, itemType })

  const jsonSizeKb = Buffer.byteLength(jsonPayload, "utf8") / 1024
  const ndjsonSizeKb = Buffer.byteLength(ndjsonPayload, "utf8") / 1024

  return {
    label,
    count: items.length,
    jsonDuration: Number(jsonDuration.toFixed(2)),
    ndjsonDuration: Number(ndjsonMetrics.totalDuration.toFixed(2)),
    firstItemLatency: Number(ndjsonMetrics.firstItemLatency.toFixed(2)),
    jsonSizeKb: Number(jsonSizeKb.toFixed(1)),
    ndjsonSizeKb: Number(ndjsonSizeKb.toFixed(1)),
  }
}

function runBenchmarks() {
  const notifications = generateNotifications(1500)
  const notificationMetadata = {
    pagination: {
      page: 1,
      limit: 1500,
      total: 1500,
      hasMore: false,
    },
    filters: {
      startDate: notifications[notifications.length - 1]?.created_at ?? new Date().toISOString(),
      endDate: notifications[0]?.created_at ?? new Date().toISOString(),
    },
  }

  const documents = generateDocuments(500)
  const documentMetadata = {
    count: documents.length,
    filters: {
      status: ["draft", "pending_signature", "signed"],
    },
  }

  const notificationMetrics = benchmark({
    label: "Notifications",
    items: notifications,
    metadata: notificationMetadata,
    itemType: "notification",
  })

  const documentMetrics = benchmark({
    label: "Documents",
    items: documents,
    metadata: documentMetadata,
    itemType: "document",
  })

  console.table([notificationMetrics, documentMetrics])
}

runBenchmarks()
