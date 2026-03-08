import { describe, expect, it } from "vitest"

import { exportLedgerCsv } from "@/app/supplies/actions"

describe("ledger CSV export", () => {
  it("creates a CSV for the selected month", async () => {
    const result = await exportLedgerCsv({
      month: "2024-06",
      timeZone: "America/Los_Angeles",
    })

    const lines = result.csv.trim().split("\n")
    expect(lines[0]).toBe(
      "Purchase date,Description,Category,Merchant,Paid by,Total amount,Currency,Share owner,Share amount,Share %,Notes",
    )
    expect(lines).toHaveLength(result.entryCount + 1)
    expect(result.entryCount).toBe(9)
    expect(result.purchaseCount).toBe(3)
    expect(result.fileName).toBe("shared-ledger-2024-06.csv")
    expect(result.monthLabel).toBe("June 2024")
    expect(result.csv).toContain("Target cleaning haul")
    expect(result.csv).toContain("Late-night grocery run")
  })

  it("respects timezone boundaries when filtering", async () => {
    const losAngeles = await exportLedgerCsv({
      month: "2024-06",
      timeZone: "America/Los_Angeles",
    })

    const utc = await exportLedgerCsv({
      month: "2024-06",
      timeZone: "UTC",
    })

    expect(losAngeles.entryCount).toBeGreaterThan(utc.entryCount)
    expect(losAngeles.csv).toContain("Late-night grocery run")
    expect(utc.csv).not.toContain("Late-night grocery run")
  })

  it("throws when the export input is invalid", async () => {
    await expect(
      exportLedgerCsv({ month: "2024/06", timeZone: "America/Los_Angeles" } as any),
    ).rejects.toThrow(/Select a valid month in YYYY-MM format/)

    await expect(
      exportLedgerCsv({ month: "2024-06", timeZone: "Invalid/Zone" } as any),
    ).rejects.toThrow(/Provide a valid time zone/)
  })
})
