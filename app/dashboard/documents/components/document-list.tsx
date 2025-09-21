import { DocumentCard } from "./document-card";
import type { DocumentWithRelations } from "@/lib/documents-service";

export function DocumentList({
  documents,
  viewerRole,
}: {
  documents: DocumentWithRelations[];
  viewerRole?: string | null;
}) {
  if (!documents.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <h3 className="text-lg font-semibold">No documents yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          When your property manager prepares your lease paperwork it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {documents.map((document) => (
        <DocumentCard key={document.id} document={document} viewerRole={viewerRole} />
      ))}
    </div>
  );
}
