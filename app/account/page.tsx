
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { Separator } from "@/components/ui/separator"

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
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Account Profile</h1>
          <p className="text-justify text-base">
            Update your contact details, emergency information, and preferred rent payment method so property managers can keep
            every roommate in sync.
          </p>
        </div>
        <Separator />
        <AccountForm user={user} />
      </div>
    </div>
  )
}