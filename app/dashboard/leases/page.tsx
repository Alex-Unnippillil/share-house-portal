import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSupbaseServerClient } from "@/utils/supaone";
import { normalizeEnvelopeStatus } from "@/lib/documenso-client";

const statusVariant: Record<string, string> = {
  draft: "secondary",
  sent: "default",
  viewed: "default",
  completed: "complete",
  declined: "destructive",
  expired: "destructive",
  error: "destructive",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

export default async function LeasesPage() {
  const supabase = await createSupbaseServerClient();
  const { data: leases, error } = await supabase
    .from("lease_versions")
    .select(
      `id, status, version_number, documenso_envelope_id, completed_at, expires_at, created_at,
       documents:documents (title),
       tenant:profiles!lease_versions_tenant_profile_id_fkey (full_name, email),
       document_signers (name, email, status, signed_at, signing_order)`
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Lease Status</h1>
          <p className="text-muted-foreground">
            Track Documenso envelopes and download signed agreements.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/documents">Create envelope</Link>
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}

      {leases?.length ? (
        <div className="grid gap-6">
          {leases.map((lease) => {
            const documentTitle = lease.documents?.title ?? "Untitled document";
            const normalizedStatus = normalizeEnvelopeStatus(lease.status);
            const badgeVariant = statusVariant[normalizedStatus] ?? "secondary";
            const signers = lease.document_signers ?? [];
            const tenantName = lease.tenant?.full_name ?? lease.tenant?.email ?? "Unknown tenant";

            return (
              <Card key={lease.id}>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{documentTitle}</CardTitle>
                    <CardDescription>
                      Version {lease.version_number} • Sent to {tenantName}
                    </CardDescription>
                  </div>
                  <Badge variant={badgeVariant}>{normalizedStatus}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Envelope ID
                      </p>
                      <p className="break-all font-medium">
                        {lease.documenso_envelope_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Completed
                      </p>
                      <p className="font-medium">{formatDate(lease.completed_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Expires
                      </p>
                      <p className="font-medium">{formatDate(lease.expires_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground">
                        Created
                      </p>
                      <p className="font-medium">{formatDate(lease.created_at)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Signers</p>
                    {signers.length ? (
                      <ul className="mt-2 space-y-2">
                        {signers.map((signer) => (
                          <li
                            key={`${lease.id}-${signer.email}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                          >
                            <div>
                              <p className="font-medium">{signer.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {signer.email}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">
                                {normalizeEnvelopeStatus(signer.status)}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Signed {formatDate(signer.signed_at)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Signer details will appear after Documenso notifies the
                        system.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      asChild
                      variant="secondary"
                      disabled={normalizedStatus !== "completed"}
                    >
                      <Link
                        href={`/api/documenso/envelopes/${lease.documenso_envelope_id}`}
                        prefetch={false}
                      >
                        Download signed PDF
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Downloads are recorded for auditing.
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No lease envelopes yet. Start by sending a template from the
            Documents tab.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
