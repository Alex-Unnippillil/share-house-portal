import { redirect } from "next/navigation"

import { Separator } from "@/components/ui/separator"

import AccountForm from "./supa-account-form"
import { loadAccountPageData } from "./loaders"
import NotificationPreferencesForm from "./notification-preferences-form"

export default async function SettingsAccountPage() {
  const { user, profile } = await loadAccountPageData()

  if (!user) {
    redirect("/auth")
  }

  return (
    <div className="mt-10 px-2 lg:p-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 px-2">
        <div className="flex flex-col space-y-2 text-left">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Account Profile</h1>
          <p className="text-base text-muted-foreground">
            Keep your contact details current so rent reminders, booking updates, and document alerts reach you without delay.
          </p>
        </div>
        <Separator />
        <AccountForm profile={profile} user={user} />
        <Separator />
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Notification preferences</h2>
            <p className="text-sm text-muted-foreground">
              Choose how often we bundle updates and optionally set quiet hours to pause overnight deliveries.
            </p>
          </div>
          <NotificationPreferencesForm
            userId={user.id}
            preferences={{
              digestFrequency: profile?.digestFrequency ?? "daily",
              quietHoursStart: profile?.quietHoursStart ?? null,
              quietHoursEnd: profile?.quietHoursEnd ?? null,
            }}
          />
        </div>
      </div>
    </div>
  )
}
