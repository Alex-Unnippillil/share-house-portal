import { describe, expect, it, vi } from "vitest"

import {
  normalizeQuietHour,
  persistNotificationPreferences,
  type NotificationPreferencesInput,
} from "@/lib/data/preferences"

function createSupabaseStub(response: { error: { message: string } | null }) {
  const eq = vi.fn().mockResolvedValue(response)
  const update = vi.fn().mockReturnValue({ eq })
  const from = vi.fn((table: string) => {
    expect(table).toBe("profiles")
    return { update }
  })

  return { from, update, eq }
}

describe("normalizeQuietHour", () => {
  it("normalizes HH:MM values to include seconds", () => {
    expect(normalizeQuietHour("21:30")).toBe("21:30:00")
  })

  it("returns existing seconds when provided", () => {
    expect(normalizeQuietHour("07:45:30")).toBe("07:45:30")
  })

  it("returns null for empty values", () => {
    expect(normalizeQuietHour(null)).toBeNull()
    expect(normalizeQuietHour(" ")).toBeNull()
  })

  it("throws for invalid inputs", () => {
    expect(() => normalizeQuietHour("99:00")).toThrow(/Invalid quiet hour value/)
    expect(() => normalizeQuietHour("08:99")).toThrow(/Invalid quiet hour value/)
    expect(() => normalizeQuietHour("invalid" as unknown as string)).toThrow(
      /Invalid quiet hour value/,
    )
  })
})

describe("persistNotificationPreferences", () => {
  const preferences: NotificationPreferencesInput = {
    digestFrequency: "weekly",
    quietHoursStart: "21:30",
    quietHoursEnd: null,
  }

  it("updates the profile with normalized quiet hours", async () => {
    const supabase = createSupabaseStub({ error: null })

    const result = await persistNotificationPreferences(
      supabase as any,
      "user-123",
      preferences,
    )

    expect(supabase.from).toHaveBeenCalledWith("profiles")
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        digest_frequency: "weekly",
        quiet_hours_start: "21:30:00",
        quiet_hours_end: null,
      }),
    )
    expect(supabase.eq).toHaveBeenCalledWith("id", "user-123")

    expect(result.digest_frequency).toBe("weekly")
    expect(result.quiet_hours_start).toBe("21:30:00")
    expect(result.quiet_hours_end).toBeNull()
    expect(result.updated_at).toMatch(/T/)
  })

  it("throws when supabase reports an error", async () => {
    const supabase = createSupabaseStub({ error: { message: "boom" } })

    await expect(
      persistNotificationPreferences(supabase as any, "user-123", preferences),
    ).rejects.toThrow(/Failed to update notification preferences: boom/)
  })
})
