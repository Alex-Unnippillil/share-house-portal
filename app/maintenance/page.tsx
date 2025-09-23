import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MaintenanceRequestForm } from "@/components/maintenance/maintenance-request-form";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

const maintenanceHighlights = [
  {
    title: "Quick Issue Reporting",
    description: "Report maintenance issues with photos, priority levels, and detailed descriptions.",
  },
  {
    title: "Status Tracking",
    description: "Track the progress of your maintenance requests from submission to completion.",
  },
  {
    title: "Property Manager Notifications",
    description: "Property managers are automatically notified when new requests are submitted.",
  },
];

export default function MaintenancePage() {
  return (
    <div className="container max-w-6xl space-y-10 py-12">
      <header className="space-y-4">
        <Breadcrumbs />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Maintenance Requests</h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Report maintenance issues and track their resolution with automatic notifications.
          </p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Maintenance Request</CardTitle>
              <CardDescription>
                Describe the issue, set priority, and optionally add photos. Property managers will be notified automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceRequestForm />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="grid gap-6">
            {maintenanceHighlights.map((item) => (
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
