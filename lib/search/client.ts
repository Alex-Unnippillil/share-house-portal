import algoliasearch, {
  type SearchClient as AlgoliaSearchClient,
  type SearchIndex,
  type SearchOptions as AlgoliaSearchOptions,
  type Synonym as AlgoliaSynonym,
} from "algoliasearch"
import { performance } from "node:perf_hooks"

export type SearchScope = "documents" | "messaging" | string

export interface SearchEntity {
  id: string
  scope: SearchScope
  title: string
  description?: string
  content: string
  type: string
  priority?: number
  keywords?: string[]
  synonyms?: string[]
  facets?: Record<string, string | number | boolean | Array<string | number | boolean>>
  updatedAt?: string | number | Date
}

export interface SearchHit {
  id: string
  scope: SearchScope
  type: string
  title: string
  description?: string
  highlights?: string[]
  facets: Record<string, string[]>
  score: number
}

export type SearchFacetCounts = Record<string, Record<string, number>>

export interface SearchRequest {
  query: string
  scope?: SearchScope
  filters?: Record<string, string[]>
  limit?: number
  typoTolerance?: "min" | "strict" | "false"
}

export interface SearchResult {
  query: string
  hits: SearchHit[]
  facets: SearchFacetCounts
  processingTimeMS: number
  appliedFilters: Record<string, string[]>
}

interface PreparedRecord {
  objectID: string
  id: string
  scope: SearchScope
  type: string
  title: string
  description?: string
  searchable: string
  keywords: string[]
  synonymTokens: string[]
  phoneticTokens: string[]
  facets: Record<string, string[]>
  priority: number
  updatedAtISO?: string
}

interface SynonymDefinition {
  objectID: string
  synonyms: string[]
}

interface SearchAdapter {
  ingest(payload: { records: PreparedRecord[]; synonyms: SynonymDefinition[] }): Promise<void>
  search(request: SearchRequest): Promise<SearchResult>
  readonly adapterId: string
}

const sanitize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const dedupe = <T>(values: T[]): T[] => Array.from(new Set(values.filter(Boolean)))

const createPhoneticToken = (value: string): string => {
  const normalized = sanitize(value)
  if (!normalized) {
    return ""
  }

  const first = normalized.charAt(0)
  const consonants = normalized
    .slice(1)
    .replace(/[aeiou\s]/g, "")
    .slice(0, 7)

  return `${first}${consonants}`
}

const extractKeywords = (entity: SearchEntity): string[] => {
  const base = [entity.title, entity.description ?? "", entity.content]
    .join(" ")
    .split(/\s+/)
    .filter((token) => token.length > 3)
  const keywords = entity.keywords ?? []
  return dedupe([...base, ...keywords])
}

const buildFacetMap = (
  facets: SearchEntity["facets"] | undefined
): Record<string, string[]> => {
  if (!facets) {
    return {}
  }

  return Object.entries(facets).reduce<Record<string, string[]>>((acc, [key, value]) => {
    const ensureArray = Array.isArray(value) ? value : [value]
    acc[key] = ensureArray.map((item) => String(item))
    return acc
  }, {})
}

const buildSynonyms = (entity: SearchEntity): string[] => {
  const explicit = entity.synonyms ?? []
  const inferred = extractKeywords(entity).map((keyword) =>
    keyword
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  )

  return dedupe([...explicit, ...inferred])
}

const prepareRecord = (entity: SearchEntity): PreparedRecord => {
  const keywords = extractKeywords(entity)
  const synonymTokens = buildSynonyms(entity)
  const phoneticTokens = dedupe(
    synonymTokens.map(createPhoneticToken).filter((token) => token.length > 1)
  )
  const facets = buildFacetMap(entity.facets)

  return {
    objectID: entity.id,
    id: entity.id,
    scope: entity.scope,
    type: entity.type,
    title: entity.title,
    description: entity.description,
    searchable: dedupe([
      entity.title,
      entity.description ?? "",
      entity.content,
      ...keywords,
      ...synonymTokens,
      ...phoneticTokens,
    ])
      .join(" ")
      .trim(),
    keywords,
    synonymTokens,
    phoneticTokens,
    facets,
    priority: entity.priority ?? 0,
    updatedAtISO:
      entity.updatedAt ? new Date(entity.updatedAt).toISOString() : undefined,
  }
}

const buildSynonymDefinitions = (
  record: PreparedRecord
): SynonymDefinition | null => {
  if (!record.synonymTokens.length) {
    return null
  }

  return {
    objectID: `synonym_${record.objectID}`,
    synonyms: record.synonymTokens,
  }
}

const levenshtein = (a: string, b: string): number => {
  if (a === b) {
    return 0
  }

  const aLen = a.length
  const bLen = b.length

  if (aLen === 0) {
    return bLen
  }

  if (bLen === 0) {
    return aLen
  }

  const matrix = Array.from({ length: aLen + 1 }, () => new Array<number>(bLen + 1))

  for (let i = 0; i <= aLen; i += 1) {
    matrix[i][0] = i
  }

  for (let j = 0; j <= bLen; j += 1) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= aLen; i += 1) {
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[aLen][bLen]
}

const isTypoMatch = (query: string, target: string, tolerance: "min" | "strict" | "false") => {
  if (tolerance === "false") {
    return sanitize(target).includes(sanitize(query))
  }

  const maxDistance = tolerance === "min" ? 2 : 1
  return levenshtein(sanitize(query), sanitize(target)) <= maxDistance
}

class InMemorySearchAdapter implements SearchAdapter {
  private records: Map<string, PreparedRecord> = new Map()

  private synonyms: Map<string, string[]> = new Map()

  public readonly adapterId = "in-memory"

  async ingest({
    records,
    synonyms,
  }: {
    records: PreparedRecord[]
    synonyms: SynonymDefinition[]
  }): Promise<void> {
    this.records.clear()
    this.synonyms.clear()

    for (const record of records) {
      this.records.set(record.objectID, record)
    }

    for (const entry of synonyms) {
      if (entry.synonyms.length > 0) {
        this.synonyms.set(entry.objectID.replace(/^synonym_/, ""), entry.synonyms)
      }
    }
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    const start = performance.now()
    const results: SearchHit[] = []
    const facetCounts: SearchFacetCounts = {}
    const { query, scope, filters = {}, limit = 10, typoTolerance = "min" } = request
    const normalizedQuery = sanitize(query)

    for (const record of this.records.values()) {
      if (scope && record.scope !== scope) {
        continue
      }

      let matches = false
      if (!normalizedQuery) {
        matches = true
      } else {
        const combinedTokens = dedupe([
          record.title,
          record.description ?? "",
          record.searchable,
          ...record.synonymTokens,
          ...record.phoneticTokens,
          ...(this.synonyms.get(record.objectID) ?? []),
        ])

        matches = combinedTokens.some((token) =>
          isTypoMatch(normalizedQuery, token, typoTolerance)
        )
      }

      if (!matches) {
        continue
      }

      const recordFacets = record.facets
      const filterKeys = Object.keys(filters)
      let passesFilters = true

      for (const key of filterKeys) {
        const expected = filters[key]
        const actual = recordFacets[key] ?? []
        if (!expected.some((value) => actual.includes(value))) {
          passesFilters = false
          break
        }
      }

      if (!passesFilters) {
        continue
      }

      for (const [facetKey, values] of Object.entries(recordFacets)) {
        facetCounts[facetKey] = facetCounts[facetKey] ?? {}
        for (const value of values) {
          facetCounts[facetKey][value] = (facetCounts[facetKey][value] ?? 0) + 1
        }
      }

      if (results.length < limit) {
        results.push({
          id: record.id,
          scope: record.scope,
          type: record.type,
          title: record.title,
          description: record.description,
          highlights: normalizedQuery ? [record.title, record.description ?? ""] : [],
          facets: record.facets,
          score: record.priority,
        })
      }
    }

    const processingTimeMS = Math.max(Math.round(performance.now() - start), 1)

    return {
      query,
      hits: results,
      facets: facetCounts,
      processingTimeMS,
      appliedFilters: filters,
    }
  }
}

const toAlgoliaFacetFilters = (filters: Record<string, string[]>): string[][] =>
  Object.entries(filters).map(([key, values]) => values.map((value) => `${key}:${value}`))

class AlgoliaSearchAdapter implements SearchAdapter {
  private client: AlgoliaSearchClient

  private index: SearchIndex

  private settingsApplied = false

  public readonly adapterId = "algolia"

  constructor(indexName: string) {
    const appId = process.env.ALGOLIA_APP_ID
    const adminKey = process.env.ALGOLIA_ADMIN_KEY

    if (!appId || !adminKey) {
      throw new Error("Algolia credentials are not configured")
    }

    this.client = algoliasearch(appId, adminKey)
    this.index = this.client.initIndex(indexName)
  }

  private async ensureSettings(records: PreparedRecord[]) {
    if (this.settingsApplied) {
      return
    }

    const facetKeys = new Set<string>()
    for (const record of records) {
      for (const key of Object.keys(record.facets)) {
        facetKeys.add(key)
      }
    }

    const attributesForFaceting = Array.from(facetKeys)
    if (!attributesForFaceting.includes("scope")) {
      attributesForFaceting.push("scope")
    }
    if (!attributesForFaceting.includes("type")) {
      attributesForFaceting.push("type")
    }

    await this.index.setSettings({
      searchableAttributes: [
        "title",
        "description",
        "keywords",
        "synonymTokens",
        "phoneticTokens",
        "searchable",
      ],
      attributesForFaceting,
      typoTolerance: "min",
    })

    this.settingsApplied = true
  }

  async ingest({
    records,
    synonyms,
  }: {
    records: PreparedRecord[]
    synonyms: SynonymDefinition[]
  }): Promise<void> {
    await this.ensureSettings(records)

    const payload = records.map((record) => ({
      objectID: record.objectID,
      id: record.id,
      scope: record.scope,
      type: record.type,
      title: record.title,
      description: record.description,
      keywords: record.keywords,
      synonymTokens: record.synonymTokens,
      phoneticTokens: record.phoneticTokens,
      searchable: record.searchable,
      facets: record.facets,
      priority: record.priority,
      updatedAtISO: record.updatedAtISO,
    }))

    await this.index.saveObjects(payload, { autoGenerateObjectIDIfNotExist: false })

    const algoliaSynonyms: AlgoliaSynonym[] = synonyms
      .filter((entry) => entry.synonyms.length >= 2)
      .map((entry) => ({
        objectID: entry.objectID,
        type: "synonym",
        synonyms: entry.synonyms,
      }))

    if (algoliaSynonyms.length > 0) {
      await this.index.saveSynonyms(algoliaSynonyms, {
        replaceExistingSynonyms: false,
        forwardToReplicas: true,
      })
    }
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    const {
      query,
      scope,
      filters = {},
      limit = 10,
      typoTolerance = "min",
    } = request

    const facetFilters = toAlgoliaFacetFilters(filters)
    if (scope) {
      facetFilters.push([`scope:${scope}`])
    }

    const options: Partial<AlgoliaSearchOptions> = {
      hitsPerPage: limit,
      typoTolerance,
      facetFilters,
      facets: ["*"],
    }

    const response = await this.index.search(query, options)

    const hits: SearchHit[] = response.hits.map((hit: any) => {
      const highlightEntries: string[] = []
      if (hit._highlightResult && typeof hit._highlightResult === "object") {
        for (const value of Object.values(hit._highlightResult)) {
          if (value && typeof value === "object" && "value" in value) {
            highlightEntries.push(String((value as any).value))
          }
        }
      }

      return {
        id: hit.id ?? hit.objectID,
        scope: hit.scope ?? scope ?? "default",
        type: hit.type ?? "unknown",
        title: hit.title ?? "",
        description: hit.description ?? undefined,
        highlights: highlightEntries.length ? highlightEntries : undefined,
        facets: hit.facets ?? {},
        score: typeof hit.priority === "number" ? hit.priority : 0,
      }
    })

    const facets: SearchFacetCounts = response.facets ?? {}

    return {
      query,
      hits,
      facets,
      processingTimeMS: response.processingTimeMS ?? 0,
      appliedFilters: filters,
    }
  }
}

class PortalSearchClient {
  private adapter: SearchAdapter

  constructor() {
    const provider = process.env.PORTAL_SEARCH_PROVIDER ?? "auto"

    if (provider === "algolia" || provider === "auto") {
      try {
        this.adapter = new AlgoliaSearchAdapter(
          process.env.ALGOLIA_INDEX ?? "roomsily_portal"
        )
        return
      } catch (error) {
        if (provider === "algolia") {
          throw error
        }
      }
    }

    this.adapter = new InMemorySearchAdapter()
  }

  get adapterId() {
    return this.adapter.adapterId
  }

  async ingestTopEntities(
    entities: SearchEntity[],
    options?: { limit?: number }
  ) {
    const limit = options?.limit ?? 250
    const sorted = [...entities].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    )
    const selected = sorted.slice(0, limit)

    const records = selected.map(prepareRecord)
    const synonyms = records
      .map((record) => buildSynonymDefinitions(record))
      .filter((entry): entry is SynonymDefinition => Boolean(entry))

    await this.adapter.ingest({ records, synonyms })
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    return this.adapter.search(request)
  }
}

let cachedClient: PortalSearchClient | null = null

export const getPortalSearchClient = (): PortalSearchClient => {
  if (!cachedClient) {
    cachedClient = new PortalSearchClient()
  }

  return cachedClient
}

export async function ingestTopEntities(
  entities: SearchEntity[],
  options?: { limit?: number }
) {
  const client = getPortalSearchClient()
  await client.ingestTopEntities(entities, options)
}

export async function searchPortal(
  request: SearchRequest
): Promise<SearchResult> {
  const client = getPortalSearchClient()
  return client.search(request)
}

export type { PreparedRecord }
