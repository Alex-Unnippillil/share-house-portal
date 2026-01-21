import { describe, expect, it, vi } from "vitest"

import {
  RECENT_ACTIVITY_STORAGE_KEY,
  getResumeEntry,
  loadRecentActivity,
  recordRecentActivity,
  type RecentActivityEntry,
} from "@/lib/recent-activity"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }

  removeItem(key: string) {
    this.store.delete(key)
  }
}

describe("recent activity helper", () => {
  it("records navigation entries in Supabase and syncs storage", async () => {
    const existing: RecentActivityEntry = {
      route: "/documents",
      label: "Documents",
      accessedAt: "2024-07-01T10:00:00.000Z",
    }
    const storage = new MemoryStorage()

    const single = vi.fn().mockResolvedValue({
      data: { metadata: { recentActivity: [existing] } },
      error: null,
    })
    const selectEq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq: selectEq })
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq: updateEq })
    const from = vi.fn().mockReturnValue({ select, update })

    const supabase = { from } as unknown as TypedSupabaseClient

    const nextEntries = await recordRecentActivity(
      {
        route: "/documents/lease",
        label: "Lease renewal",
        accessedAt: "2024-07-02T12:00:00.000Z",
      },
      { supabase, userId: "user-1", storage },
    )

    expect(from).toHaveBeenCalledWith("profiles")
    expect(select).toHaveBeenCalledWith("metadata")
    expect(selectEq).toHaveBeenCalledWith("id", "user-1")
    expect(updateEq).toHaveBeenCalledWith("id", "user-1")
    expect(nextEntries[0]).toMatchObject({ route: "/documents/lease", label: "Lease renewal" })

    const stored = storage.getItem(RECENT_ACTIVITY_STORAGE_KEY)
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored as string)).toHaveLength(2)
  })

  it("falls back to storage when Supabase errors", async () => {
    const storage = new MemoryStorage()

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
          }),
        }),
      }),
    } as unknown as TypedSupabaseClient

    const entries = await recordRecentActivity(
      {
        route: "/payments",
        label: "Payments",
        accessedAt: "2024-07-03T09:00:00.000Z",
      },
      { supabase, userId: "user-1", storage },
    )

    expect(entries).toHaveLength(1)
    expect(entries[0].route).toBe("/payments")
    expect(storage.getItem(RECENT_ACTIVITY_STORAGE_KEY)).toBeTruthy()
  })

  it("loads from storage when Supabase has no records", async () => {
    const storage = new MemoryStorage()
    storage.setItem(
      RECENT_ACTIVITY_STORAGE_KEY,
      JSON.stringify([
        {
          route: "/schedule",
          label: "Amenity schedule",
          accessedAt: "2024-07-05T08:15:00.000Z",
        },
      ]),
    )

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { metadata: {} }, error: null }),
          }),
        }),
      }),
    } as unknown as TypedSupabaseClient

    const entries = await loadRecentActivity({ supabase, userId: "user-1", storage })

    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ route: "/schedule" })
  })

  it("selects the newest entry for resume", () => {
    const resume = getResumeEntry([
      { route: "/payments", label: "Payments", accessedAt: "2024-07-01T12:00:00.000Z" },
      { route: "/documents", label: "Documents", accessedAt: "2024-06-01T12:00:00.000Z" },
    ])

    expect(resume?.route).toBe("/payments")

    expect(getResumeEntry([])).toBeNull()
  })
})
