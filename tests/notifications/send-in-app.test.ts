import { beforeEach, describe, expect, it, vi } from "vitest"

import { sendInAppNotification } from "@/lib/notifications"

const { supabaseModuleMock } = vi.hoisted(() => ({
  supabaseModuleMock: {
    createSupbaseServerClient: vi.fn(),
  },
}))

vi.mock("@/utils/supaone", () => supabaseModuleMock)

const createClientMock = supabaseModuleMock.createSupbaseServerClient

type MutedConfig = Record<string, boolean>

function createSupabaseStub(mutedThreads: MutedConfig = {}) {
  const inserted: any[] = []
  const preferenceFilters: Record<string, string> = {}

  const preferencesBuilder = {
    eq: vi.fn((column: string, value: string) => {
      preferenceFilters[column] = value
      return preferencesBuilder
    }),
    maybeSingle: vi.fn(async () => {
      const key = `${preferenceFilters.user_id}:${preferenceFilters.thread_id}`
      Object.keys(preferenceFilters).forEach((key) => delete preferenceFilters[key])

      if (mutedThreads[key]) {
        return { data: { muted: true }, error: null }
      }

      return { data: null, error: null }
    }),
  }

  const notificationsBuilder = {
    insert: vi.fn(async (payload: any) => {
      const rows = Array.isArray(payload) ? payload : [payload]
      inserted.push(...rows)
      return { data: rows, error: null }
    }),
  }

  const supabaseStub = {
    from: vi.fn((table: string) => {
      if (table === "notification_thread_preferences") {
        return {
          select: vi.fn(() => preferencesBuilder),
        }
      }

      if (table === "notifications") {
        return notificationsBuilder
      }

      throw new Error(`Unexpected table ${table}`)
    }),
  }

  return {
    supabase: supabaseStub,
    inserted,
    notificationsBuilder,
    preferencesBuilder,
  }
}

describe("sendInAppNotification", () => {
  beforeEach(() => {
    createClientMock.mockReset()
  })

  it("persists notifications when the thread is not muted", async () => {
    const stub = createSupabaseStub()
    createClientMock.mockResolvedValue(stub.supabase)

    const result = await sendInAppNotification({
      userId: "user-1",
      title: "Payment Successful",
      message: "Your rent payment has been posted.",
      type: "success",
      threadId: "payments",
      threadLabel: "Payments",
      source: "payments",
    })

    expect(result.success).toBe(true)
    expect(stub.notificationsBuilder.insert).toHaveBeenCalledTimes(1)
    expect(stub.inserted).toHaveLength(1)
    expect(stub.inserted[0]).toMatchObject({
      user_id: "user-1",
      thread_id: "payments",
      source: "payments",
      thread_label: "Payments",
    })
  })

  it("skips insertion when the target thread is muted", async () => {
    const stub = createSupabaseStub({ "user-1:payments": true })
    createClientMock.mockResolvedValue(stub.supabase)

    const result = await sendInAppNotification({
      userId: "user-1",
      title: "Payment Successful",
      message: "Your rent payment has been posted.",
      type: "success",
      threadId: "payments",
      threadLabel: "Payments",
      source: "payments",
    })

    expect(result.success).toBe(true)
    expect((result as { skipped?: boolean }).skipped).toBe(true)
    expect(stub.notificationsBuilder.insert).not.toHaveBeenCalled()
    expect(stub.inserted).toHaveLength(0)
  })
})
