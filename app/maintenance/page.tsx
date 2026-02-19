import { SectionStack } from "@/components/layouts/layout-primitives"
import { MaintenanceDashboard } from "@/components/maintenance/maintenance-dashboard"
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageTitle,
} from "@/components/ui/page-layout"

export default function MaintenancePage() {
  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Maintenance Requests</PageTitle>
        <PageDescription>
          Submit issues with clear severity and access windows, then track every
          assignment and status change in a shared timeline.
        </PageDescription>
      </PageHeader>

      <SectionStack>
        <MaintenanceDashboard />
      </SectionStack>
    </PageContainer>
  )
}
