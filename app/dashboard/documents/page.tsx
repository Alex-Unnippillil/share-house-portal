import { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentList } from "./components/document-list";
import {
  DocumentWithRelations,
  filterDocumentsForViewer,
} from "@/lib/documents-service";
import { createSupbaseServerClient } from "@/utils/supaone";

export const metadata: Metadata = {
  title: "Lease documents",
};

export default async function DocumentsPage() {
  const supabase = await createSupbaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", session.user.id)
    .single();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "*, tenant:profiles!documents_tenant_id_fkey(id, full_name, email), lease_versions(*)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load documents", error);
  }

  const documents = (data ?? []) as DocumentWithRelations[];
  const filtered = filterDocumentsForViewer(documents, session.user.id, profile?.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-muted-foreground">
          Review lease templates, track Documenso envelopes, and download signed copies.
        </p>
      </div>

      <DocumentList documents={filtered} viewerRole={profile?.role} />
    </div>
  );
}
