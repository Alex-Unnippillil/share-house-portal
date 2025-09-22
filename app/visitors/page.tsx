import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VisitorBookingForm } from "@/components/visitors/visitor-booking-form";
import { PRODUCT_MARKETING_REVALIDATE_SECONDS } from '@/config/isr'

export const dynamic = 'force-static'
export const revalidate = PRODUCT_MARKETING_REVALIDATE_SECONDS

const visitorHighlights = [
  {
    title: "Easy Guest Registration",
    description: "Register overnight visitors with all necessary details and get approval from roommates.",
  },
  {
    title: "Automatic Notifications",
    description: "Roommates and property managers are automatically notified of new visitor requests.",
  },
  {
    title: "Stay Limits",
    description: "Enforce policy limits on consecutive nights and track visitor history.",
  },
];

export default function VisitorsPage() {
  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Visitor Bookings</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Register overnight guests and keep everyone in the loop with automatic notifications.
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Register New Visitor</CardTitle>
              <CardDescription>
                Fill out the form to register an overnight guest. All roommates will be notified automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VisitorBookingForm />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid gap-6">
            {visitorHighlights.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
