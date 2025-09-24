import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  decryptValue,
  encryptValue,
  EncryptedColumnValue,
  isEncryptedColumnValue,
  setTenantKmsClient,
  TenantKmsClient,
} from "@/lib/encryption"
import {
  rotateTenantKeysAndBackfill,
  RotationTableConfig,
  SupabaseRotationAdapter,
} from "@/scripts/byok/rotate"

const ROTATION_TABLES: RotationTableConfig[] = [
  {
    table: "profiles",
    primaryKey: "id",
    tenantIdColumn: "tenant_id",
    columns: ["phone", "emergency_contact"],
  },
  {
    table: "rent_payments",
    primaryKey: "id",
    tenantIdColumn: "tenant_id",
    columns: ["payer_name", "billing_address"],
  },
]

type TableData = Record<string, Array<Record<string, unknown>>>

class InMemorySupabaseAdapter implements SupabaseRotationAdapter {
  constructor(public readonly tables: TableData) {}

  public readonly updates: Array<{
    table: string
    rowId: string
    updates: Record<string, unknown>
  }> = []

  async fetchBatch(
    table: string,
    columns: string[],
    options: { offset: number; limit: number }
  ): Promise<Array<Record<string, unknown>>> {
    const rows = this.tables[table] ?? []
    const slice = rows.slice(options.offset, options.offset + options.limit)
    return slice.map((row) => {
      const result: Record<string, unknown> = {}
      for (const column of columns) {
        result[column] = row[column]
      }
      return result
    })
  }

  async update(
    table: string,
    primaryKey: string,
    rowId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const rows = this.tables[table] ?? []
    const index = rows.findIndex((row) => row[primaryKey] === rowId)
    if (index === -1) {
      throw new Error(`Row ${rowId} not found in ${table}`)
    }

    rows[index] = { ...rows[index], ...updates }
    this.updates.push({ table, rowId, updates })
  }
}

const TEST_KMS_OPTIONS = {
  kmsKeyArn: "arn:cloud:kms:test-region:123456789012:key/mock",
  wrappingKey: "rotation-test-wrapper-key",
}

describe("BYOK rotation workflow", () => {
  let kms: TenantKmsClient
  let supabase: InMemorySupabaseAdapter

  beforeEach(async () => {
    kms = new TenantKmsClient(TEST_KMS_OPTIONS)
    setTenantKmsClient(kms)

    const profiles = [
      {
        id: "profile-tenant-1",
        tenant_id: "tenant-1",
        phone: await encryptValue("555-0001", {
          tenantId: "tenant-1",
          kms,
          context: "profiles.phone",
        }),
        emergency_contact: await encryptValue(
          { name: "Alex", phone: "555-9999" },
          {
            tenantId: "tenant-1",
            kms,
            context: "profiles.emergency_contact",
          }
        ),
      },
      {
        id: "profile-tenant-2",
        tenant_id: "tenant-2",
        phone: await encryptValue("555-0002", {
          tenantId: "tenant-2",
          kms,
          context: "profiles.phone",
        }),
        emergency_contact: await encryptValue(
          { name: "Peyton", phone: "555-8888" },
          {
            tenantId: "tenant-2",
            kms,
            context: "profiles.emergency_contact",
          }
        ),
      },
    ]

    const rentPayments = [
      {
        id: "rent-tenant-1",
        tenant_id: "tenant-1",
        payer_name: await encryptValue("Morgan Tenant", {
          tenantId: "tenant-1",
          kms,
          context: "rent_payments.payer_name",
        }),
        billing_address: await encryptValue(
          { line1: "123 Shared St", city: "Test City" },
          {
            tenantId: "tenant-1",
            kms,
            context: "rent_payments.billing_address",
          }
        ),
      },
      {
        id: "rent-tenant-2",
        tenant_id: "tenant-2",
        payer_name: await encryptValue("Skyler Tenant", {
          tenantId: "tenant-2",
          kms,
          context: "rent_payments.payer_name",
        }),
        billing_address: await encryptValue(
          { line1: "987 Cohort Ave", city: "Mock City" },
          {
            tenantId: "tenant-2",
            kms,
            context: "rent_payments.billing_address",
          }
        ),
      },
      {
        id: "rent-unencrypted",
        tenant_id: "tenant-2",
        payer_name: "plain text",
        billing_address: null,
      },
    ]

    supabase = new InMemorySupabaseAdapter({
      profiles,
      rent_payments: rentPayments,
    })
  })

  afterEach(() => {
    setTenantKmsClient(null)
  })

  it("rotates tenant keys and re-encrypts all configured columns", async () => {
    const originalProfiles = supabase.tables.profiles.map((row) => ({
      id: row.id,
      phone: row.phone as EncryptedColumnValue,
      emergency_contact: row.emergency_contact as EncryptedColumnValue,
    }))

    const originalRent = supabase.tables.rent_payments
      .filter((row) => isEncryptedColumnValue(row.payer_name))
      .map((row) => ({
        id: row.id,
        payer_name: row.payer_name as EncryptedColumnValue,
        billing_address: row.billing_address as EncryptedColumnValue,
      }))

    const summary = await rotateTenantKeysAndBackfill({
      supabase,
      tables: ROTATION_TABLES,
      kms,
      batchSize: 2,
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    })

    expect(summary.rotatedTenants).toBe(2)
    expect(summary.processedRows).toBe(4)
    expect(summary.reencryptedColumns).toBe(8)
    expect(summary.skippedRows).toBeGreaterThanOrEqual(1)

    const tenant1History = kms.listKeyMetadata("tenant-1")
    const tenant2History = kms.listKeyMetadata("tenant-2")

    expect(tenant1History.map((entry) => entry.version)).toEqual([1, 2])
    expect(tenant2History.map((entry) => entry.version)).toEqual([1, 2])

    const updatedProfiles = supabase.tables.profiles
    for (const updated of updatedProfiles) {
      expect(isEncryptedColumnValue(updated.phone)).toBe(true)
      expect(isEncryptedColumnValue(updated.emergency_contact)).toBe(true)
      expect((updated.phone as EncryptedColumnValue).keyVersion).toBe(2)
      expect((updated.emergency_contact as EncryptedColumnValue).keyVersion).toBe(2)

      const original = originalProfiles.find((row) => row.id === updated.id)!
      expect((updated.phone as EncryptedColumnValue).ciphertext).not.toBe(
        original.phone.ciphertext
      )
      expect(
        (updated.emergency_contact as EncryptedColumnValue).ciphertext
      ).not.toBe(original.emergency_contact.ciphertext)

      const phone = await decryptValue(updated.phone as EncryptedColumnValue, {
        kms,
      })
      const emergency = await decryptValue(
        updated.emergency_contact as EncryptedColumnValue,
        { kms }
      )

      expect(phone).toBe(
        await decryptValue(original.phone as EncryptedColumnValue, { kms })
      )
      expect(emergency).toEqual(
        await decryptValue(original.emergency_contact as EncryptedColumnValue, {
          kms,
        })
      )
    }

    const updatedRent = supabase.tables.rent_payments.filter((row) =>
      isEncryptedColumnValue(row.payer_name)
    )

    for (const updated of updatedRent) {
      const metadata = updated.payer_name as EncryptedColumnValue
      expect(metadata.keyVersion).toBe(2)
      const billing = updated.billing_address as EncryptedColumnValue
      expect(billing.keyVersion).toBe(2)

      const original = originalRent.find((row) => row.id === updated.id)!

      expect(metadata.ciphertext).not.toBe(original.payer_name.ciphertext)
      expect(billing.ciphertext).not.toBe(original.billing_address.ciphertext)

      const decryptedName = await decryptValue(metadata, { kms })
      const decryptedAddress = await decryptValue(billing, { kms })

      expect(decryptedName).toEqual(
        await decryptValue(original.payer_name as EncryptedColumnValue, { kms })
      )
      expect(decryptedAddress).toEqual(
        await decryptValue(original.billing_address as EncryptedColumnValue, {
          kms,
        })
      )
    }

    expect(supabase.updates).toHaveLength(summary.processedRows)
  })
})
