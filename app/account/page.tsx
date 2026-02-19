import { redirect } from "next/navigation"

import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageTitle,
} from "@/components/ui/page-layout"

import { loadAccountPageData } from "./loaders"
import AccountForm from "./supa-account-form"

export default async function SettingsAccountPage() {
  const { user, profile } = await loadAccountPageData()

  if (!user) {
    redirect("/auth")
  }

  return (
    <PageContainer variant="narrow" className="route-readable">
      <PageHeader>
        <PageTitle>Account Profile</PageTitle>
        <PageDescription>
          Keep your contact details current so rent reminders, booking updates,
          and document alerts reach you without delay.
        </PageDescription>
      </PageHeader>

      <AccountForm profile={profile} user={user} />
    </PageContainer>
  )
}
