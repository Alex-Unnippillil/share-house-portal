import { redirect } from "next/navigation"

import { Separator } from "@/components/ui/separator"

import { NotificationPreferencesForm } from "./preferences-form"
import { loadNotificationPreferencesPage } from "./loaders"

export default async function NotificationPreferencesPage() {
  const { user, preferences } = await loadNotificationPreferencesPage()

  if (!user) {
    redirect("/auth")
  }

  return (
    <div className="mt-10 px-2 lg:p-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Notification Preferences
          </h1>
          <p className="text-base text-muted-foreground">
            Choose how often we bundle updates and set quiet hours when push
            alerts should pause.
          </p>
        </div>
        <Separator />
        <NotificationPreferencesForm
          userId={user.id}
          initialPreferences={preferences}
        />
      </div>
    </div>
  )
}
