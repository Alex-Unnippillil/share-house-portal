import { DashboardOverview } from "@/components/dashboard/dashboard-overview"
import type { DashboardOverviewData } from "@/types/perf"

const defaultDashboardData: DashboardOverviewData = {
  hero: {
    greeting: "Welcome back",
    actions: [{ label: "Pay rent", href: "/payments" }],
  },
  rentCard: {
    title: "Next rent due",
    label: "Amount",
    amount: "$1,260.00",
    due: "Due on the 1st",
    cta: { label: "View details", href: "/payments" },
  },
  documentsCard: {
    title: "Latest documents",
    items: ["Lease agreement v2.pdf", "House rules.pdf"],
    cta: { label: "Open", href: "/documents", variant: "outline" },
  },
  roommateBoard: {
    title: "Roommate board",
    items: [
      "Jordan: Wi-Fi is down, rebooted router.",
      "Avery: Parking spot swap this weekend?",
    ],
    cta: { label: "Go to messages", href: "/messaging", variant: "outline" },
  },
}

export default function DashboardPage() {
  return <DashboardOverview data={defaultDashboardData} />
}
