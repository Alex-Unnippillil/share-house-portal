import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sampleTenantId = "11111111-1111-1111-1111-111111111111";
const sampleIssuer = "https://example.okta.com/app/roomsily";

const sampleAssertion = `
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_abc" Version="2.0">
  <saml:Issuer>${sampleIssuer}</saml:Issuer>
  <saml:Assertion>
    <saml:Issuer>${sampleIssuer}</saml:Issuer>
    <saml:Subject>
      <saml:NameID>tenant.user@example.com</saml:NameID>
    </saml:Subject>
    <saml:AttributeStatement>
      <saml:Attribute Name="email">
        <saml:AttributeValue>tenant.user@example.com</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="fullName">
        <saml:AttributeValue>Tenant User</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="role">
        <saml:AttributeValue>tenant</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="tenant_id">
        <saml:AttributeValue>${sampleTenantId}</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>
`;

const encodedResponse = Buffer.from(sampleAssertion, "utf-8").toString("base64");

type SupabaseQueryResult = {
  select?: ReturnType<typeof vi.fn>;
  eq?: ReturnType<typeof vi.fn>;
  maybeSingle?: ReturnType<typeof vi.fn>;
  upsert?: ReturnType<typeof vi.fn>;
};

type SupabaseMock = {
  from: ReturnType<typeof vi.fn>;
  auth: {
    admin: {
      getUserByEmail: ReturnType<typeof vi.fn>;
      createUser: ReturnType<typeof vi.fn>;
    };
  };
};

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseServiceRoleClient: vi.fn(),
}));

function createSupabaseMock(): {
  client: SupabaseMock;
  queries: Record<string, SupabaseQueryResult>;
  profileSelect: SupabaseQueryResult;
  profileUpsert: ReturnType<typeof vi.fn>;
} {
  const queries: Record<string, SupabaseQueryResult> = {};

  const samlConfigQuery: SupabaseQueryResult = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        tenant_id: sampleTenantId,
        entity_id: sampleIssuer,
        default_role: "tenant",
        attribute_mapping: {
          email: "email",
          fullName: "fullName",
          role: "role",
          tenant: "tenant_id",
        },
      },
      error: null,
    }),
  };

  const profileSelectQuery: SupabaseQueryResult = {
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { metadata: null }, error: null }),
  };

  const profileUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

  const client: SupabaseMock = {
    from: vi.fn((table: string) => {
      if (table === "saml_identity_providers") {
        queries[table] = samlConfigQuery;
        return samlConfigQuery as any;
      }

      if (table === "profiles") {
        const profileQuery = {
          select: vi.fn().mockReturnValue(profileSelectQuery),
          upsert: profileUpsert,
        };
        queries[table] = profileQuery;
        return profileQuery as any;
      }

      throw new Error(`Unexpected table ${table}`);
    }),
    auth: {
      admin: {
        getUserByEmail: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123" } },
          error: null,
        }),
        createUser: vi.fn(),
      },
    },
  };

  queries["saml_identity_providers"] = samlConfigQuery;

  return {
    client,
    queries,
    profileSelect: profileSelectQuery,
    profileUpsert,
  };
}

describe("SAML ACS endpoint", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("links an existing Supabase user from a SAML assertion", async () => {
    const { client, profileUpsert } = createSupabaseMock();
    const { getSupabaseServiceRoleClient } = await import("@/lib/supabase-admin");
    (getSupabaseServiceRoleClient as unknown as vi.Mock).mockReturnValue(client);

    const { POST } = await import("@/app/api/sso/saml/acs/route");

    const form = new URLSearchParams();
    form.set("SAMLResponse", encodedResponse);
    form.set(
      "RelayState",
      JSON.stringify({ tenantId: sampleTenantId, redirectTo: "/dashboard" }),
    );

    const request = new Request("http://localhost/api/sso/saml/acs", {
      method: "POST",
      body: form,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.email).toBe("tenant.user@example.com");
    expect(body.tenantId).toBe(sampleTenantId);
    expect(body.userId).toBe("user-123");
    expect(body.role).toBe("tenant");
    expect(body.redirectTo).toContain("/dashboard");

    expect(client.auth.admin.getUserByEmail).toHaveBeenCalledWith(
      "tenant.user@example.com",
    );
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
    expect(profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-123",
        role: "tenant",
        email: "tenant.user@example.com",
      }),
      expect.any(Object),
    );
  });

  it("creates a new Supabase user when none exists", async () => {
    const { client, profileUpsert } = createSupabaseMock();
    client.auth.admin.getUserByEmail.mockResolvedValue({
      data: { user: null },
      error: { message: "User not found" },
    });
    client.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: "user-789" } },
      error: null,
    });

    const { getSupabaseServiceRoleClient } = await import("@/lib/supabase-admin");
    (getSupabaseServiceRoleClient as unknown as vi.Mock).mockReturnValue(client);

    const { POST } = await import("@/app/api/sso/saml/acs/route");

    const params = new URLSearchParams();
    params.set("SAMLResponse", encodedResponse);

    const request = new Request(
      "http://localhost/api/sso/saml/acs?redirectTo=%2Fwelcome",
      {
        method: "POST",
        body: params,
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.userId).toBe("user-789");
    expect(body.redirectTo).toContain("/welcome");

    expect(client.auth.admin.createUser).toHaveBeenCalledWith({
      email: "tenant.user@example.com",
      email_confirm: true,
      user_metadata: expect.objectContaining({
        full_name: "Tenant User",
        saml_provider: sampleIssuer,
        tenant_id: sampleTenantId,
      }),
    });

    expect(profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-789", role: "tenant" }),
      expect.any(Object),
    );
  });
});
