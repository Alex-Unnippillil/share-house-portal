import { VisitorExperience } from "@/components/visitors/visitor-experience";

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

      <VisitorExperience />
    </div>
  );
}
