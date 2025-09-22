import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getDocumentByIdAction } from "../actions";
import { DocumentPreviewContent } from "../components/document-preview-content";

interface DocumentPageProps {
  params: { id: string };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  const result = await getDocumentByIdAction(params.id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="container max-w-6xl space-y-6 py-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/documents">
            <ArrowLeft className="mr-2 size-4" />
            Back to documents
          </Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <DocumentPreviewContent document={result.data} />
      </div>
    </div>
  );
}
