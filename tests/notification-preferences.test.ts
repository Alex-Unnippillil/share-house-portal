import { describe, expect, it, vi } from "vitest"

import {
  saveNotificationPreferences,
} from "@/lib/notification-preferences-repository"
import {
  shouldSuppressPush,
  type NotificationPreferences,
} from "@/lib/notification-preferences"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

describe("notification preferences", () => {
  it("persists preferences through supabase upsert", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        digest_frequency: "weekly",
        quiet_hours_start: "22:00:00",
        quiet_hours_end: "06:30:00",
      },
      error: null,
    })

    const select = vi.fn().mockReturnValue({ maybeSingle })
    const upsert = vi.fn().mockReturnValue({ select })
    const from = vi.fn().mockReturnValue({ upsert })

    const supabase = { from } as unknown as TypedSupabaseClient

    const result = await saveNotificationPreferences(supabase, "user-123", {
      digestFrequency: "weekly",
      quietHoursStart: "22:00",
      quietHoursEnd: "06:30",
    })

    expect(from).toHaveBeenCalledWith("notification_preferences")
    expect(upsert).toHaveBeenCalledWith(
      {
        user_id: "user-123",
        digest_frequency: "weekly",
        quiet_hours_start: "22:00",
        quiet_hours_end: "06:30",
      },
      { onConflict: "user_id" },
    )
    expect(result.digestFrequency).toBe("weekly")
    expect(result.quietHoursStart).toBe("22:00")
    expect(result.quietHoursEnd).toBe("06:30")
  })

  it("recognises quiet hours that cross midnight", () => {
    const preferences: NotificationPreferences = {
      digestFrequency: "daily",
      quietHoursStart: "22:00",
      quietHoursEnd: "06:30",
    }

    const createDate = (hours: number, minutes = 0) => {
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      return date
    }

    expect(shouldSuppressPush(createDate(23, 45), preferences)).toBe(true)
    expect(shouldSuppressPush(createDate(5, 45), preferences)).toBe(true)
    expect(shouldSuppressPush(createDate(14, 0), preferences)).toBe(false)
  })
})
