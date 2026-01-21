import { describe, expect, it, vi } from "vitest"

import {
  MaintenanceStatusLogger,
  isStatusSequenceForward,
} from "@/lib/maintenance/status-logger"
import type { MaintenancePhotoAttachment } from "@/lib/maintenance/types"

describe("MaintenanceStatusLogger", () => {
  const sampleAttachment: MaintenancePhotoAttachment = {
    bucket: "maintenance-photos",
    path: "unit-3b/req-1/reported/photo.jpg",
    name: "photo.jpg",
    size: 1024,
    mime_type: "image/jpeg",
    uploaded_at: new Date().toISOString(),
    public_url: "https://example.com/photo.jpg",
  }

  it("records transitions with proof and persists", async () => {
    const persist = vi.fn()
    const clock = () => new Date("2025-03-02T15:00:00.000Z")
    const logger = new MaintenanceStatusLogger({ persist, clock })

    const event = await logger.logTransition({
      requestId: "req-1",
      from: "pending",
      to: "triaged",
      actorId: "pm-1",
      metadata: { stage: "triage" },
      proof: {
        actor_id: "pm-1",
        actor_role: "property_manager",
        captured_at: "2025-03-02T14:58:00.000Z",
        notes: "Called tenant and confirmed access for technician.",
        attachments: [sampleAttachment],
      },
    })

    expect(event.next_status).toBe("triaged")
    expect(event.changed_at).toBe(clock().toISOString())
    expect(logger.history).toHaveLength(1)
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith(event)
  })

  it("rejects invalid status transitions", async () => {
    const logger = new MaintenanceStatusLogger()

    await expect(
      logger.logTransition({
        requestId: "req-1",
        from: "pending",
        to: "completed",
        actorId: "pm-1",
        proof: {
          actor_id: "pm-1",
          actor_role: "property_manager",
          captured_at: new Date().toISOString(),
          notes: "Marked as complete by mistake.",
        },
      }),
    ).rejects.toThrow(/Invalid maintenance status transition/)
    expect(logger.history).toHaveLength(0)
  })

  it("requires notes or attachments in proof", async () => {
    const logger = new MaintenanceStatusLogger()

    await expect(
      logger.logTransition({
        requestId: "req-2",
        from: "pending",
        to: "triaged",
        actorId: "pm-1",
        proof: {
          actor_id: "pm-1",
          actor_role: "property_manager",
          captured_at: new Date().toISOString(),
          notes: "",
          attachments: [],
        },
      }),
    ).rejects.toThrow(/Proof must include notes or at least one attachment/)
  })
})

describe("isStatusSequenceForward", () => {
  it("confirms forward motion", () => {
    expect(isStatusSequenceForward("pending", "triaged")).toBe(true)
    expect(isStatusSequenceForward("triaged", "awaiting_vendor")).toBe(true)
    expect(isStatusSequenceForward("awaiting_vendor", "scheduled")).toBe(true)
  })

  it("flags regressions", () => {
    expect(isStatusSequenceForward("in_progress", "pending")).toBe(false)
    expect(isStatusSequenceForward("completed", "triaged")).toBe(false)
  })
})
