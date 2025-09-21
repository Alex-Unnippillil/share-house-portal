import { Metadata } from "next"

import { DocumentApprovalTable } from "@/app/dashboard/components/document-approval-table"
import { DocumentApprovalsCard } from "@/app/dashboard/components/document-approvals-card"
import { MainNav } from "@/app/dashboard/components/main-nav"
import { Search } from "@/app/dashboard/components/search"
import TeamSwitcher from "@/app/dashboard/components/team-switcher"
import { UserNav } from "@/app/dashboard/components/user-nav"
import { fetchDocumentApprovals, resolveAccessContext } from "@/app/dashboard/lib/data-sources"
import { createSupbaseServerClientReadOnly } from "@/utils/supaone"

export const metadata: Metadata = {
  title: "Document workflows",
  description: "Track leases and compliance packets awaiting manager action.",
}

type DocumentsPageProps = {
  searchParams?: {
    building?: string
  }
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const supabase = await createSupbaseServerClientReadOnly()
  const { context, activeBuilding } = await resolveAccessContext(
    supabase,
    searchParams?.building ?? null
  )

  const approvals = await fetchDocumentApprovals(context, activeBuilding.id)

  return (
    <div className="xs:flex max-w-dvw w-full flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <TeamSwitcher
            buildings={context.buildings}
            selectedBuildingId={activeBuilding.id}
            role={context.profile.role}
          />
          <MainNav className="mx-6" buildingId={activeBuilding.id} role={context.profile.role} />
          <div className="ml-auto flex items-center space-x-4">
            <Search buildingName={activeBuilding.name} />
            <UserNav />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Document approvals</h1>
          <p className="text-sm text-muted-foreground">
            Ensure leases, addenda, and policy acknowledgements are fully executed.
          </p>
        </div>
        <DocumentApprovalsCard approvals={approvals} />
        <DocumentApprovalTable approvals={approvals} />
      </div>
    </div>
  )
}
