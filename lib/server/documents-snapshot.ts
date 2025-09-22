"use server"

import { cookies } from "next/headers"

import { createClient } from "@/utils/supa-server-actions"
import type { DocumentWithLease } from "@/types/documents"

export const fetchDocumentsForApi = async (): Promise<DocumentWithLease[]> => {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { data, error } = await (supabase as any)
    .from("documents")
    .select(
      `
        *,
        lease:leases(*),
        signatures:document_signatures(*),
        access_logs:document_access_logs(*)
      `
    )
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data as DocumentWithLease[] | null) ?? []
}
