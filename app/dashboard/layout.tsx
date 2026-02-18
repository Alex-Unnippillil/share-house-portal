import { Suspense, type ReactNode } from "react"

import { redirect } from "next/navigation"

import { ErrorBoundary } from "@/components/feedback/ErrorBoundary"
import { RouteSkeleton } from "@/components/feedback/RouteSkeleton"
import { readUserSession } from "@/utils/actions"
import MobileSideNav from "./components/MobileSideNav"
import SideNav from "./components/SideNav"
import ToggleSidebar from "./components/ToggleSidebar"

export default async function Layout({ children }: { children: ReactNode }) {
  const { data: userSession } = await readUserSession()

  if (!userSession.session) {
    return redirect("/auth")
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/20">
      <div className="flex h-screen flex-col">
        <SideNav />
        <MobileSideNav />
      </div>

      <main className="w-full space-y-4 px-4 pb-8 pt-4 sm:flex-1 sm:px-8 sm:pt-6 lg:px-10">
        <ToggleSidebar />
        <ErrorBoundary>
          <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
