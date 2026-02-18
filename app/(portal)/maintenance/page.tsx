import { MaintenanceDashboard } from "@/components/maintenance/maintenance-dashboard";

export default function MaintenancePage() {
  return (
    <div className="container max-w-7xl space-y-8 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Maintenance Requests</h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Submit issues with clear severity and access windows, then track every assignment and status change in a shared timeline.
        </p>
      </header>

      <MaintenanceDashboard />
    </div>
  );
}
