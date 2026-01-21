import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AuditLogRow } from "@/lib/audit-logs"
import {
  AUDIT_LOG_MAX_LIMIT,
  AUDIT_LOG_MAX_PAGE,
  parseAuditLogQuery,
} from "@/lib/audit-logs"
import { GET } from "@/app/api/audit/logs/route"
import { exportAuditLogsCsvAction } from "@/app/dashboard/audit/actions"

const createClientMock = vi.fn()
const createSupabaseServerClientMock = vi.fn()

vi.mock("@/utils/supa-server-actions", () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}))

vi.mock("@/utils/supaone", () => ({
  createSupbaseServerClient: () => createSupabaseServerClientMock(),
}))

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))

type FacetStub = {
  actorRoles?: string[]
  actions?: string[]
  entityTypes?: string[]
}

function createAuditLogSupabaseStub(
  logs: AuditLogRow[],
  facets: FacetStub = {}
) {
  const select = vi.fn().mockReturnThis()
  const order = vi.fn().mockReturnThis()
  const eq = vi.fn().mockReturnThis()
  const gte = vi.fn().mockReturnThis()
  const lte = vi.fn().mockReturnThis()
  const or = vi.fn().mockReturnThis()
  const range = vi.fn().mockResolvedValue({
    data: logs,
    error: null,
    count: logs.length,
  })

  const queryBuilder = { select, order, eq, gte, lte, or, range }

  const rpc = vi.fn().mockResolvedValue({
    data: [
      {
        actor_roles: facets.actorRoles ?? [],
        actions: facets.actions ?? [],
        entity_types: facets.entityTypes ?? [],
      },
    ],
    error: null,
  })

  const from = vi.fn((table: string) => {
    expect(table).toBe("audit_logs")
    return queryBuilder
  })

  return {
    from,
    rpc,
    queryBuilder,
  }
}

const sampleLogs: AuditLogRow[] = [
  {
    id: "log-1",
    created_at: "2024-03-12T14:00:00.000Z",
    actor_id: "actor-admin",
    actor_role: "admin",
    actor_email: "admin@example.com",
    actor_name: "Admin One",
    entity_type: "document",
    entity_id: "doc-1",
    entity_name: "Lease Agreement",
    action: "document.updated",
    payload: { field: "status", previous: "draft", next: "signed" },
    context: { reason: "manual override" },
    household_id: "house-1",
    ip_address: "203.0.113.10",
    user_agent: "Mozilla/5.0",
  },
  {
    id: "log-2",
    created_at: "2024-03-15T09:30:00.000Z",
    actor_id: "actor-tenant",
    actor_role: "tenant",
    actor_email: "roommate@example.com",
    actor_name: "Roommate Two",
    entity_type: "maintenance",
    entity_id: "ticket-99",
    entity_name: "Leaky faucet",
    action: "maintenance.created",
    payload: { priority: "high" },
    context: {},
    household_id: "house-1",
    ip_address: "198.51.100.24",
    user_agent: "Mozilla/5.0",
  },
  {
    id: "log-3",
    created_at: "2024-03-18T18:45:00.000Z",
    actor_id: "actor-manager",
    actor_role: "property_manager",
    actor_email: "manager@example.com",
    actor_name: "Manager Three",
    entity_type: "document",
    entity_id: "doc-2",
    entity_name: "Inspection report",
    action: "document.viewed",
    payload: { source: "dashboard" },
    context: { via: "bulk-review" },
    household_id: "house-2",
    ip_address: "192.0.2.42",
    user_agent: "Mozilla/5.0",
  },
]

beforeEach(() => {
  createClientMock.mockReset()
  createSupabaseServerClientMock.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("audit logs API", () => {
  it("applies combined filters when listing logs", async () => {
    const matchingLog = sampleLogs[0]
    const supabaseStub = createAuditLogSupabaseStub([matchingLog], {
      actorRoles: ["admin", "tenant"],
      actions: ["document.updated", "maintenance.created"],
      entityTypes: ["document", "maintenance"],
    })

    createClientMock.mockReturnValue(supabaseStub as unknown)

    const url =
      "http://localhost/api/audit/logs?actorRole=admin&entityType=document&action=document.updated&search=lease&startDate=2024-03-01T00:00:00.000Z&endDate=2024-03-31T23:59:59.999Z&limit=25&page=1&includeFacets=1"

    const response = await GET(new Request(url))

    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.logs).toEqual([matchingLog])
    expect(body.meta.filters.actorRole).toBe("admin")
    expect(body.meta.availableFilters.actorRoles).toContain("admin")

    expect(supabaseStub.queryBuilder.select).toHaveBeenCalled()
    expect(supabaseStub.queryBuilder.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    })
    expect(supabaseStub.queryBuilder.eq).toHaveBeenCalledWith(
      "actor_role",
      "admin"
    )
    expect(supabaseStub.queryBuilder.eq).toHaveBeenCalledWith(
      "entity_type",
      "document"
    )
    expect(supabaseStub.queryBuilder.eq).toHaveBeenCalledWith(
      "action",
      "document.updated"
    )
    expect(supabaseStub.queryBuilder.gte).toHaveBeenCalledWith(
      "created_at",
      "2024-03-01T00:00:00.000Z"
    )
    expect(supabaseStub.queryBuilder.lte).toHaveBeenCalledWith(
      "created_at",
      "2024-03-31T23:59:59.999Z"
    )
    expect(supabaseStub.queryBuilder.or).toHaveBeenCalledWith(
      "actor_email.ilike.%lease%,actor_name.ilike.%lease%,entity_type.ilike.%lease%,entity_name.ilike.%lease%,action.ilike.%lease%,entity_id.ilike.%lease%"
    )
    expect(supabaseStub.queryBuilder.range).toHaveBeenCalledWith(0, 24)
    expect(supabaseStub.rpc).toHaveBeenCalledWith("get_audit_log_filter_options")
  })

  it("returns 400 when date range is invalid", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/audit/logs?startDate=2024-04-10T00:00:00.000Z&endDate=2024-04-01T00:00:00.000Z"
      )
    )

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toMatch(/startDate must be before or equal to endDate/)
    expect(createClientMock).not.toHaveBeenCalled()
  })
})

describe("audit log server actions", () => {
  it("exports filtered logs as CSV", async () => {
    const supabaseStub = createAuditLogSupabaseStub([sampleLogs[0], sampleLogs[2]])
    createSupabaseServerClientMock.mockResolvedValue(supabaseStub as unknown)

    const result = await exportAuditLogsCsvAction({
      filters: {
        actorRole: "admin",
        startDate: "2024-03-01T00:00:00.000Z",
        endDate: "2024-03-31T23:59:59.999Z",
      },
      limit: 100,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.csv.split("\n")[0]).toContain("Log ID,Timestamp,Actor ID")
      expect(result.count).toBe(2)
    }

    expect(supabaseStub.queryBuilder.eq).toHaveBeenCalledWith(
      "actor_role",
      "admin"
    )
    expect(supabaseStub.queryBuilder.gte).toHaveBeenCalledWith(
      "created_at",
      "2024-03-01T00:00:00.000Z"
    )
    expect(supabaseStub.queryBuilder.lte).toHaveBeenCalledWith(
      "created_at",
      "2024-03-31T23:59:59.999Z"
    )
  })
})

describe("audit log query parsing", () => {
  it("clamps page size and page number to safe limits", () => {
    const result = parseAuditLogQuery({
      limit: String(AUDIT_LOG_MAX_LIMIT + 50),
      page: String(AUDIT_LOG_MAX_PAGE + 10),
      endDate: "2024-03-20T12:00:00.000Z",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pagination.limit).toBe(AUDIT_LOG_MAX_LIMIT)
      expect(result.data.pagination.page).toBe(AUDIT_LOG_MAX_PAGE)
      const warningReasons = result.data.warnings.map((warning) => warning.reason)
      expect(warningReasons).toContain("limit_clamped")
      expect(warningReasons).toContain("page_clamped")
    }
  })
})
