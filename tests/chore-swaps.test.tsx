import fs from "node:fs"
import path from "node:path"

import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { PendingSwapCard } from "@/components/chores/pending-swap-card"
import type { ChoreSwapWithAssignments, SwapActionResult } from "@/components/chores/types"

const sampleSwap: ChoreSwapWithAssignments = {
  id: 42,
  requester_id: "requester-1",
  counterparty_id: "counterparty-1",
  requester_assignment_id: 10,
  counterparty_assignment_id: 11,
  proposed_credit_transfer: 3,
  status: "pending",
  message: "Can you take my Sunday kitchen shift?",
  created_at: new Date().toISOString(),
  responded_at: null,
  responded_by: null,
  decline_reason: null,
  requester_assignment: {
    id: 10,
    assignment_label: "Kitchen deep clean",
    assignment_date: "2024-07-14",
    assigned_profile_id: "requester-1",
    credits: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "manager-1",
  },
  counterparty_assignment: {
    id: 11,
    assignment_label: "Lobby vacuum",
    assignment_date: "2024-07-13",
    assigned_profile_id: "counterparty-1",
    credits: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: "manager-1",
  },
  requester: { id: "requester-1", full_name: "Riley" },
  counterparty: { id: "counterparty-1", full_name: "Jordan" },
}

describe("PendingSwapCard", () => {
  it("invokes the accept action with the swap identifier", async () => {
    const acceptSpy = vi.fn<
      (formData: FormData) => Promise<SwapActionResult>
    >().mockResolvedValue({ success: true, message: "Swap accepted. Credits ledger updated." })
    const declineSpy = vi.fn<
      (formData: FormData) => Promise<SwapActionResult>
    >().mockResolvedValue({ success: true })

    render(
      <PendingSwapCard
        swap={sampleSwap}
        viewerId="counterparty-1"
        canRespond
        acceptAction={acceptSpy}
        declineAction={declineSpy}
      />, 
    )

    const acceptButton = screen.getByRole("button", { name: /accept swap/i })
    await userEvent.click(acceptButton)

    await waitFor(() => expect(acceptSpy).toHaveBeenCalledTimes(1))

    const formData = acceptSpy.mock.calls[0][0]
    expect(formData.get("swapId")).toBe(String(sampleSwap.id))
    expect(screen.getByText(/swap accepted/i)).toBeTruthy()
  })

  it("submits a decline reason when provided", async () => {
    const acceptSpy = vi.fn<
      (formData: FormData) => Promise<SwapActionResult>
    >().mockResolvedValue({ success: true })
    const declineSpy = vi.fn<
      (formData: FormData) => Promise<SwapActionResult>
    >().mockResolvedValue({ success: true, message: "Declined with context" })

    const sanityCheck = new FormData()
    sanityCheck.append("example", "value")
    expect(sanityCheck.get("example")).toBe("value")

    render(
      <PendingSwapCard
        swap={sampleSwap}
        viewerId="counterparty-1"
        canRespond
        acceptAction={acceptSpy}
        declineAction={declineSpy}
      />, 
    )

    const reasonField = screen.getByLabelText(/decline reason/i)
    await userEvent.clear(reasonField)
    await userEvent.type(reasonField, "Heading out of town that weekend")
    expect((reasonField as HTMLTextAreaElement).value).toBe("Heading out of town that weekend")

    const declineButtons = screen.getAllByRole("button", { name: /decline swap/i })
    const declineButton = declineButtons[declineButtons.length - 1]
    await userEvent.click(declineButton)

    await waitFor(() => expect(declineSpy).toHaveBeenCalled())

    const formData = declineSpy.mock.calls[0][0]
    expect(formData.get("swapId")).toBe(String(sampleSwap.id))
    expect(screen.getByText(/declined with context/i)).toBeTruthy()
  })
})

describe("chore swap migration", () => {
  const migrationPath = path.join(process.cwd(), "supabase/migrations/20250719_chore_swaps.sql")
  const migrationSql = fs.readFileSync(migrationPath, "utf8")

  it("enables row level security across swap tables", () => {
    expect(migrationSql).toContain("alter table public.chore_assignments enable row level security;")
    expect(migrationSql).toContain("alter table public.chore_swaps enable row level security;")
    expect(migrationSql).toContain("alter table public.chore_credit_ledger enable row level security;")
  })

  it("defines participant facing policies", () => {
    expect(migrationSql).toMatch(/create policy if not exists \"Participants can view chore swaps\"/i)
    expect(migrationSql).toMatch(/create policy if not exists \"Requesters can create chore swaps\"/i)
    expect(migrationSql).toMatch(/create policy if not exists \"Participants manage pending chore swaps\"/i)
    expect(migrationSql).toMatch(/create policy if not exists \"Roommates can view their ledger entries\"/i)
  })
})
