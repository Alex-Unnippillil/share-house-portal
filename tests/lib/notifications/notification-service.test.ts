import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createNotificationClient,
  ResendNotificationService,
  type EmailNotification,
  type InAppNotification,
  type NotificationService,
  type NotificationResult,
} from "@/lib/notifications"

const emailNotification: EmailNotification = {
  to: "tenant@example.com",
  subject: "Test",
  template: "welcome",
  data: { tenantName: "Test Tenant" },
  userId: "user-123",
}

const inAppNotification: InAppNotification = {
  userId: "user-123",
  title: "Greetings",
  message: "Welcome to the portal",
  type: "info",
  actionUrl: "/dashboard",
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createNotificationClient", () => {
  it("delegates notification operations to the provided service", async () => {
    const emailResult: NotificationResult = { success: true, data: { id: "1" } }
    const inAppResult: NotificationResult = { success: true }
    const bulkResult = { success: true, results: [] }

    const service: NotificationService = {
      sendEmail: vi.fn().mockResolvedValue(emailResult),
      sendInApp: vi.fn().mockResolvedValue(inAppResult),
      sendBulk: vi.fn().mockResolvedValue(bulkResult),
    }

    const client = createNotificationClient(service)

    await expect(client.sendEmailNotification(emailNotification)).resolves.toBe(
      emailResult
    )
    await expect(
      client.sendInAppNotification(inAppNotification)
    ).resolves.toBe(inAppResult)
    await expect(
      client.sendBulkNotifications([emailNotification, inAppNotification])
    ).resolves.toBe(bulkResult)

    expect(service.sendEmail).toHaveBeenCalledWith(emailNotification)
    expect(service.sendInApp).toHaveBeenCalledWith(inAppNotification)
    expect(service.sendBulk).toHaveBeenCalledWith([
      emailNotification,
      inAppNotification,
    ])
  })
})

describe("ResendNotificationService", () => {
  it("aggregates bulk notification results from underlying channels", async () => {
    const service = new ResendNotificationService(null)

    vi.spyOn(service, "sendEmail")
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "email failed" })
    vi.spyOn(service, "sendInApp")
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "in-app failed" })

    const batch = await service.sendBulk([
      emailNotification,
      inAppNotification,
      emailNotification,
      inAppNotification,
    ])

    expect(batch.success).toBe(false)
    expect(batch.results).toHaveLength(4)
    expect(batch.results[0]).toMatchObject({ index: 0, success: true })
    expect(batch.results[1]).toMatchObject({ index: 1, success: true })
    expect(batch.results[2]).toMatchObject({
      index: 2,
      success: false,
      error: "email failed",
    })
    expect(batch.results[3]).toMatchObject({
      index: 3,
      success: false,
      error: "in-app failed",
    })
  })

  it("handles rejected notification promises when sending in bulk", async () => {
    const service = new ResendNotificationService(null)

    vi.spyOn(service, "sendEmail").mockRejectedValue(new Error("boom"))
    vi.spyOn(service, "sendInApp").mockResolvedValue({ success: true })

    const batch = await service.sendBulk([
      emailNotification,
      inAppNotification,
    ])

    expect(batch.success).toBe(false)
    expect(batch.results).toEqual([
      { index: 0, success: false, error: "boom" },
      { index: 1, success: true, error: undefined },
    ])
  })
})
