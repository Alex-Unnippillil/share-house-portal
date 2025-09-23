import React from "react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => {
  return {
    __esModule: true,
    default: React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
      ({ children, ...props }, ref) => (
        <a ref={ref} {...props}>
          {children}
        </a>
      ),
    ),
  }
})

import { renderToStaticMarkup } from "react-dom/server"
import { FileText, PiggyBank, Users } from "lucide-react"

import { EmptyState } from "@/components/empty-states/EmptyState"
import {
  DOCUMENTS_EMPTY_STATE_ROUTE,
  DOCUMENTS_EMPTY_STATE_SAMPLES,
  MEMBERS_EMPTY_STATE_ROUTE,
  MEMBERS_EMPTY_STATE_SAMPLES,
  ROOMMATE_LEDGER_EMPTY_STATE_ROUTE,
  ROOMMATE_LEDGER_EMPTY_STATE_SAMPLES,
} from "@/components/empty-states/presets"

describe("EmptyState snapshots", () => {
  it("renders documents empty state with sample entries", () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        surface="documents:list"
        title="Bring your first document online"
        description="Import lease packets from Documenso or upload roommate paperwork to keep everyone aligned."
        illustration={<FileText className="size-12 text-muted-foreground" />}
        sampleItems={DOCUMENTS_EMPTY_STATE_SAMPLES}
        primaryAction={{
          href: DOCUMENTS_EMPTY_STATE_ROUTE,
          label: "Create",
        }}
      />,
    )

    expect(markup).toMatchInlineSnapshot(`"<div class="rounded-xl border bg-card text-card-foreground shadow flex flex-col items-center gap-8 p-10 text-center sm:p-12"><div aria-hidden="true" class="flex h-20 w-20 items-center justify-center rounded-full bg-muted"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text size-12 text-muted-foreground"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" x2="8" y1="13" y2="13"></line><line x1="16" x2="8" y1="17" y2="17"></line><line x1="10" x2="8" y1="9" y2="9"></line></svg></div><div class="space-y-2"><h3 class="text-xl font-semibold">Bring your first document online</h3><p class="text-sm text-muted-foreground">Import lease packets from Documenso or upload roommate paperwork to keep everyone aligned.</p></div><div class="w-full max-w-md rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-5 text-left"><p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example entries</p><ul class="mt-4 space-y-4"><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Lease agreement — Unit 2A</p><span class="text-xs font-medium uppercase text-muted-foreground">Pending signatures</span></div><p class="text-xs text-muted-foreground">Documenso template for the primary roommate lease this season.</p></li><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Pet policy addendum</p><span class="text-xs font-medium uppercase text-muted-foreground">Awaiting review</span></div><p class="text-xs text-muted-foreground">Tracks approvals for roommates bringing new pets into the unit.</p></li><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Move-in checklist</p><span class="text-xs font-medium uppercase text-muted-foreground">Signed</span></div><p class="text-xs text-muted-foreground">Shared acknowledgment of keys, parking passes, and storage lockers.</p></li></ul></div><a href="/documents/upload" aria-label="Create bring your first document online" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:active:translate-y-px motion-safe:active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 py-2 px-6">Create</a></div>"`)
  })

  it("renders members empty state with invite guidance", () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        surface="dashboard:members"
        title="Invite your first household member"
        description="Track roles, onboarding progress, and payment permissions by adding roommates and managers."
        illustration={<Users className="size-12 text-muted-foreground" />}
        sampleItems={MEMBERS_EMPTY_STATE_SAMPLES}
        primaryAction={{
          href: MEMBERS_EMPTY_STATE_ROUTE,
          label: "Create",
        }}
      />,
    )

    expect(markup).toMatchInlineSnapshot(`"<div class="rounded-xl border bg-card text-card-foreground shadow flex flex-col items-center gap-8 p-10 text-center sm:p-12"><div aria-hidden="true" class="flex h-20 w-20 items-center justify-center rounded-full bg-muted"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users size-12 text-muted-foreground"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div><div class="space-y-2"><h3 class="text-xl font-semibold">Invite your first household member</h3><p class="text-sm text-muted-foreground">Track roles, onboarding progress, and payment permissions by adding roommates and managers.</p></div><div class="w-full max-w-md rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-5 text-left"><p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example entries</p><ul class="mt-4 space-y-4"><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Avery Johnson</p><span class="text-xs font-medium uppercase text-muted-foreground">Role · admin</span></div><p class="text-xs text-muted-foreground">Property manager overseeing billing, documents, and messaging.</p></li><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Skylar Chen</p><span class="text-xs font-medium uppercase text-muted-foreground">Status · active</span></div><p class="text-xs text-muted-foreground">Roommate contributing $950 monthly via autopay.</p></li><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Jordan Patel</p><span class="text-xs font-medium uppercase text-muted-foreground">Status · invited</span></div><p class="text-xs text-muted-foreground">Invited roommate awaiting onboarding tasks.</p></li></ul></div><a href="/dashboard/members/create" aria-label="Create invite your first household member" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:active:translate-y-px motion-safe:active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 py-2 px-6">Create</a></div>"`)
  })

  it("renders roommate ledger empty state with ledger examples", () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        surface="payments:roommate-ledger"
        title="Start tracking roommate balances"
        description="Log contributions and adjustments so every roommate sees the same running total."
        illustration={<PiggyBank className="size-12 text-muted-foreground" />}
        sampleItems={ROOMMATE_LEDGER_EMPTY_STATE_SAMPLES}
        primaryAction={{
          href: ROOMMATE_LEDGER_EMPTY_STATE_ROUTE,
          label: "Create",
        }}
      />,
    )

    expect(markup).toMatchInlineSnapshot(`"<div class="rounded-xl border bg-card text-card-foreground shadow flex flex-col items-center gap-8 p-10 text-center sm:p-12"><div aria-hidden="true" class="flex h-20 w-20 items-center justify-center rounded-full bg-muted"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-piggy-bank size-12 text-muted-foreground"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"></path><path d="M2 9v1c0 1.1.9 2 2 2h1"></path><path d="M16 11h0"></path></svg></div><div class="space-y-2"><h3 class="text-xl font-semibold">Start tracking roommate balances</h3><p class="text-sm text-muted-foreground">Log contributions and adjustments so every roommate sees the same running total.</p></div><div class="w-full max-w-md rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-5 text-left"><p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example entries</p><ul class="mt-4 space-y-4"><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Jamie Rivera</p><span class="text-xs font-medium uppercase text-muted-foreground">Balance · $120 due</span></div><p class="text-xs text-muted-foreground">Autopay posted $950 for July rent and utilities.</p></li><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Morgan Lee</p><span class="text-xs font-medium uppercase text-muted-foreground">Balance · $0</span></div><p class="text-xs text-muted-foreground">Property manager logged a $45 internet reimbursement.</p></li><li class="space-y-1"><div class="flex items-start justify-between gap-3"><p class="text-sm font-medium text-foreground">Priya Desai</p><span class="text-xs font-medium uppercase text-muted-foreground">Balance · $340 due</span></div><p class="text-xs text-muted-foreground">Manual catch-up payment scheduled for the 15th.</p></li></ul></div><a href="/payments/catch-up" aria-label="Create start tracking roommate balances" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:active:translate-y-px motion-safe:active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 py-2 px-6">Create</a></div>"`)
  })
})
