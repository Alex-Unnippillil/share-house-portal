import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageContainer } from "@/components/ui/page-layout"
import { ActivityTimeline } from "@/components/patterns/activity-timeline"
import { StatusBadge } from "@/components/patterns/status-badge"

const timelineItems = [
  {
    id: "1",
    title: "Rent payment posted",
    description: "Stripe confirmed your February rent contribution.",
    timestamp: "Today, 8:35 AM",
    meta: "Receipt #RNT-2031",
  },
  {
    id: "2",
    title: "Kitchen booking approved",
    description: "Your dinner booking was confirmed for 7:00 PM.",
    timestamp: "Yesterday, 5:12 PM",
  },
  {
    id: "3",
    title: "Maintenance update",
    description: "Property manager assigned a plumber to the sink issue.",
    timestamp: "Yesterday, 9:40 AM",
    meta: "Ticket #MX-72",
  },
]

export default function DesignSystemPage() {
  return (
    <PageContainer variant="dashboard" className="flex flex-col gap-section py-section">
      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">
            Status badge patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <StatusBadge domain="payment" status="paid" />
          <StatusBadge domain="payment" status="pending" />
          <StatusBadge domain="booking" status="confirmed" />
          <StatusBadge domain="booking" status="conflict" />
          <StatusBadge domain="maintenance" status="inProgress" />
          <StatusBadge domain="maintenance" status="resolved" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-heading-md">Timeline pattern</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline items={timelineItems} />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
