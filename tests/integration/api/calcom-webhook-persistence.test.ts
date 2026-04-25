import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.fn()

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}))

describe("POST /api/calcom/webhook persistence", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service_role"
    delete process.env.CALCOM_WEBHOOK_SECRET
  })

  it("processes duplicate deliveries idempotently", async () => {
    const processed = new Set<string>()
    const bookingUpsert = vi.fn().mockResolvedValue({ data: null, error: null })

    const webhookInsert = vi.fn(async (payload: { provider: string; event_id: string }) => {
      const key = `${payload.provider}:${payload.event_id}`
      if (processed.has(key)) {
        return { data: null, error: { code: "23505" } }
      }

      processed.add(key)
      return { data: null, error: null }
    })

    const webhookSelectMaybeSingle = vi.fn().mockResolvedValue({ data: { status: "processed" }, error: null })

    const webhookUpdateEqEvent = vi.fn().mockResolvedValue({ data: null, error: null })
    const webhookUpdateEqProvider = vi.fn(() => ({ eq: webhookUpdateEqEvent }))
    const webhookUpdate = vi.fn(() => ({ eq: webhookUpdateEqProvider }))

    const from = vi.fn((table: string) => {
      if (table === "bookings") {
        return {
          upsert: bookingUpsert,
        }
      }

      if (table === "webhook_events") {
        return {
          insert: webhookInsert,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: webhookSelectMaybeSingle })),
            })),
          })),
          update: webhookUpdate,
        }
      }

      return {}
    })

    createClient.mockReturnValue({ from })

    const { POST } = await import("@/app/api/calcom/webhook/route")

    const payload = {
      id: "cal_evt_1",
      triggerEvent: "BOOKING_CREATED",
      payload: {
        bookingId: 101,
        eventTypeId: 55,
        eventTypeSlug: "kitchen",
        title: "Kitchen booking",
        startTime: "2026-06-01T10:00:00.000Z",
        endTime: "2026-06-01T11:00:00.000Z",
      },
    }

    const first = await POST(
      new Request("http://localhost/api/calcom/webhook", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    )

    const second = await POST(
      new Request("http://localhost/api/calcom/webhook", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    )

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(bookingUpsert).toHaveBeenCalledTimes(1)
    expect(webhookUpdateEqProvider).toHaveBeenCalledWith("provider", "calcom")
    expect(webhookUpdateEqEvent).toHaveBeenCalledWith("event_id", "cal_evt_1")
  })

  it("marks failed processing as retriable while preserving payload", async () => {
    const bookingUpsert = vi.fn().mockResolvedValue({ data: null, error: new Error("db write failed") })
    const webhookInsert = vi.fn().mockResolvedValue({ data: null, error: null })

    const webhookUpdateEqEvent = vi.fn().mockResolvedValue({ data: null, error: null })
    const webhookUpdateEqProvider = vi.fn(() => ({ eq: webhookUpdateEqEvent }))
    const webhookUpdate = vi.fn(() => ({ eq: webhookUpdateEqProvider }))

    const from = vi.fn((table: string) => {
      if (table === "bookings") {
        return {
          upsert: bookingUpsert,
        }
      }

      if (table === "webhook_events") {
        return {
          insert: webhookInsert,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
            })),
          })),
          update: webhookUpdate,
        }
      }

      return {}
    })

    createClient.mockReturnValue({ from })

    const { POST } = await import("@/app/api/calcom/webhook/route")

    const payload = {
      id: "cal_evt_2",
      triggerEvent: "BOOKING_CREATED",
      payload: {
        bookingId: 202,
        eventTypeId: 55,
        eventTypeSlug: "kitchen",
        title: "Kitchen booking",
        startTime: "2026-06-01T10:00:00.000Z",
        endTime: "2026-06-01T11:00:00.000Z",
      },
    }

    const response = await POST(
      new Request("http://localhost/api/calcom/webhook", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    )

    expect(response.status).toBe(500)
    expect(webhookInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "calcom",
        event_id: "cal_evt_2",
        payload,
      }),
    )

    const failureUpdatePayload = webhookUpdate.mock.calls.at(-1)?.[0] as Record<string, unknown>
    expect(failureUpdatePayload.status).toBe("failed")
    expect(failureUpdatePayload.next_retry_at).toEqual(expect.any(String))
    expect(failureUpdatePayload.payload).toBeUndefined()
  })
})
