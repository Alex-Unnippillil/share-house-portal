import Link from "next/link";

import ActivityFeed from "@/components/activity/ActivityFeed";
import { Separator } from "@/components/ui/separator";

interface DocumentDetailPageProps {
  params: { id: string };
}

export default function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const documentId = params.id;

  return (
    <div className="container max-w-4xl space-y-6 py-10">
      <div className="space-y-2">
        <Link
          href="/documents"
          className="text-sm text-muted-foreground transition hover:text-primary"
        >
          ← Back to documents
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Document activity</h1>
          <p className="text-sm text-muted-foreground">
            Timeline of updates, comments, and shared files for document {documentId}.
          </p>
        </div>
      </div>

      <Separator />

      <ActivityFeed entityId={documentId} entityType="document" />
    </div>
  );
}
