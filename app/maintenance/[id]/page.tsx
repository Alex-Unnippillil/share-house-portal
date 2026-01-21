import Link from "next/link";

import ActivityFeed from "@/components/activity/ActivityFeed";
import { Separator } from "@/components/ui/separator";

interface MaintenanceDetailPageProps {
  params: { id: string };
}

export default function MaintenanceDetailPage({
  params,
}: MaintenanceDetailPageProps) {
  const requestId = params.id;

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-2">
        <Link
          href="/maintenance"
          className="text-sm text-muted-foreground transition hover:text-primary"
        >
          ← Back to maintenance
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Maintenance request activity</h1>
          <p className="text-sm text-muted-foreground">
            Follow-up comments, attachments, and status history for request {requestId}.
          </p>
        </div>
      </div>

      <Separator />

      <ActivityFeed entityId={requestId} entityType="maintenance" />
    </div>
  );
}
