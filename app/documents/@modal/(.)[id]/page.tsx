import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getDocumentByIdAction } from "@/app/documents/actions";
import { DocumentPreviewSkeleton } from "@/app/documents/components/document-preview-skeleton";

interface DocumentModalPageProps {
  params: { id: string };
  searchParams: { modal?: string };
}

async function DocumentPreviewModalLoader({ id }: { id: string }) {
  const result = await getDocumentByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const { DocumentPreviewModal } = await import("@/app/documents/components/document-preview-modal");

  return <DocumentPreviewModal document={result.data} />;
}

export default function DocumentModalPage({ params, searchParams }: DocumentModalPageProps) {
  if (searchParams?.modal !== "preview") {
    return null;
  }

  return (
    <Suspense fallback={<DocumentPreviewSkeleton />}>
      {/* @ts-expect-error Async Server Component */}
      <DocumentPreviewModalLoader id={params.id} />
    </Suspense>
  );
}
