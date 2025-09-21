import { Metadata } from "next"

import { MainNav } from "@/app/dashboard/components/main-nav"
import { Search } from "@/app/dashboard/components/search"
import TeamSwitcher from "@/app/dashboard/components/team-switcher"
import { UserNav } from "@/app/dashboard/components/user-nav"
import { AdminMetrics } from "@/app/dashboard/components/admin/admin-metrics"
import { AmenitiesPanel } from "@/app/dashboard/components/admin/amenities-panel"
import { BookingCalendarPanel } from "@/app/dashboard/components/admin/booking-calendar-panel"
import { VisitorApprovalsPanel } from "@/app/dashboard/components/admin/visitor-approvals-panel"
import { LeaseManagerPanel } from "@/app/dashboard/components/admin/lease-manager-panel"
import { FloorplansPanel } from "@/app/dashboard/components/admin/floorplans-panel"
import { PaymentLedgerPanel } from "@/app/dashboard/components/admin/payment-ledger-panel"
import { readUserProfile } from "@/utils/actions"
import { normalizeRole, ROLE_LABELS } from "@/config/rbac"

export const metadata: Metadata = {
  title: "Onyx Dashboard",
  description: "Manage your Onyx account and property operations.",
}

export default async function DashboardPage() {
  const profile = await readUserProfile()
  const role = normalizeRole(profile?.role ?? undefined)

  return (
    <div className="xs:flex max-w-dvw w-full flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <TeamSwitcher />
          <MainNav className="mx-6 hidden flex-1 md:flex" role={role} />
          <div className="ml-auto flex items-center space-x-4">
            <Search />
            <UserNav
              name={profile?.full_name}
              email={profile?.email}
              avatarUrl={profile?.avatar_url ?? undefined}
              role={role}
            />
          </div>
        </div>
        <div className="px-4 pb-4 md:hidden">
          <MainNav role={role} />
        </div>
      </div>

      <div className="flex-1 space-y-12 p-6 lg:p-10">
        <section id="metrics" className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            {ROLE_LABELS[role]} overview
          </h2>
          <AdminMetrics role={role} />
        </section>

        <section id="amenities" className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Amenity controls</h2>
          <AmenitiesPanel />
        </section>

        <section id="booking-calendar" className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Booking calendar</h2>
          <BookingCalendarPanel />
        </section>

        <section id="visitor-approvals" className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Overnight visitors</h2>
          <VisitorApprovalsPanel />
        </section>

        <section id="leases" className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Leases & Documenso</h2>
          <LeaseManagerPanel />
        </section>

        <section id="floorplans" className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Floorplans & overlays</h2>
          <FloorplansPanel />
        </section>

        <section id="payments-ledger" className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Rent ledger</h2>
          <PaymentLedgerPanel />
        </section>
      </div>
    </div>
  )
}