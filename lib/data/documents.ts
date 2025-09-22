import { cookies } from "next/headers"
import { z } from "zod"

import { createClient } from "@/utils/supa-server-actions"
import type { DocumentListFilters, DocumentStats, DocumentWithLease } from "@/types/documents"
import { isLandlordRole } from "@/lib/data/dashboard-nav"

export const documentListFiltersSchema = z.object({
  status: z.array(z.enum(["draft", "pending_signature", "signed", "expired", "cancelled"])).optional(),
  type: z.array(z.enum(["lease", "addendum", "insurance", "maintenance", "other"])).optional(),
  tenant_id: z.string().uuid().optional(),
  unit_id: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
})

export async function fetchDocuments(filters: DocumentListFilters = {}): Promise<DocumentWithLease[]> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("You must be logged in to view documents.")
  }

  const validatedFilters = documentListFiltersSchema.parse(filters)

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Error fetching profile role for documents:", profileError)
  }

  let query = (supabase as any)
    .from("documents")
    .select(`
        *,
        lease:leases(*),
        signatures:document_signatures(*),
        access_logs:document_access_logs(*, profiles:signer_id(username, full_name))
      `)
    .order("created_at", { ascending: false })

  if (!isLandlordRole(profile?.role)) {
    query = query.or(`tenant_id.eq.${user.id},signatures.signer_id.eq.${user.id}`)
  }

  if (validatedFilters.status?.length) {
    query = query.in("status", validatedFilters.status)
  }
  if (validatedFilters.type?.length) {
    query = query.in("document_type", validatedFilters.type)
  }
  if (validatedFilters.tenant_id) {
    query = query.eq("tenant_id", validatedFilters.tenant_id)
  }
  if (validatedFilters.unit_id) {
    query = query.eq("unit_id", validatedFilters.unit_id)
  }
  if (validatedFilters.date_from) {
    query = query.gte("created_at", validatedFilters.date_from)
  }
  if (validatedFilters.date_to) {
    query = query.lte("created_at", validatedFilters.date_to)
  }

  const { data: documents, error } = await query

  if (error) {
    console.error("Error fetching documents:", error)
    throw new Error("Failed to fetch documents.")
  }

  const client = supabase as any
  await Promise.allSettled(
    (documents ?? []).map((doc) =>
      client.rpc("log_document_access", {
        p_document_id: doc.id,
        p_action: "view",
        p_metadata: { source: "documents_page" },
      }),
    ),
  )

  return documents ?? []
}

export async function fetchDocumentStats(): Promise<DocumentStats> {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error("You must be logged in to view document statistics.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profileError) {
    console.error("Error fetching profile role for document stats:", profileError)
  }

  let query = supabase.from("documents").select("status")

  if (!isLandlordRole(profile?.role)) {
    query = query.eq("tenant_id", user.id)
  }

  const { data: documents, error } = await query

  if (error) {
    console.error("Error fetching document stats:", error)
    throw new Error("Failed to fetch document statistics.")
  }

  const stats: DocumentStats = {
    total_documents: documents?.length ?? 0,
    pending_signatures: documents?.filter((d) => d.status === "pending_signature").length ?? 0,
    signed_documents: documents?.filter((d) => d.status === "signed").length ?? 0,
    expired_documents: documents?.filter((d) => d.status === "expired").length ?? 0,
    draft_documents: documents?.filter((d) => d.status === "draft").length ?? 0,
  }

  return stats
}
