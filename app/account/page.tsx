import { redirect } from "next/navigation"

import { Separator } from "@/components/ui/separator"

import { loadAccountPageData } from "./loaders"
import AccountForm from "./supa-account-form"

export default async function SettingsAccountPage() {
  const { user, profile } = await loadAccountPageData()

  if (!user) {
    redirect("/auth")
  }

  return (
    <div className="layout-content py-dashboard-y">
      <div className="route-readable mx-auto flex w-full flex-col justify-center space-y-section">
        <div className="flex flex-col space-y-2 text-left">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">
            Account Profile
          </h1>
          <p className="text-base text-muted-foreground">
            Keep your contact details current so rent reminders, booking
            updates, and document alerts reach you without delay.
          </p>
        </div>
        <Separator />
        <AccountForm profile={profile} user={user} />
      </div>
    </div>
  )
}
