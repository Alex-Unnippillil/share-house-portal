import { z } from "zod";

import { parseSamlAssertion } from "@/lib/saml";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

const uuidSchema = z.string().uuid();

type AllowedRole =
  | "tenant"
  | "roommate"
  | "property_manager"
  | "admin"
  | "user";

const allowedRoles = new Set<AllowedRole>([
  "tenant",
  "roommate",
  "property_manager",
  "admin",
  "user",
]);

type AttributeMapping = {
  email?: string;
  fullName?: string;
  role?: string;
  tenant?: string;
};

type RelayState = {
  tenantId?: string;
  redirectTo?: string;
};

function parseRelayState(value: FormDataEntryValue | null): RelayState {
  if (!value || typeof value !== "string") {
    return {};
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return {
        tenantId:
          typeof parsed.tenantId === "string" ? parsed.tenantId : undefined,
        redirectTo:
          typeof parsed.redirectTo === "string"
            ? parsed.redirectTo
            : undefined,
      };
    }
  } catch (error) {
    return { tenantId: trimmed };
  }

  return {};
}

function buildAttributeMap(attributes: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();

  for (const [key, value] of Object.entries(attributes)) {
    map.set(key, value);
    map.set(key.toLowerCase(), value);
  }

  return map;
}

function getAttribute(
  attributeMap: Map<string, string>,
  ...keys: Array<string | undefined>
): string | undefined {
  for (const key of keys) {
    if (!key) {
      continue;
    }

    const trimmed = key.trim();
    if (!trimmed) {
      continue;
    }

    const lower = trimmed.toLowerCase();
    const value = attributeMap.get(trimmed) ?? attributeMap.get(lower);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function normaliseMapping(raw: unknown): AttributeMapping {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const mapping: AttributeMapping = {};

  for (const key of ["email", "fullName", "role", "tenant"] as const) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      mapping[key] = value.trim();
    }
  }

  return mapping;
}

function resolveRedirectUrl(target: string | undefined, requestUrl: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    new URL(requestUrl).origin;

  const fallbackPath = target && target.trim() ? target.trim() : "/dashboard";

  try {
    return new URL(fallbackPath, baseUrl).toString();
  } catch (error) {
    return new URL("/dashboard", baseUrl).toString();
  }
}

function mergeMetadata(
  existing: unknown,
  tenantId: string,
  providerEntityId: string,
): Record<string, unknown> {
  const base: Record<string, unknown> =
    existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};

  const existingSaml =
    base.saml && typeof base.saml === "object"
      ? { ...(base.saml as Record<string, unknown>) }
      : {};

  base.tenant_id = tenantId;
  base.saml = {
    ...existingSaml,
    providerEntityId,
    lastLoginAt: new Date().toISOString(),
  };

  return base;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const encodedResponse = formData.get("SAMLResponse");

  if (!encodedResponse || typeof encodedResponse !== "string") {
    return Response.json(
      { error: "SAMLResponse form field is required." },
      { status: 400 },
    );
  }

  const relayState = parseRelayState(formData.get("RelayState"));
  const requestUrl = new URL(request.url);
  const queryTenantId = requestUrl.searchParams.get("tenantId") ?? undefined;
  const queryRedirect = requestUrl.searchParams.get("redirectTo") ?? undefined;

  let decodedResponse: string;
  try {
    decodedResponse = Buffer.from(encodedResponse, "base64").toString("utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Failed to decode SAMLResponse: ${message}` },
      { status: 400 },
    );
  }

  let assertion;
  try {
    assertion = parseSamlAssertion(decodedResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: `Invalid SAML assertion: ${message}` },
      { status: 422 },
    );
  }

  let supabase;
  try {
    supabase = getSupabaseServiceRoleClient();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }

  const candidateTenantIds = [relayState.tenantId, queryTenantId];
  let tenantId: string | undefined;
  for (const candidate of candidateTenantIds) {
    if (candidate && uuidSchema.safeParse(candidate).success) {
      tenantId = candidate;
      break;
    }
  }

  const selectColumns =
    "tenant_id, entity_id, default_role, attribute_mapping" as const;

  let configResult;
  if (tenantId) {
    configResult = await supabase
      .from("saml_identity_providers")
      .select(selectColumns)
      .eq("tenant_id", tenantId)
      .maybeSingle();
  } else if (assertion.issuer) {
    configResult = await supabase
      .from("saml_identity_providers")
      .select(selectColumns)
      .eq("entity_id", assertion.issuer)
      .maybeSingle();
  } else {
    return Response.json(
      { error: "Unable to determine tenant for SAML response." },
      { status: 400 },
    );
  }

  if (configResult.error) {
    return Response.json(
      {
        error: "Failed to load SAML identity provider configuration.",
        details: configResult.error.message,
      },
      { status: 500 },
    );
  }

  const config = configResult.data;
  if (!config) {
    return Response.json({ error: "SAML configuration not found." }, { status: 404 });
  }

  if (assertion.issuer && assertion.issuer !== config.entity_id) {
    return Response.json(
      {
        error: "SAML issuer mismatch for tenant configuration.",
        expected: config.entity_id,
        received: assertion.issuer,
      },
      { status: 400 },
    );
  }

  tenantId = config.tenant_id;

  const attributeMap = buildAttributeMap(assertion.attributes);
  const mapping = normaliseMapping(config.attribute_mapping);

  const assertionTenant = getAttribute(
    attributeMap,
    mapping.tenant,
    "tenant_id",
    "tenantId",
    "household_id",
  );

  if (!tenantId && assertionTenant && uuidSchema.safeParse(assertionTenant).success) {
    tenantId = assertionTenant;
  }

  if (!tenantId) {
    return Response.json(
      { error: "Tenant identifier is missing from response context." },
      { status: 422 },
    );
  }

  const email =
    getAttribute(
      attributeMap,
      mapping.email,
      "email",
      "mail",
      "EmailAddress",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "upn",
    ) ?? assertion.nameId ?? undefined;

  if (!email) {
    return Response.json(
      { error: "SAML assertion does not include an email or NameID." },
      { status: 422 },
    );
  }

  const fullName =
    getAttribute(
      attributeMap,
      mapping.fullName,
      "fullName",
      "name",
      "displayName",
      "givenName",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    ) ?? email;

  const rawRole = getAttribute(
    attributeMap,
    mapping.role,
    "role",
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
  );

  const role: AllowedRole = rawRole && allowedRoles.has(rawRole as AllowedRole)
    ? (rawRole as AllowedRole)
    : (config.default_role as AllowedRole);

  const adminApi = supabase.auth.admin;

  let userId: string | undefined;
  const existingUserResult = await adminApi.getUserByEmail(email);
  if (existingUserResult.error && existingUserResult.error.message !== "User not found") {
    return Response.json(
      {
        error: "Failed to lookup Supabase user by email.",
        details: existingUserResult.error.message,
      },
      { status: 500 },
    );
  }

  if (existingUserResult.data?.user) {
    userId = existingUserResult.data.user.id;
  } else {
    const createdUserResult = await adminApi.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        saml_provider: config.entity_id,
        saml_attributes: assertion.attributes,
        tenant_id: tenantId,
      },
    });

    if (createdUserResult.error || !createdUserResult.data?.user) {
      return Response.json(
        {
          error: "Failed to create Supabase user from SAML assertion.",
          details: createdUserResult.error?.message ?? "Unknown error",
        },
        { status: 500 },
      );
    }

    userId = createdUserResult.data.user.id;
  }

  const profileMetadataResult = await supabase
    .from("profiles")
    .select("metadata")
    .eq("id", userId)
    .maybeSingle();

  if (profileMetadataResult.error) {
    return Response.json(
      {
        error: "Failed to load profile metadata for SAML user.",
        details: profileMetadataResult.error.message,
      },
      { status: 500 },
    );
  }

  const mergedMetadata = mergeMetadata(
    profileMetadataResult.data?.metadata ?? null,
    tenantId,
    config.entity_id,
  );

  const profileUpsertResult = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role,
        metadata: mergedMetadata,
      },
      { onConflict: "id" },
    );

  if (profileUpsertResult.error) {
    return Response.json(
      {
        error: "Failed to upsert profile for SAML user.",
        details: profileUpsertResult.error.message,
      },
      { status: 500 },
    );
  }

  const redirectUrl = resolveRedirectUrl(
    relayState.redirectTo ?? queryRedirect,
    request.url,
  );

  return Response.json(
    {
      tenantId,
      userId,
      email,
      role,
      redirectTo: redirectUrl,
    },
    {
      headers: {
        "x-roomsily-redirect": redirectUrl,
      },
    },
  );
}
