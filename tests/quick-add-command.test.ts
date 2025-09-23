import { describe, expect, it } from "vitest"

import { createQuickAddItem } from "@/app/dashboard/(dashboard)/actions/quick-add"
import { parseQuickAddCommand } from "@/lib/dashboard/quick-add-parser"

describe("quick add command parsing", () => {
  it("understands invoice commands with relative dates", () => {
    const now = new Date("2024-07-15T12:00:00Z")
    const result = parseQuickAddCommand(
      "Invoice roommate B $450 due next Friday",
      { now }
    )

    expect(result.isReady).toBe(true)
    expect(result.data.intent).toBe("invoice")
    expect(result.data.amount).toBe(450)
    expect(result.data.currency).toBe("USD")
    expect(result.data.dueDate).toBe("2024-07-19")
    expect(result.issues).toHaveLength(0)
  })

  it("handles explicit currency codes and natural language dates", () => {
    const now = new Date("2024-07-01T00:00:00Z")
    const result = parseQuickAddCommand(
      "Create invoice 560 eur due 15 Aug for garage space",
      { now }
    )

    expect(result.isReady).toBe(true)
    expect(result.data.intent).toBe("invoice")
    expect(result.data.amount).toBe(560)
    expect(result.data.currency).toBe("EUR")
    expect(result.data.dueDate).toBe("2024-08-15")
  })

  it("parses task commands with offsets", () => {
    const now = new Date("2024-07-10T08:00:00Z")
    const result = parseQuickAddCommand(
      "Task schedule deep clean due in 3 days",
      { now }
    )

    expect(result.isReady).toBe(true)
    expect(result.data.intent).toBe("task")
    expect(result.data.dueDate).toBe("2024-07-13")
  })

  it("supports mixed commands with currency codes", () => {
    const now = new Date("2024-08-20T00:00:00Z")
    const result = parseQuickAddCommand(
      "Remind me to collect utilities 120 cad by 9/5",
      { now }
    )

    expect(result.isReady).toBe(true)
    expect(result.data.intent).toBe("task")
    expect(result.data.amount).toBe(120)
    expect(result.data.currency).toBe("CAD")
    expect(result.data.dueDate).toBe("2024-09-05")
  })

  it("surfaces validation feedback when context is missing", () => {
    const now = new Date("2024-07-01T00:00:00Z")
    const result = parseQuickAddCommand("Invoice 230", { now })

    expect(result.isReady).toBe(false)
    expect(result.issues.some((issue) => issue.field === "dueDate")).toBe(true)
    expect(result.issues.some((issue) => issue.field === "amount")).toBe(false)
    expect(result.issues.some((issue) => issue.field === "currency")).toBe(true)
  })
})

describe("quick add server action", () => {
  it("creates invoice payloads", async () => {
    const response = await createQuickAddItem({
      intent: "invoice",
      description: "Invoice roommate B $450 due next Friday",
      amount: 450,
      currency: "USD",
      dueDate: "2024-07-19",
    })

    expect(response.status).toBe("success")
    expect(response.item.type).toBe("invoice")
    expect(response.item.amount).toBe(450)
    expect(response.item.currency).toBe("USD")
    expect(response.item.reference.startsWith("inv_")).toBe(true)
  })

  it("creates task payloads", async () => {
    const response = await createQuickAddItem({
      intent: "task",
      description: "Task schedule deep clean due in 3 days",
      dueDate: "2024-07-13",
    })

    expect(response.status).toBe("success")
    expect(response.item.type).toBe("task")
    expect(response.item.reference.startsWith("task_")).toBe(true)
  })

  it("rejects invoices that are missing financial fields", async () => {
    await expect(
      createQuickAddItem({
        intent: "invoice",
        description: "Invoice 180",
        dueDate: "2024-07-15",
      })
    ).rejects.toThrow("Invoices created from quick add require an amount.")
  })
})
