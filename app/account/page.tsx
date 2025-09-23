import { redirect } from "next/navigation"

import { Separator } from "@/components/ui/separator"

import AccountForm from "./supa-account-form"
import { loadAccountPageData } from "./loaders"

export default async function SettingsAccountPage() {
  const { user, profile } = await loadAccountPageData()

  if (!user) {
    redirect("/auth")
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-10 lg:px-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Profile &amp; preferences</h1>
        <p className="text-base text-muted-foreground sm:max-w-2xl">
          Keep your information polished so rent reminders, amenity bookings, and document alerts reach the right roommate every
          time.
        </p>
      </div>
      <Separator />
      <AccountForm profile={profile} user={user} />
    </div>
  )
}
