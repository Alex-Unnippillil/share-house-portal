import { redirect } from "next/navigation";

import { buildLeaseSummaries } from "@/lib/lease-documents";
import { createClient } from "@/utils/supabase/server";

import { LeaseCard } from "./components/LeaseCard";

export default async function LeasesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data, error } = await supabase
    .from("leases")
    .select(
      `
        id,
        title,
        description,
        effective_date,
        termination_date,
        updated_at,
        lease_documents (
          id,
          name,
          status,
          requested_at,
          completed_at,
          signing_embed_url,
          documenso_download_url,
          documenso_document_id,
          documenso_envelope_id,
          storage_path,
          last_synced_at,
          created_at
        ),
        resident_leases (
          id,
          resident_id,
          role,
          is_primary,
          signed_at,
          documenso_recipient_id,
          lease_id,
          created_at,
          updated_at
        )
      `,
    )
    .eq("resident_leases.resident_id", user.id)
    .order("effective_date", { ascending: false, nullsFirst: true })
    .order("created_at", { referencedTable: "lease_documents", ascending: false });

  if (error) {
    console.error("Failed to load leases", error);
    throw new Error("Unable to load leases for your account.");
  }

  const leases = buildLeaseSummaries(data ?? [], user.id);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Leases &amp; Documents</h1>
        <p className="text-muted-foreground">
          Review active lease agreements, request signatures, and download completed paperwork.
        </p>
      </header>
      {leases.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          {leases.map((lease) => (
            <LeaseCard key={lease.id} lease={lease} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <h2 className="text-lg font-semibold">No lease documents yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        When your property manager publishes a lease agreement, it will appear here for review and
        signatures.
      </p>
    </div>
  );
}
