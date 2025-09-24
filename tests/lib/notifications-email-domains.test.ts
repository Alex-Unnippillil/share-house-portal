import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"

process.env.RESEND_API_KEY = "test"

import {
  __resetNotificationServiceTestOverrides,
  __setNotificationServiceTestOverrides,
  ensureTenantEmailDomainRecords,
  sendEmailNotification,
  verifyTenantEmailDomain,
  type TenantEmailDomain,
} from "@/lib/notifications"

function createTestRecords(name: string) {
  const selector = `roomsily-${name.replace(/[^a-z0-9]/g, "").slice(0, 8) || "selector"}`
  return [
    {
      record: "SPF" as const,
      name: "@",
      type: "TXT",
      value: "v=spf1 include:spf.resend.net ~all",
      ttl: "300",
      status: "pending",
    },
    {
      record: "DKIM" as const,
      name: `${selector}._domainkey`,
      type: "CNAME",
      value: `${selector}.dkim.resend.net`,
      ttl: "300",
      status: "pending",
    },
  ]
}

class SupabaseStub {
  tenantDomains: TenantEmailDomain[]
  sequence = 1

  constructor(initialDomains: TenantEmailDomain[] = []) {
    this.tenantDomains = [...initialDomains]
  }

  from(table: string) {
    if (table === "tenant_email_domains") {
      return this.tenantDomainQuery()
    }

    return {
      select: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }),
      insert: () => ({
        select: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({ single: async () => ({ data: null, error: null }) }),
        }),
      }),
    }
  }

  private tenantDomainQuery() {
    return {
      select: () => ({
        eq: (column: keyof TenantEmailDomain, value: string) => ({
          maybeSingle: async () => ({
            data:
              this.tenantDomains.find((entry) => entry[column] === value) ?? null,
            error: null,
          }),
          single: async () => {
            const row = this.tenantDomains.find((entry) => entry[column] === value)
            if (!row) {
              return { data: null, error: { message: "not found" } }
            }
            return { data: row, error: null }
          },
        }),
        maybeSingle: async () => ({
          data: this.tenantDomains[0] ?? null,
          error: null,
        }),
      }),
      insert: (payload: TenantEmailDomain | TenantEmailDomain[]) => ({
        select: () => ({
          single: async () => ({
            data: this.insertDomain(
              Array.isArray(payload) ? payload[0]! : payload
            ),
            error: null,
          }),
        }),
      }),
      update: (payload: Partial<TenantEmailDomain>) => ({
        eq: (column: keyof TenantEmailDomain, value: string) => ({
          select: () => ({
            single: async () => {
              const row = this.tenantDomains.find(
                (entry) => entry[column] === value
              )
              if (!row) {
                return { data: null, error: { message: "not found" } }
              }
              Object.assign(row, payload, {
                updated_at: new Date().toISOString(),
              })
              return { data: row, error: null }
            },
          }),
        }),
      }),
    }
  }

  private insertDomain(payload: TenantEmailDomain) {
    const stored: TenantEmailDomain = {
      id: payload.id ?? `domain_${this.sequence++}`,
      household_id: payload.household_id,
      domain: payload.domain,
      status: payload.status ?? "pending",
      identity_id: payload.identity_id ?? null,
      spf_name: payload.spf_name,
      spf_type: payload.spf_type,
      spf_value: payload.spf_value,
      dkim_name: payload.dkim_name,
      dkim_type: payload.dkim_type,
      dkim_value: payload.dkim_value,
      verification_requested_at: payload.verification_requested_at ?? null,
      verified_at: payload.verified_at ?? null,
      last_checked_at: payload.last_checked_at ?? null,
      metadata: payload.metadata ?? null,
      created_at: payload.created_at ?? new Date().toISOString(),
      updated_at: payload.updated_at ?? new Date().toISOString(),
    }

    this.tenantDomains = this.tenantDomains.filter(
      (entry) => entry.household_id !== stored.household_id
    )
    this.tenantDomains.push(stored)
    return stored
  }
}

class ResendStub {
  domain: {
    id: string
    name: string
    status: string
    region: string
    records: Array<{
      record: "SPF" | "DKIM"
      name: string
      type: string
      value: string
      ttl: string
      status: string
    }>
  } | null = null

  constructor(initial?: {
    id: string
    name: string
    status?: string
    region?: string
    records?: ReturnType<typeof createTestRecords>
  }) {
    if (initial) {
      this.domain = {
        id: initial.id,
        name: initial.name,
        status: initial.status ?? "pending",
        region: initial.region ?? "us-east-1",
        records: initial.records ?? createTestRecords(initial.name),
      }
    }
  }

  domains = {
    list: vi.fn(async () => ({
      data: {
        data: this.domain
          ? [
              {
                id: this.domain.id,
                name: this.domain.name,
                status: this.domain.status,
                created_at: new Date().toISOString(),
                region: this.domain.region,
              },
            ]
          : [],
      },
      error: null,
    })),
    create: vi.fn(async ({ name }: { name: string }) => {
      const id = `dom_${Math.random().toString(36).slice(2, 8)}`
      this.domain = {
        id,
        name,
        status: "pending",
        region: "us-east-1",
        records: createTestRecords(name),
      }
      return {
        data: {
          id,
          name,
          status: this.domain.status,
          created_at: new Date().toISOString(),
          region: this.domain.region,
          records: this.domain.records,
        },
        error: null,
      }
    }),
    get: vi.fn(async (id: string) => {
      if (!this.domain || this.domain.id !== id) {
        return { data: null, error: { message: "not found" } }
      }
      return {
        data: {
          id: this.domain.id,
          name: this.domain.name,
          status: this.domain.status,
          created_at: new Date().toISOString(),
          region: this.domain.region,
          records: this.domain.records,
        },
        error: null,
      }
    }),
    verify: vi.fn(async (id: string) => {
      if (this.domain && this.domain.id === id) {
        this.domain.status = "verified"
        this.domain.records = createTestRecords(this.domain.name).map(
          (record) => ({
            ...record,
            status: "verified",
          })
        )
      }
      return { data: { id, object: "domain" }, error: null }
    }),
  }

  emails = {
    send: vi.fn(async () => ({ data: { id: "email_1" }, error: null })),
  }
}

describe("tenant email domain management", () => {
  let supabase: SupabaseStub
  let resend: ResendStub

  beforeEach(() => {
    supabase = new SupabaseStub()
    resend = new ResendStub()
    __setNotificationServiceTestOverrides({
      supabaseFactory: async () => supabase as any,
      serviceSupabase: supabase as any,
      resend: resend as any,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    __resetNotificationServiceTestOverrides()
  })

  it("creates DNS records via the provider", async () => {
    const result = await ensureTenantEmailDomainRecords(
      "household-1",
      "Tenant.Example.com "
    )

    expect(result.domain).toBe("tenant.example.com")
    expect(result.identity_id).toBeTruthy()
    expect(resend.domains.create).toHaveBeenCalled()
    expect(result.spf_value).toContain("spf.resend.net")
    expect(result.dkim_name).toContain("_domainkey")
    expect(supabase.tenantDomains).toHaveLength(1)
  })

  it("verifies an existing tenant domain", async () => {
    const existingDomain = await ensureTenantEmailDomainRecords(
      "household-2",
      "verified.example.com"
    )

    resend.domain = {
      id: existingDomain.identity_id ?? "dom_test",
      name: existingDomain.domain,
      status: "pending",
      region: "us-east-1",
      records: createTestRecords(existingDomain.domain),
    }

    const result = await verifyTenantEmailDomain("household-2")

    expect(resend.domains.verify).toHaveBeenCalled()
    expect(result.status).toBe("verified")
    expect(result.verified_at).toBeTruthy()
  })

  it("sends emails using a verified tenant domain", async () => {
    const verifiedDomain: TenantEmailDomain = {
      id: "domain_verified",
      household_id: "household-3",
      domain: "live.example.com",
      status: "verified",
      identity_id: "dom_verified",
      spf_name: "@",
      spf_type: "TXT",
      spf_value: "v=spf1 include:spf.resend.net ~all",
      dkim_name: "roomsily-live._domainkey",
      dkim_type: "CNAME",
      dkim_value: "roomsily-live.dkim.resend.net",
      verification_requested_at: new Date().toISOString(),
      verified_at: new Date().toISOString(),
      last_checked_at: new Date().toISOString(),
      metadata: { provider: "resend" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    supabase = new SupabaseStub([verifiedDomain])
    resend = new ResendStub({ id: "dom_verified", name: "live.example.com" })
    __setNotificationServiceTestOverrides({
      supabaseFactory: async () => supabase as any,
      serviceSupabase: supabase as any,
      resend: resend as any,
    })

    await sendEmailNotification({
      to: "user@example.com",
      subject: "Test",
      template: "welcome",
      data: { firstName: "Pat" },
      tenantContext: {
        tenantId: "household-3",
        tenantName: "Sunrise Estates",
        fromLocalPart: "notices",
      },
    })

    expect(resend.emails.send).toHaveBeenCalled()
    const payload = resend.emails.send.mock.calls[0][0]
    expect(payload.from).toBe("Sunrise Estates <notices@live.example.com>")
    expect(payload.html).toContain("live.example.com")
  })
})
