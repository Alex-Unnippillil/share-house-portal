import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.fn()

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}))

type VisitorLog = {
  id: string
  check_out_date: string
  guest_name: string
  guest_email: string
  guest_phone: string | null
  emergency_contact: string | null
  special_notes: string | null
  reason: string
  purpose: string
}

type DocumentRow = {
  id: string
  status: string
  signed_at: string | null
  title: string
  description: string | null
}

type NotificationRow = {
  id: string
  created_at: string
}

function createSupabaseMock(seed?: {
  visitorLogs?: VisitorLog[]
  documents?: DocumentRow[]
  notifications?: NotificationRow[]
}) {
  const state = {
    visitor_logs: seed?.visitorLogs ?? [],
    documents: seed?.documents ?? [],
    notifications: seed?.notifications ?? [],
    retention_execution_audit_logs: [] as Array<Record<string, unknown>>,
  }

  const from = vi.fn((table: string) => {
    if (table === "visitor_logs") {
      return {
        select: vi.fn(() => ({
          lt: vi.fn((field: string, value: string) => ({
            neq: vi.fn((neqField: string, neqValue: string) =>
              Promise.resolve({
                data: state.visitor_logs
                  .filter((row) => row[field as keyof VisitorLog] < value)
                  .filter((row) => row[neqField as keyof VisitorLog] !== neqValue)
                  .map((row) => ({ id: row.id })),
                error: null,
              })
            ),
            then: (resolve: (value: { data: Array<{ id: string }>; error: null }) => unknown) =>
              resolve({
                data: state.visitor_logs
                  .filter((row) => row[field as keyof VisitorLog] < value)
                  .map((row) => ({ id: row.id })),
                error: null,
              }),
          })),
        })),
        update: vi.fn((payload: Partial<VisitorLog>) => ({
          in: vi.fn((_: string, ids: string[]) => {
            state.visitor_logs = state.visitor_logs.map((row) =>
              ids.includes(row.id) ? { ...row, ...payload } : row
            )
            return Promise.resolve({ data: null, error: null })
          }),
        })),
        delete: vi.fn(() => ({
          in: vi.fn((_: string, ids: string[]) => {
            state.visitor_logs = state.visitor_logs.filter((row) => !ids.includes(row.id))
            return Promise.resolve({ data: null, error: null })
          }),
        })),
      }
    }

    if (table === "documents") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((field: string, value: string) => ({
            lt: vi.fn((ltField: string, ltValue: string) =>
              Promise.resolve({
                data: state.documents
                  .filter((row) => row[field as keyof DocumentRow] === value)
                  .filter((row) => (row[ltField as keyof DocumentRow] ?? "") < ltValue)
                  .map((row) => ({ id: row.id, title: row.title, description: row.description })),
                error: null,
              })
            ),
          })),
        })),
        update: vi.fn((payload: Partial<DocumentRow>) => ({
          in: vi.fn((_: string, ids: string[]) => {
            state.documents = state.documents.map((row) =>
              ids.includes(row.id) ? { ...row, ...payload } : row
            )
            return Promise.resolve({ data: null, error: null })
          }),
        })),
      }
    }

    if (table === "notifications") {
      return {
        select: vi.fn(() => ({
          lt: vi.fn((field: string, value: string) =>
            Promise.resolve({
              data: state.notifications
                .filter((row) => row[field as keyof NotificationRow] < value)
                .map((row) => ({ id: row.id })),
              error: null,
            })
          ),
        })),
        delete: vi.fn(() => ({
          in: vi.fn((_: string, ids: string[]) => {
            state.notifications = state.notifications.filter((row) => !ids.includes(row.id))
            return Promise.resolve({ data: null, error: null })
          }),
        })),
      }
    }

    if (table === "retention_execution_audit_logs") {
      return {
        insert: vi.fn((payload: Record<string, unknown>) => {
          state.retention_execution_audit_logs.push(payload)
          return Promise.resolve({ data: null, error: null })
        }),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  createClient.mockReturnValue({ from })

  return { state, from }
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function authRequest(url = "http://localhost/api/ops/retention") {
  return new Request(url, {
    method: "GET",
    headers: {
      authorization: "Bearer test_secret",
    },
  })
}

describe("GET /api/ops/retention", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-25T00:00:00.000Z"))
    process.env.CRON_SECRET = "test_secret"
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role"
  })

  it("handles boundary dates and applies retention only for older rows", async () => {
    const { state } = createSupabaseMock({
      visitorLogs: [
        {
          id: "v-anon",
          check_out_date: daysAgo(181),
          guest_name: "Guest A",
          guest_email: "a@example.com",
          guest_phone: "555-1000",
          emergency_contact: "EC",
          special_notes: "note",
          reason: "vacation",
          purpose: "vacation",
        },
        {
          id: "v-boundary",
          check_out_date: daysAgo(180),
          guest_name: "Guest B",
          guest_email: "b@example.com",
          guest_phone: null,
          emergency_contact: null,
          special_notes: null,
          reason: "visit",
          purpose: "visit",
        },
      ],
      documents: [
        {
          id: "d-old",
          status: "signed",
          signed_at: daysAgo(366),
          title: "Signed lease for John",
          description: "PII heavy",
        },
        {
          id: "d-boundary",
          status: "signed",
          signed_at: daysAgo(365),
          title: "Boundary document",
          description: "Keep",
        },
      ],
      notifications: [
        { id: "n-old", created_at: daysAgo(91) },
        { id: "n-boundary", created_at: daysAgo(90) },
      ],
    })

    const { GET } = await import("@/app/api/ops/retention/route")
    const response = await GET(authRequest())

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.ok).toBe(true)

    expect(state.visitor_logs.find((row) => row.id === "v-anon")?.guest_name).toBe("[redacted]")
    expect(state.visitor_logs.find((row) => row.id === "v-boundary")?.guest_name).toBe("Guest B")

    expect(state.documents.find((row) => row.id === "d-old")?.title).toBe("Signed document (redacted)")
    expect(state.documents.find((row) => row.id === "d-boundary")?.title).toBe("Boundary document")

    expect(state.notifications.map((row) => row.id)).toEqual(["n-boundary"])
    expect(state.retention_execution_audit_logs).toHaveLength(4)
  })

  it("supports dry-run mode without mutating rows", async () => {
    const { state } = createSupabaseMock({
      visitorLogs: [
        {
          id: "v1",
          check_out_date: daysAgo(181),
          guest_name: "Guest A",
          guest_email: "a@example.com",
          guest_phone: "555-1000",
          emergency_contact: "EC",
          special_notes: "note",
          reason: "vacation",
          purpose: "vacation",
        },
      ],
      documents: [
        {
          id: "d1",
          status: "signed",
          signed_at: daysAgo(366),
          title: "Signed lease",
          description: "PII",
        },
      ],
      notifications: [{ id: "n1", created_at: daysAgo(91) }],
    })

    const { GET } = await import("@/app/api/ops/retention/route")
    const response = await GET(authRequest("http://localhost/api/ops/retention?dryRun=true&jobId=dry-001"))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.dryRun).toBe(true)
    expect(json.results.every((entry: { affected: number }) => entry.affected === 0)).toBe(true)

    expect(state.visitor_logs[0].guest_name).toBe("Guest A")
    expect(state.documents[0].title).toBe("Signed lease")
    expect(state.notifications).toHaveLength(1)
    expect(state.retention_execution_audit_logs).toHaveLength(4)
    expect(state.retention_execution_audit_logs[0].mode).toBe("dry-run")
  })

  it("is idempotent across repeated runs", async () => {
    const { state } = createSupabaseMock({
      visitorLogs: [
        {
          id: "v1",
          check_out_date: daysAgo(181),
          guest_name: "Guest A",
          guest_email: "a@example.com",
          guest_phone: null,
          emergency_contact: null,
          special_notes: null,
          reason: "vacation",
          purpose: "vacation",
        },
      ],
      documents: [
        {
          id: "d1",
          status: "signed",
          signed_at: daysAgo(366),
          title: "Original title",
          description: "sensitive",
        },
      ],
      notifications: [{ id: "n1", created_at: daysAgo(91) }],
    })

    const { GET } = await import("@/app/api/ops/retention/route")

    const first = await GET(authRequest("http://localhost/api/ops/retention?jobId=repeat-1"))
    expect(first.status).toBe(200)

    const second = await GET(authRequest("http://localhost/api/ops/retention?jobId=repeat-2"))
    expect(second.status).toBe(200)

    const secondJson = await second.json()
    expect(secondJson.results.map((entry: { affected: number }) => entry.affected)).toEqual([0, 0, 0, 0])
    expect(state.retention_execution_audit_logs).toHaveLength(8)
  })
})
