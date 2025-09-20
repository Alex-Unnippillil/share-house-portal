"use server"

import { randomUUID } from "crypto"

import { format } from "date-fns"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/utils/supa-server-actions"
import type { Database } from "@/lib/supabase"

const STORAGE_BUCKET_ID = "lease-documents"
const STAFF_ROLES = new Set(["admin", "staff"])

export type LeaseDocumentRecord = Database["public"]["Tables"]["lease_documents"]["Row"]
export type LeaseRecord = Database["public"]["Tables"]["leases"]["Row"]
export type ProfileRecord = Database["public"]["Tables"]["profiles"]["Row"]

export type AdminLeaseDocument = LeaseDocumentRecord & { signedUrl: string | null }

export type TenantLeaseDocument = {
  id: string
  leaseId: string
  leaseLabel: string
  propertyAddress: string | null
  leaseStartDate: string | null
  leaseEndDate: string | null
  title: string
  version: string
  effectiveDate: string
  expirationDate: string | null
  storagePath: string
  signedUrl: string | null
  updatedAt: string
  createdAt: string
}

export type LeaseManagementSummary = Array<
  LeaseRecord & {
    tenant: Pick<ProfileRecord, "id" | "full_name" | "email"> | null
    lease_documents: AdminLeaseDocument[]
  }
>

type SupabaseClient = ReturnType<typeof createClient>

export type ActionResult = {
  success: boolean
  message: string | null
  error: string | null
}

const leaseDocumentFormSchema = z.object({
  leaseId: z.string().uuid({ message: "A lease selection is required." }),
  documentId: z.string().uuid().optional(),
  title: z.string().min(1, { message: "Please provide a document title." }),
  version: z.string().min(1, { message: "Please specify a version label." }),
  effectiveDate: z.coerce.date({ message: "Effective date is required." }),
  expirationDate: z
    .preprocess((value) => {
      if (value === null || value === undefined) {
        return null
      }
      if (typeof value === "string" && value.trim().length === 0) {
        return null
      }
      return value
    }, z.coerce.date({ message: "Invalid expiration date." }).nullable())
    .nullable(),
})

async function getSupabaseClient(): Promise<SupabaseClient> {
  const cookieStore = cookies()
  return createClient(cookieStore)
}

async function getAuthenticatedProfile(client: SupabaseClient) {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!user) {
    throw new Error("You must be signed in to continue.")
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (!profile) {
    throw new Error("Profile could not be located for the active session.")
  }

  return { user, profile }
}

function ensureStaff(profile: ProfileRecord) {
  if (!profile.role || !STAFF_ROLES.has(profile.role)) {
    throw new Error("You do not have permission to manage lease documents.")
  }
}

export async function getLeaseManagementData(): Promise<LeaseManagementSummary> {
  const supabase = await getSupabaseClient()
  const { profile } = await getAuthenticatedProfile(supabase)
  ensureStaff(profile)

  const { data, error } = await supabase
    .from("leases")
    .select(
      `
        id,
        created_at,
        updated_at,
        tenant_profile_id,
        label,
        property_address,
        start_date,
        end_date,
        status,
        tenant:profiles(id, full_name, email),
        lease_documents (
          id,
          created_at,
          updated_at,
          lease_id,
          title,
          version,
          effective_date,
          expiration_date,
          storage_path
        )
      `
    )
    .order("label", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const storage = supabase.storage.from(STORAGE_BUCKET_ID)

  const leasesWithDocuments = await Promise.all(
    (data ?? []).map(async (lease) => {
      const docs = lease.lease_documents ?? []
      const documentsWithUrls = await Promise.all(
        docs.map(async (doc) => {
          const { data: signedUrlData, error: signedUrlError } =
            await storage.createSignedUrl(doc.storage_path, 60 * 60)

          return {
            ...doc,
            signedUrl: signedUrlError ? null : signedUrlData?.signedUrl ?? null,
          } satisfies AdminLeaseDocument
        })
      )

      return {
        ...lease,
        lease_documents: documentsWithUrls,
        tenant: lease.tenant ?? null,
      }
    })
  )

  return leasesWithDocuments
}

export async function getTenantLeaseDocuments(): Promise<TenantLeaseDocument[]> {
  const supabase = await getSupabaseClient()
  const { user } = await getAuthenticatedProfile(supabase)

  const { data, error } = await supabase
    .from("leases")
    .select(
      `
        id,
        label,
        property_address,
        start_date,
        end_date,
        status,
        lease_documents (
          id,
          created_at,
          updated_at,
          lease_id,
          title,
          version,
          effective_date,
          expiration_date,
          storage_path
        )
      `
    )
    .eq("tenant_profile_id", user.id)
    .order("start_date", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const leases = data ?? []
  const storage = supabase.storage.from(STORAGE_BUCKET_ID)

  const documents = await Promise.all(
    leases.flatMap((lease) => {
      const entries = lease.lease_documents ?? []

      return entries.map(async (doc) => {
        const { data: signedUrlData, error: signedUrlError } =
          await storage.createSignedUrl(doc.storage_path, 60 * 60)

        return {
          id: doc.id,
          leaseId: lease.id,
          leaseLabel: lease.label,
          propertyAddress: lease.property_address ?? null,
          leaseStartDate: lease.start_date ?? null,
          leaseEndDate: lease.end_date ?? null,
          title: doc.title,
          version: doc.version,
          effectiveDate: doc.effective_date,
          expirationDate: doc.expiration_date,
          storagePath: doc.storage_path,
          signedUrl: signedUrlError ? null : signedUrlData?.signedUrl ?? null,
          updatedAt: doc.updated_at,
          createdAt: doc.created_at,
        } satisfies TenantLeaseDocument
      })
    })
  )

  return documents
}

export async function getLeaseDocumentDownloadUrl(documentId: string) {
  const supabase = await getSupabaseClient()
  await getAuthenticatedProfile(supabase)

  const { data, error } = await supabase
    .from("lease_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error("Document not found.")
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(STORAGE_BUCKET_ID)
    .createSignedUrl(data.storage_path, 60 * 10)

  if (signedUrlError) {
    throw new Error(signedUrlError.message)
  }

  return signedUrlData?.signedUrl ?? null
}

export async function saveLeaseDocument(formData: FormData): Promise<ActionResult> {
  const supabase = await getSupabaseClient()
  const { profile } = await getAuthenticatedProfile(supabase)
  ensureStaff(profile)

  const rawFile = formData.get("file")
  const file = rawFile instanceof File ? rawFile : null

  const parseResult = leaseDocumentFormSchema.safeParse({
    leaseId: formData.get("leaseId"),
    documentId: formData.get("documentId") ?? undefined,
    title: formData.get("title"),
    version: formData.get("version"),
    effectiveDate: formData.get("effectiveDate"),
    expirationDate: formData.get("expirationDate"),
  })

  if (!parseResult.success) {
    const message = parseResult.error.issues
      .map((issue) => issue.message)
      .join(" ")

    return {
      success: false,
      message: null,
      error: message || "Invalid lease document payload.",
    }
  }

  const payload = parseResult.data

  if (!payload.documentId && !file) {
    return {
      success: false,
      message: null,
      error: "A PDF must be provided for new lease documents.",
    }
  }

  if (file) {
    if (file.size === 0) {
      return {
        success: false,
        message: null,
        error: "The uploaded file is empty.",
      }
    }

    const mimeType = file.type?.toLowerCase() ?? ""
    if (mimeType !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return {
        success: false,
        message: null,
        error: "Only PDF documents can be uploaded.",
      }
    }
  }

  const effectiveDate = format(payload.effectiveDate, "yyyy-MM-dd")
  const expirationDate = payload.expirationDate
    ? format(payload.expirationDate, "yyyy-MM-dd")
    : null

  const documentId = payload.documentId ?? randomUUID()

  const { data: existingDoc, error: fetchError } = await supabase
    .from("lease_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle()

  if (fetchError) {
    return {
      success: false,
      message: null,
      error: fetchError.message,
    }
  }

  let storagePath = existingDoc?.storage_path ?? `${payload.leaseId}/${documentId}.pdf`

  if (file) {
    storagePath = existingDoc?.storage_path ?? `${payload.leaseId}/${documentId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET_ID)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      })

    if (uploadError) {
      return {
        success: false,
        message: null,
        error: uploadError.message,
      }
    }
  }

  const { error: upsertError } = await supabase
    .from("lease_documents")
    .upsert(
      {
        id: documentId,
        lease_id: payload.leaseId,
        title: payload.title,
        version: payload.version,
        effective_date: effectiveDate,
        expiration_date: expirationDate,
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )

  if (upsertError) {
    return {
      success: false,
      message: null,
      error: upsertError.message,
    }
  }

  revalidatePath("/dashboard/leases")
  revalidatePath("/leases")

  return {
    success: true,
    message: payload.documentId
      ? "Lease document updated successfully."
      : "Lease document uploaded successfully.",
    error: null,
  }
}
