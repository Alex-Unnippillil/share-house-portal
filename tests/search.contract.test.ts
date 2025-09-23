import { beforeEach, describe, expect, it } from "vitest"

import {
  ingestTopEntities,
  searchPortal,
  type SearchEntity,
} from "@/lib/search/client"

const sampleEntities: SearchEntity[] = [
  {
    id: "lease-master",
    scope: "documents",
    title: "Master Lease Agreement",
    description: "Primary lease for Unit 3B",
    content: "Lease agreement covering responsibilities, rent schedule, and renewal terms.",
    type: "document",
    priority: 10,
    keywords: ["lease", "agreement", "unit", "renewal"],
    synonyms: ["rental contract", "tenancy agreement"],
    facets: {
      status: "signed",
      type: "lease",
    },
  },
  {
    id: "maintenance-log",
    scope: "documents",
    title: "Maintenance Log",
    description: "Quarterly maintenance updates",
    content: "Maintenance checklist with HVAC filter replacements and safety inspections.",
    type: "document",
    priority: 6,
    keywords: ["maintenance", "safety", "inspection"],
    synonyms: ["upkeep", "service record"],
    facets: {
      status: "pending_signature",
      type: "maintenance",
    },
  },
  {
    id: "insurance-proof",
    scope: "documents",
    title: "Insurance Proof",
    description: "Liability coverage confirmation",
    content: "Certificate of insurance for the shared property covering liability and contents.",
    type: "document",
    priority: 4,
    keywords: ["insurance", "coverage", "certificate"],
    synonyms: ["policy", "liability coverage"],
    facets: {
      status: "signed",
      type: "insurance",
    },
  },
  {
    id: "house-rules",
    scope: "documents",
    title: "House Rules",
    description: "Visitor and quiet hours policy",
    content: "Quiet hours run 10pm-7am. Guests must be registered if staying overnight.",
    type: "guideline",
    priority: 3,
    keywords: ["rules", "policy", "guests"],
    synonyms: ["guidelines", "quiet hours"],
    facets: {
      status: "draft",
      type: "policy",
    },
  },
]

const fuzzQueries = Array.from({ length: 100 }, (_, index) =>
  [
    "rental kontrakt",
    "rental contract",
    "service record",
    "upkeep",
    "liability",
    "quiet our",
    "guidelines",
    "policy",
  ][index % 8]
)

describe("indexed search client", () => {
  beforeEach(async () => {
    await ingestTopEntities(sampleEntities)
  })

  it("matches synonyms and phonetic variations", async () => {
    const result = await searchPortal({
      query: "rental kontrakt",
      scope: "documents",
      typoTolerance: "min",
    })

    expect(result.hits.map((hit) => hit.id)).toContain("lease-master")
  })

  it("returns facet counts aligned with filters", async () => {
    const result = await searchPortal({
      query: "maintenance",
      scope: "documents",
      typoTolerance: "min",
      filters: { status: ["pending_signature"] },
    })

    expect(result.hits.some((hit) => hit.id === "maintenance-log")).toBe(true)
    expect(result.facets.status?.pending_signature ?? 0).toBeGreaterThan(0)
  })

  it("maintains P95 latency under 150 ms across 100 queries", async () => {
    const latencies: number[] = []

    for (const query of fuzzQueries) {
      const result = await searchPortal({
        query,
        scope: "documents",
        typoTolerance: "min",
      })

      latencies.push(result.processingTimeMS)
      expect(result.hits.length).toBeGreaterThan(0)
    }

    const sorted = [...latencies].sort((a, b) => a - b)
    const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)

    expect(sorted[index]).toBeLessThanOrEqual(150)
  })
})
