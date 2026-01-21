import { describe, expect, it, vi } from "vitest"

import {
  DEFAULT_CSAT_COOLDOWN_HOURS,
  DEFAULT_NPS_COOLDOWN_DAYS,
  DEFAULT_NPS_DISMISSAL_DAYS,
  shouldDisplayCsatPrompt,
  shouldDisplayNpsPrompt,
} from "@/lib/feedback/prompt-logic"
import { persistCsatResponse, persistNpsResponse } from "@/lib/feedback/persistence"
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client"

describe("prompt cooldown logic", () => {
  it("does not show NPS prompt when user already responded this window", () => {
    const result = shouldDisplayNpsPrompt({
      hasActiveWindow: true,
      respondedInWindow: true,
    })

    expect(result).toBe(false)
  })

  it("respects NPS cooldown and dismissal windows", () => {
    const now = new Date()
    const recentResponse = new Date(now.getTime() - (DEFAULT_NPS_COOLDOWN_DAYS - 10) * 24 * 60 * 60 * 1000)
    const recentDismissal = new Date(now.getTime() - (DEFAULT_NPS_DISMISSAL_DAYS - 5) * 24 * 60 * 60 * 1000)

    const result = shouldDisplayNpsPrompt({
      hasActiveWindow: true,
      respondedInWindow: false,
      lastResponseAt: recentResponse,
      dismissedAt: recentDismissal,
      now,
    })

    expect(result).toBe(false)
  })

  it("shows NPS prompt when cooldown has elapsed", () => {
    const now = new Date()
    const olderResponse = new Date(now.getTime() - (DEFAULT_NPS_COOLDOWN_DAYS + 5) * 24 * 60 * 60 * 1000)

    const result = shouldDisplayNpsPrompt({
      hasActiveWindow: true,
      respondedInWindow: false,
      lastResponseAt: olderResponse,
      now,
    })

    expect(result).toBe(true)
  })

  it("suppresses CSAT prompt when the same event already has feedback", () => {
    const result = shouldDisplayCsatPrompt({
      respondedToEvent: true,
      cooldownHours: DEFAULT_CSAT_COOLDOWN_HOURS,
    })

    expect(result).toBe(false)
  })

  it("enforces CSAT cooldown between events", () => {
    const now = new Date()
    const recent = new Date(now.getTime() - (DEFAULT_CSAT_COOLDOWN_HOURS - 2) * 60 * 60 * 1000)

    const result = shouldDisplayCsatPrompt({
      respondedToEvent: false,
      lastResponseAt: recent,
      now,
      cooldownHours: DEFAULT_CSAT_COOLDOWN_HOURS,
    })

    expect(result).toBe(false)
  })

  it("allows CSAT prompt when cooldown expires", () => {
    const now = new Date()
    const older = new Date(now.getTime() - (DEFAULT_CSAT_COOLDOWN_HOURS + 1) * 60 * 60 * 1000)

    const result = shouldDisplayCsatPrompt({
      respondedToEvent: false,
      lastResponseAt: older,
      now,
      cooldownHours: DEFAULT_CSAT_COOLDOWN_HOURS,
    })

    expect(result).toBe(true)
  })
})

describe("feedback persistence", () => {
  const buildMockClient = () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "abc", created_at: "2024-01-01T00:00:00Z" }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    const from = vi.fn().mockReturnValue({ insert })

    const client = { from } as unknown as TypedSupabaseClient

    return { client, from, insert, select, single }
  }

  it("persists NPS responses with metadata", async () => {
    const { client, from, insert, select, single } = buildMockClient()

    const result = await persistNpsResponse(client, {
      userId: 'user-1',
      windowId: 'window-1',
      score: 9,
      feedback: 'Great service',
      metadata: { channel: 'in-app' },
    })

    expect(from).toHaveBeenCalledWith('nps_responses')
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      window_id: 'window-1',
      score: 9,
      feedback: 'Great service',
      metadata: { channel: 'in-app' },
    })
    expect(select).toHaveBeenCalledWith('id, created_at')
    expect(single).toHaveBeenCalled()
    expect(result).toEqual({ id: 'abc', created_at: '2024-01-01T00:00:00Z' })
  })

  it("persists CSAT responses", async () => {
    const { client, from, insert } = buildMockClient()

    await persistCsatResponse(client, {
      userId: 'user-2',
      context: 'document_signed',
      contextId: 'doc-1',
      rating: 5,
      comment: 'Smooth experience',
    })

    expect(from).toHaveBeenCalledWith('csat_responses')
    expect(insert).toHaveBeenCalledWith({
      user_id: 'user-2',
      context: 'document_signed',
      context_id: 'doc-1',
      rating: 5,
      comment: 'Smooth experience',
      metadata: null,
    })
  })
})
