import { describe, expect, it, vi } from "vitest"

import { scheduleDunningCadence } from "@/lib/notifications"

describe("scheduleDunningCadence", () => {
  it("queues dunning notifications and returns retry schedule", async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })
    const supabaseMock = {
      from: vi.fn((table: string) => {
        expect(table).toBe("email_notifications")
        return { insert: insertMock }
      }),
    }

    const failedAt = "2024-06-01T00:00:00.000Z"
    const nextAttempt = "2024-06-02T12:00:00.000Z"

    const plan = await scheduleDunningCadence({
      supabaseClient: supabaseMock as any,
      userId: "tenant_123",
      email: "tenant@example.com",
      tenantName: "Test Tenant",
      amount: 1200,
      currency: "USD",
      paymentReference: "in_123",
      failedAt,
      nextPaymentAttempt: nextAttempt,
    })

    expect(supabaseMock.from).toHaveBeenCalledWith("email_notifications")
    expect(insertMock).toHaveBeenCalledTimes(3)
    const [firstCall] = insertMock.mock.calls
    expect(firstCall[0]).toMatchObject({
      status: "pending",
      template: "payment-retry",
      metadata: expect.objectContaining({ stageId: "retry_1" }),
    })

    expect(plan.notifications).toHaveLength(3)
    expect(plan.notifications[0].stageId).toBe("retry_1")
    expect(plan.notifications[0].scheduled).toBe(true)
    expect(plan.retrySchedule).toHaveLength(2)
    expect(plan.retrySchedule[0]).toMatch(/T/)
  })
})
