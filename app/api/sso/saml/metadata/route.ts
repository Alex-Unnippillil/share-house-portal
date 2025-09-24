import { z } from "zod";

import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { parseSamlMetadata } from "@/lib/saml";
import type { TablesInsert } from "@/lib/supabase";

const roleEnum = z.enum([
  "tenant",
  "roommate",
  "property_manager",
  "admin",
  "user",
]);

const metadataIngestionSchema = z
  .object({
    tenantId: z.string().uuid(),
    metadataUrl: z.string().url().optional(),
    metadataXml: z.string().min(1).optional(),
    defaultRole: roleEnum.optional(),
    attributeMapping: z
      .object({
        email: z.string().min(1).optional(),
        fullName: z.string().min(1).optional(),
        role: z.string().min(1).optional(),
        tenant: z.string().min(1).optional(),
      })
      .optional(),
  })
  .refine((value) => value.metadataUrl || value.metadataXml, {
    message: "Provide either metadataXml or metadataUrl",
    path: ["metadataXml"],
  });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = metadataIngestionSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid SAML metadata payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    tenantId,
    metadataUrl,
    metadataXml,
    defaultRole,
    attributeMapping,
  } = parsed.data;

  let metadataDocument = metadataXml ?? "";

  if (!metadataDocument && metadataUrl) {
    try {
      const response = await fetch(metadataUrl);
      if (!response.ok) {
        return Response.json(
          {
            error: `Unable to fetch metadata from ${metadataUrl}.`,
            statusText: response.statusText,
          },
          { status: 502 },
        );
      }
      metadataDocument = await response.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json(
        { error: `Failed to download metadata: ${message}` },
        { status: 502 },
      );
    }
  }

  let metadata;
  try {
    metadata = parseSamlMetadata(metadataDocument);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Invalid SAML metadata: ${message}` },
      { status: 422 },
    );
  }

  let supabase;
  try {
    supabase = getSupabaseServiceRoleClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: message },
      { status: 500 },
    );
  }

  const upsertPayload: TablesInsert<'saml_identity_providers'> = {
    tenant_id: tenantId,
    entity_id: metadata.entityId,
    sso_url: metadata.singleSignOnService,
    slo_url: metadata.singleLogoutService ?? null,
    certificate: metadata.certificate ?? null,
    metadata_xml: metadataDocument,
    metadata_url: metadataUrl ?? null,
    default_role: defaultRole ?? "tenant",
    attribute_mapping: attributeMapping ?? {},
  };

  if (metadataUrl) {
    upsertPayload.last_fetched_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("saml_identity_providers")
    .upsert(upsertPayload, { onConflict: "tenant_id" })
    .select(
      "tenant_id, entity_id, sso_url, slo_url, default_role, attribute_mapping",
    )
    .single();

  if (error) {
    return Response.json(
      {
        error: "Failed to store SAML metadata configuration.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  return Response.json({
    tenantId: data.tenant_id,
    entityId: data.entity_id,
    ssoUrl: data.sso_url,
    sloUrl: data.slo_url,
    defaultRole: data.default_role,
    attributeMapping: data.attribute_mapping ?? {},
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId");

  if (!tenantId) {
    return Response.json(
      { error: "tenantId query parameter is required." },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = getSupabaseServiceRoleClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("saml_identity_providers")
    .select(
      "tenant_id, entity_id, sso_url, slo_url, metadata_url, default_role, attribute_mapping",
    )
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    return Response.json(
      {
        error: "Failed to load SAML metadata configuration.",
        details: error.message,
      },
      { status: 500 },
    );
  }

  if (!data) {
    return Response.json({ error: "Metadata not found." }, { status: 404 });
  }

  return Response.json({
    tenantId: data.tenant_id,
    entityId: data.entity_id,
    ssoUrl: data.sso_url,
    sloUrl: data.slo_url,
    metadataUrl: data.metadata_url,
    defaultRole: data.default_role,
    attributeMapping: data.attribute_mapping ?? {},
  });
}
