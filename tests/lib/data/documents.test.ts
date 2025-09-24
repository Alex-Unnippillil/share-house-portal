import { beforeEach, describe, expect, it } from "vitest"
import { randomUUID } from "node:crypto"

import { fetchDocumentStats, fetchDocumentsList } from "@/lib/data/documents"

import { getDatabasePool, getSupabaseClient, resetDatabase } from "../../setup/supabase-test-env"

const DOCUMENT_CREATOR_EMAIL = "creator@example.com"

async function insertAuthUser(id: string, email: string) {
  const pool = getDatabasePool()
  await pool.query("INSERT INTO auth.users (id, email) VALUES ($1, $2)", [id, email])
}

async function insertProfile(
  id: string,
  {
    email,
    fullName,
    role,
    unitId,
  }: { email: string; fullName: string; role: string; unitId?: string | null }
) {
  const pool = getDatabasePool()
  await pool.query(
    "INSERT INTO public.profiles (id, email, full_name, role, unit_id) VALUES ($1, $2, $3, $4, $5)",
    [id, email, fullName, role, unitId ?? null]
  )
}

async function insertDocument({
  id,
  title,
  documentType,
  status,
  createdBy,
  tenantId,
  unitId,
  createdAt,
}: {
  id: string
  title: string
  documentType: string
  status: string
  createdBy: string
  tenantId: string | null
  unitId: string | null
  createdAt: string
}) {
  const pool = getDatabasePool()
  await pool.query(
    `INSERT INTO public.documents
      (id, title, document_type, status, created_by, tenant_id, unit_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, title, documentType, status, createdBy, tenantId, unitId, createdAt]
  )
}

async function insertSignature({
  documentId,
  signerId,
  signerEmail,
  signerName,
  status = "pending",
}: {
  documentId: string
  signerId: string
  signerEmail: string
  signerName: string
  status?: string
}) {
  const pool = getDatabasePool()
  await pool.query(
    `INSERT INTO public.document_signatures
      (id, document_id, signer_id, signer_email, signer_name, status)
      VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), documentId, signerId, signerEmail, signerName, status]
  )
}

describe("fetchDocumentsList", () => {
  const supabase = () => getSupabaseClient() as unknown as any

  beforeEach(async () => {
    await resetDatabase()
  })

  it("returns documents scoped to a tenant with filters applied", async () => {
    const viewerId = randomUUID()
    const creatorId = randomUUID()
    const tenantOfDocument = randomUUID()

    await insertAuthUser(viewerId, "viewer@example.com")
    await insertAuthUser(tenantOfDocument, "tenant@example.com")
    await insertAuthUser(creatorId, DOCUMENT_CREATOR_EMAIL)

    await insertProfile(viewerId, {
      email: "viewer@example.com",
      fullName: "Viewer Tenant",
      role: "tenant",
      unitId: "unit-456",
    })
    await insertProfile(tenantOfDocument, {
      email: "tenant@example.com",
      fullName: "Tenant Of Document",
      role: "tenant",
      unitId: "unit-456",
    })
    await insertProfile(creatorId, {
      email: DOCUMENT_CREATOR_EMAIL,
      fullName: "Document Creator",
      role: "property_manager",
    })

    const matchingDocumentId = randomUUID()
    await insertDocument({
      id: matchingDocumentId,
      title: "Lease Agreement",
      documentType: "lease",
      status: "draft",
      createdBy: creatorId,
      tenantId: tenantOfDocument,
      unitId: "unit-456",
      createdAt: "2024-06-15T00:00:00Z",
    })
    await insertSignature({
      documentId: matchingDocumentId,
      signerId: viewerId,
      signerEmail: "viewer@example.com",
      signerName: "Viewer Tenant",
    })

    // Document that matches filters but should be excluded because viewer is not associated
    const unrelatedDocumentId = randomUUID()
    await insertDocument({
      id: unrelatedDocumentId,
      title: "Lease Agreement",
      documentType: "lease",
      status: "draft",
      createdBy: creatorId,
      tenantId: tenantOfDocument,
      unitId: "unit-456",
      createdAt: "2024-06-15T00:00:00Z",
    })

    // Documents failing individual filters
    await insertDocument({
      id: randomUUID(),
      title: "Signed Lease",
      documentType: "lease",
      status: "signed",
      createdBy: creatorId,
      tenantId: tenantOfDocument,
      unitId: "unit-456",
      createdAt: "2024-06-15T00:00:00Z",
    })
    await insertDocument({
      id: randomUUID(),
      title: "Insurance Document",
      documentType: "insurance",
      status: "draft",
      createdBy: creatorId,
      tenantId: tenantOfDocument,
      unitId: "unit-456",
      createdAt: "2024-06-15T00:00:00Z",
    })
    await insertDocument({
      id: randomUUID(),
      title: "Wrong Unit",
      documentType: "lease",
      status: "draft",
      createdBy: creatorId,
      tenantId: tenantOfDocument,
      unitId: "unit-999",
      createdAt: "2024-06-15T00:00:00Z",
    })
    await insertDocument({
      id: randomUUID(),
      title: "Old Lease",
      documentType: "lease",
      status: "draft",
      createdBy: creatorId,
      tenantId: tenantOfDocument,
      unitId: "unit-456",
      createdAt: "2023-01-01T00:00:00Z",
    })

    const filters = {
      status: ["draft"],
      type: ["lease"],
      unit_id: "unit-456",
      date_from: "2024-06-01",
      date_to: "2024-06-30",
    }

    const documents = await fetchDocumentsList({
      client: supabase(),
      userId: viewerId,
      role: "tenant",
      filters,
    })

    expect(documents).toHaveLength(1)
    expect(documents[0]?.id).toBe(matchingDocumentId)
  })

  it("returns all documents for property managers without scoping", async () => {
    const managerId = randomUUID()
    const creatorId = randomUUID()
    const tenantId = randomUUID()

    await insertAuthUser(managerId, "manager@example.com")
    await insertAuthUser(creatorId, DOCUMENT_CREATOR_EMAIL)
    await insertAuthUser(tenantId, "tenant@example.com")

    await insertProfile(managerId, {
      email: "manager@example.com",
      fullName: "Property Manager",
      role: "property_manager",
    })
    await insertProfile(creatorId, {
      email: DOCUMENT_CREATOR_EMAIL,
      fullName: "Document Creator",
      role: "property_manager",
    })
    await insertProfile(tenantId, {
      email: "tenant@example.com",
      fullName: "Tenant",
      role: "tenant",
    })

    const docOne = randomUUID()
    const docTwo = randomUUID()

    await insertDocument({
      id: docOne,
      title: "Lease A",
      documentType: "lease",
      status: "draft",
      createdBy: creatorId,
      tenantId,
      unitId: "unit-123",
      createdAt: "2024-06-10T00:00:00Z",
    })
    await insertDocument({
      id: docTwo,
      title: "Lease B",
      documentType: "lease",
      status: "signed",
      createdBy: creatorId,
      tenantId,
      unitId: "unit-999",
      createdAt: "2024-06-12T00:00:00Z",
    })

    const documents = await fetchDocumentsList({
      client: supabase(),
      userId: managerId,
      role: "property_manager",
    })

    expect(documents.map(doc => doc.id).sort()).toEqual([docOne, docTwo].sort())
  })

  it("propagates PostgREST errors", async () => {
    const pool = getDatabasePool()
    const viewerId = randomUUID()

    await insertAuthUser(viewerId, "viewer@example.com")
    await insertProfile(viewerId, {
      email: "viewer@example.com",
      fullName: "Viewer Tenant",
      role: "tenant",
    })

    await pool.query("ALTER TABLE public.documents RENAME TO documents_backup;")

    try {
      await expect(
        fetchDocumentsList({
          client: supabase(),
          userId: viewerId,
          role: "tenant",
        })
      ).rejects.toThrow(/Failed to fetch documents/)
    } finally {
      await pool.query("ALTER TABLE public.documents_backup RENAME TO documents;")
    }
  })
})

describe("fetchDocumentStats", () => {
  const supabase = () => getSupabaseClient() as unknown as any

  beforeEach(async () => {
    await resetDatabase()
  })

  it("computes stats for scoped users", async () => {
    const viewerId = randomUUID()
    const creatorId = randomUUID()

    await insertAuthUser(viewerId, "viewer@example.com")
    await insertAuthUser(creatorId, DOCUMENT_CREATOR_EMAIL)

    await insertProfile(viewerId, {
      email: "viewer@example.com",
      fullName: "Viewer Tenant",
      role: "tenant",
    })
    await insertProfile(creatorId, {
      email: DOCUMENT_CREATOR_EMAIL,
      fullName: "Document Creator",
      role: "property_manager",
    })

    const statuses = [
      "draft",
      "draft",
      "signed",
      "pending_signature",
      "expired",
    ] as const

    for (const status of statuses) {
      await insertDocument({
        id: randomUUID(),
        title: `${status} doc`,
        documentType: "lease",
        status,
        createdBy: creatorId,
        tenantId: viewerId,
        unitId: "unit-123",
        createdAt: "2024-06-15T00:00:00Z",
      })
    }

    const stats = await fetchDocumentStats({
      client: supabase(),
      userId: viewerId,
      role: "tenant",
    })

    expect(stats).toEqual({
      total_documents: statuses.length,
      pending_signatures: 1,
      signed_documents: 1,
      expired_documents: 1,
      draft_documents: 2,
    })
  })

  it("omits tenant scoping for admins", async () => {
    const adminId = randomUUID()
    const tenantId = randomUUID()
    const creatorId = randomUUID()

    await insertAuthUser(adminId, "admin@example.com")
    await insertAuthUser(tenantId, "tenant@example.com")
    await insertAuthUser(creatorId, DOCUMENT_CREATOR_EMAIL)

    await insertProfile(adminId, {
      email: "admin@example.com",
      fullName: "Admin User",
      role: "admin",
    })
    await insertProfile(tenantId, {
      email: "tenant@example.com",
      fullName: "Tenant",
      role: "tenant",
    })
    await insertProfile(creatorId, {
      email: DOCUMENT_CREATOR_EMAIL,
      fullName: "Document Creator",
      role: "property_manager",
    })

    await insertDocument({
      id: randomUUID(),
      title: "Tenant Doc",
      documentType: "lease",
      status: "draft",
      createdBy: creatorId,
      tenantId,
      unitId: "unit-123",
      createdAt: "2024-06-15T00:00:00Z",
    })

    const stats = await fetchDocumentStats({
      client: supabase(),
      userId: adminId,
      role: "admin",
    })

    expect(stats.total_documents).toBe(1)
  })

  it("throws when the underlying query fails", async () => {
    const pool = getDatabasePool()
    const viewerId = randomUUID()

    await insertAuthUser(viewerId, "viewer@example.com")
    await insertProfile(viewerId, {
      email: "viewer@example.com",
      fullName: "Viewer Tenant",
      role: "tenant",
    })

    await pool.query("ALTER TABLE public.documents RENAME TO documents_backup;")

    try {
      await expect(
        fetchDocumentStats({
          client: supabase(),
          userId: viewerId,
          role: "tenant",
        })
      ).rejects.toThrow(/Failed to fetch document statistics/)
    } finally {
      await pool.query("ALTER TABLE public.documents_backup RENAME TO documents;")
    }
  })
})
