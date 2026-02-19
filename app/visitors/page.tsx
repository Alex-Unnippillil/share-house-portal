import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  PageContainer,
  PageDescription,
  PageHeader,
  PageSection,
  PageTitle,
} from "@/components/ui/page-layout"
import { SectionStack } from "@/components/layouts/layout-primitives"
import { ManagerVisitorOversight } from "@/components/visitors/manager-visitor-oversight"
import { VisitorBookingForm } from "@/components/visitors/visitor-booking-form"

const visitorHighlights = [
  {
    title: "Policy-aware submissions",
    description:
      "Each request is checked against consecutive-night limits, blackout windows, and unit policy rules.",
  },
  {
    title: "Approval workflow",
    description:
      "Requests can require property manager approval, with statuses and decision notes tracked in visitor logs.",
  },
  {
    title: "Notifications + audit",
    description:
      "Submission, updates, and approvals notify roommates and managers while every action is logged for oversight.",
  },
]

export default async function VisitorsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isManager = false

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    isManager =
      profile?.role === "property_manager" || profile?.role === "admin"
  }

  return (
    <PageContainer variant="narrow">
      <PageHeader>
        <PageTitle>Overnight Visitor Requests</PageTitle>
        <PageDescription>
          Register guests, enforce unit policy constraints, and keep roommates
          and managers informed.
        </PageDescription>
      </PageHeader>

      <PageSection className="grid gap-8 lg:grid-cols-2">
        <Card surface="elevated">
          <CardHeader>
            <CardTitle>Register a visitor</CardTitle>
            <CardDescription>
              Capture guest details, arrival/departure, host roommate, and
              reason for stay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisitorBookingForm />
          </CardContent>
        </Card>

        <SectionStack className="space-y-card-gap">
          {visitorHighlights.map((item) => (
            <Card key={item.title} surface="glass" interactive>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </SectionStack>
      </PageSection>

      <Card surface="solid">
        <CardHeader>
          <CardTitle>Visitor policy and regional compliance</CardTitle>
          <CardDescription>
            Visitor requests are automatically evaluated against nights,
            blackout windows, and overlap rules before approval routing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-body-sm text-muted-foreground">
          <p>
            Regional occupancy, safety, and recordkeeping obligations vary.
            Managers should align unit policy settings and approval practices
            with local regulations.
          </p>
          <p>
            Review{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy" className="underline">
              Privacy
            </Link>
            , and{" "}
            <Link href="/data-retention" className="underline">
              Data Retention
            </Link>{" "}
            for enforcement and recordkeeping commitments.
          </p>
        </CardContent>
      </Card>

      {isManager ? <ManagerVisitorOversight /> : null}
    </PageContainer>
  )
}
