import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import Link from "next/link"

import { Separator } from "@/components/ui/separator"
import { tenantBillingSettings } from "@/config/tenant-settings"
import { createClient } from "@/utils/supa-server-actions"

import AccountForm from "./supa-account-form"

export default async function SettingsAccountPage() {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
            For manual e-Transfer instructions share the
            <Link
              href={tenantBillingSettings.eTransfer.fallbackDocumentationUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-1 font-medium text-primary underline-offset-4 hover:underline"
            >
              manual fallback guide
            </Link>
            with roommates who pay outside of Stripe.
          </p>
        </div>
        <Separator />
        <AccountForm user={user} />
      </div>
    </div>
  )
}
