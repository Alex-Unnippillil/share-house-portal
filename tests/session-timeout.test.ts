import { describe, expect, it, vi } from "vitest"

import {
  calculateSessionStatus,
  extendSessionWithAutoSave,
  resolveSessionTimeoutSettings,
  type SessionTimeoutSettings,
} from "@/lib/session/session-timeout"

const baseSettings: SessionTimeoutSettings = {
  idleThresholdMs: 30 * 60 * 1000,
  warningWindowMs: 5 * 60 * 1000,
}

describe("session timeout calculations", () => {
  it("flags a warning when idle time is close to the limit", () => {
    const now = Date.now()
    const status = calculateSessionStatus({
      expiresAtMs: now + 4 * 60 * 1000,
      lastActivityMs: now - 27 * 60 * 1000,
      nowMs: now,
      settings: baseSettings,
    })

    expect(status.shouldWarn).toBe(true)
    expect(status.msUntilIdleLogout).toBeLessThanOrEqual(baseSettings.warningWindowMs)
  })

  it("does not warn when the user is active and within the idle window", () => {
    const now = Date.now()
    const status = calculateSessionStatus({
      expiresAtMs: now + 15 * 60 * 1000,
      lastActivityMs: now - 60 * 1000,
      nowMs: now,
      settings: baseSettings,
    })

    expect(status.shouldWarn).toBe(false)
    expect(status.msUntilIdleLogout).toBeGreaterThan(baseSettings.warningWindowMs)
  })

  it("derives idle settings from Supabase user metadata", () => {
    const session = {
      user: {
        user_metadata: {
          session_idle_timeout_minutes: 12,
          session_idle_warning_minutes: 3,
        },
      },
    } as unknown as Parameters<typeof resolveSessionTimeoutSettings>[0]

    const settings = resolveSessionTimeoutSettings(session)

    expect(settings.idleThresholdMs).toBe(12 * 60 * 1000)
    expect(settings.warningWindowMs).toBe(3 * 60 * 1000)
  })
})

describe("session extension", () => {
  it("runs auto-saves before refreshing the session", async () => {
    const order: string[] = []
    const firstSave = vi.fn().mockImplementation(async () => {
      order.push("auto-1")
    })
    const secondSave = vi.fn().mockImplementation(() => {
      order.push("auto-2")
    })
    const refresh = vi.fn().mockImplementation(async () => {
      order.push("refresh")
      return { data: { session: null }, error: null }
    })

    const result = await extendSessionWithAutoSave([firstSave, secondSave], refresh)

    expect(order).toEqual(["auto-1", "auto-2", "refresh"])
    expect(firstSave).toHaveBeenCalledOnce()
    expect(secondSave).toHaveBeenCalledOnce()
    expect(refresh).toHaveBeenCalledOnce()
    expect(result).toEqual({ data: { session: null }, error: null })
  })

  it("still refreshes the session when an auto-save fails", async () => {
    const order: string[] = []
    const failingSave = vi.fn().mockImplementation(() => {
      order.push("auto-fail")
      throw new Error("boom")
    })
    const succeedingSave = vi.fn().mockImplementation(() => {
      order.push("auto-pass")
    })
    const refresh = vi.fn().mockImplementation(async () => {
      order.push("refresh")
      return "refreshed"
    })

    const result = await extendSessionWithAutoSave([failingSave, succeedingSave], refresh)

    expect(order).toEqual(["auto-fail", "auto-pass", "refresh"])
    expect(refresh).toHaveBeenCalledOnce()
    expect(result).toBe("refreshed")
  })
})
