import { Suspense, type ReactNode } from "react"

import { redirect } from "next/navigation"

import { createClient } from "@/utils/supabase/server"

import MobileSideNav from "./components/client/mobile-side-nav"
import { type NavLinkItem } from "./components/client/nav-links"
import SideNav from "./components/side-nav"

interface LayoutProps {
  children: ReactNode
}

export default async function Layout({ children }: LayoutProps) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle()

  const navLinks = getNavLinksForRole(profile?.role ?? null)

  return (
    <div className="flex w-full">
      <div className="flex h-screen flex-col">
        <SideNav links={navLinks} />
      </div>

      <div className="w-full space-y-5 bg-gray-100 p-5 sm:flex-1 sm:p-10 dark:bg-inherit">
        <MobileSideNav links={navLinks} />
        <Suspense fallback={<DashboardFallback />}>{children}</Suspense>
      </div>
    </div>
  )
}

function getNavLinksForRole(role: string | null): NavLinkItem[] {
  const isLandlord = ["property_manager", "admin", "landlord"].includes(
    role ?? ""
  )

  if (isLandlord) {
    return [
      { href: "/dashboard/members", label: "Members", icon: "members" },
      { href: "/payments", label: "Payments", icon: "payments" },
      { href: "/documents", label: "Documents", icon: "documents" },
      { href: "/messaging", label: "Message Board", icon: "messaging" },
    ]
  }

  return [
    { href: "/payments", label: "Payments", icon: "payments" },
    { href: "/documents", label: "My Lease", icon: "documents" },
    { href: "/messaging", label: "Message Board", icon: "messaging" },
    { href: "/chores", label: "Chores", icon: "chores" },
    { href: "/supplies", label: "Supplies", icon: "supplies" },
  ]
}

function DashboardFallback() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-40 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
