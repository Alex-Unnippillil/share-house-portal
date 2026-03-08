import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  decryptSupabaseColumns,
  decryptValue,
  encryptSupabaseColumns,
  encryptValue,
  isEncryptedColumnValue,
  setTenantKmsClient,
  TenantKmsClient,
} from "@/lib/encryption"

const TEST_KMS_OPTIONS = {
  kmsKeyArn: "arn:cloud:kms:test-region:123456789012:key/mock",
  wrappingKey: "unit-test-wrapping-key",
}

describe("envelope encryption", () => {
  let kms: TenantKmsClient

  beforeEach(() => {
    kms = new TenantKmsClient(TEST_KMS_OPTIONS)
    setTenantKmsClient(kms)
  })

  afterEach(() => {
    setTenantKmsClient(null)
  })

  it("encrypts and decrypts strings for a tenant", async () => {
    const encrypted = await encryptValue("sensitive", {
      tenantId: "tenant-a",
      kms,
      context: "profiles.phone",
    })

    expect(isEncryptedColumnValue(encrypted)).toBe(true)
    expect(encrypted.tenantId).toBe("tenant-a")
    expect(encrypted.keyVersion).toBe(1)

    const decrypted = await decryptValue(encrypted, { kms })
    expect(decrypted).toBe("sensitive")
  })

  it("creates distinct key material per tenant", async () => {
    const first = await encryptValue("alpha", { tenantId: "tenant-a", kms })
    const second = await encryptValue("beta", { tenantId: "tenant-b", kms })

    expect(first.keyId).not.toBe(second.keyId)
    expect(first.kmsKeyArn).toBe(second.kmsKeyArn)

    const historyA = kms.listKeyMetadata("tenant-a")
    const historyB = kms.listKeyMetadata("tenant-b")

    expect(historyA).toHaveLength(1)
    expect(historyB).toHaveLength(1)
    expect(historyA[0].keyId).toBe(first.keyId)
    expect(historyB[0].keyId).toBe(second.keyId)
  })

  it("supports JSON payloads while preserving structure", async () => {
    const payload = { contact: { name: "Casey", phone: "555-1111" } }
    const encrypted = await encryptValue(payload, {
      tenantId: "tenant-json",
      kms,
    })

    expect(encrypted.encoding).toBe("json")
    const decrypted = await decryptValue(encrypted, { kms })
    expect(decrypted).toEqual(payload)
  })

  it("maintains key history and decrypts using prior versions", async () => {
    const first = await encryptValue("history-one", {
      tenantId: "tenant-history",
      kms,
    })
    const second = await encryptValue("history-two", {
      tenantId: "tenant-history",
      kms,
    })

    expect(second.keyVersion).toBe(first.keyVersion)

    await kms.rotateTenantKey("tenant-history")

    const third = await encryptValue("history-three", {
      tenantId: "tenant-history",
      kms,
    })

    expect(third.keyVersion).toBeGreaterThan(first.keyVersion)

    const history = kms.listKeyMetadata("tenant-history")
    expect(history.map((entry) => entry.version)).toEqual([1, 2])

    const decryptedFirst = await decryptValue(first, { kms })
    const decryptedThird = await decryptValue(third, { kms })

    expect(decryptedFirst).toBe("history-one")
    expect(decryptedThird).toBe("history-three")
  })

  it("encrypts and decrypts multiple Supabase columns", async () => {
    const record = {
      id: "profile-1",
      tenant_id: "tenant-columns",
      phone: "555-2222",
      emergency_contact: { name: "Jamie", phone: "555-3333" },
      notes: null as string | null,
    }

    const configs = [
      {
        column: "phone" as const,
        context: "profiles.phone",
        encoding: "utf8" as const,
      },
      {
        column: "emergency_contact" as const,
        context: "profiles.emergency_contact",
        encoding: "json" as const,
      },
    ]

    const encrypted = await encryptSupabaseColumns(
      record,
      record.tenant_id,
      configs,
      kms
    )

    expect(isEncryptedColumnValue(encrypted.phone)).toBe(true)
    expect(isEncryptedColumnValue(encrypted.emergency_contact)).toBe(true)
    expect(encrypted.phone.keyVersion).toBe(1)
    expect(encrypted.emergency_contact.keyVersion).toBe(1)

    const decrypted = await decryptSupabaseColumns(encrypted, configs, kms)

    expect(decrypted.phone).toBe(record.phone)
    expect(decrypted.emergency_contact).toEqual(record.emergency_contact)
    expect(decrypted.notes).toBeNull()
  })
})
