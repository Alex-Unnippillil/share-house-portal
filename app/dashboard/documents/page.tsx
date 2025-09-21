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
import { documensoClient } from "@/lib/documenso-client";
import { createSupbaseServerClient } from "@/utils/supaone";
import { StartEnvelopeForm } from "./components/StartEnvelopeForm";

export default async function DocumentsPage() {
  const supabase = await createSupbaseServerClient();

  const [{ data: documents, error: documentsError }, { data: tenants }]
    = await Promise.all([
      supabase
        .from("documents")
        .select(
          "id,title,description,is_active,documenso_template_id,updated_at,created_at",
        )
        .order("title", { ascending: true }),
      supabase
        .from("profiles")
        .select("id,full_name,email,role,username")
        .order("full_name", { ascending: true }),
    ]);

  let templatesMessage: string | null = null;
  let templates = [] as Awaited<ReturnType<typeof documensoClient.listTemplates>>;

  if (documensoClient.isConfigured) {
    try {
      templates = await documensoClient.listTemplates();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      templatesMessage = `Unable to load Documenso templates: ${message}`;
    }
  } else {
    templatesMessage = "Documenso API credentials are not configured.";
  }

  const tenantOptions = (tenants ?? []).filter((tenant) =>
    ["tenant", "roommate", "property_manager"].includes(tenant.role ?? ""),
  );

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Lease Documents</h1>
            <p className="text-muted-foreground">
              Manage Documenso templates and send new envelopes to tenants for
              signature.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/leases">View Lease Status</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Documenso templates</CardTitle>
            <CardDescription>
              Templates are synced from your self-hosted Documenso instance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {templatesMessage ? (
              <p className="text-sm text-muted-foreground">{templatesMessage}</p>
            ) : null}
            {templates.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-md border p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description ? (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="secondary">{template.status ?? "active"}</Badge>
                    </div>
                    {template.updated_at ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Updated {new Date(template.updated_at).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No templates were returned from Documenso.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Available documents</h2>
        {documentsError ? (
          <p className="text-sm text-destructive">{documentsError.message}</p>
        ) : null}
        {documents?.length ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {documents.map((document) => (
              <Card key={document.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{document.title}</CardTitle>
                      {document.description ? (
                        <CardDescription>{document.description}</CardDescription>
                      ) : null}
                    </div>
                    <Badge variant={document.is_active ? "default" : "secondary"}>
                      {document.is_active ? "Active" : "Archived"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Template ID: {document.documenso_template_id}
                  </p>
                  <StartEnvelopeForm document={document} tenants={tenantOptions} />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              There are no documents configured. Create a template in Documenso
              and sync it to Supabase.
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
