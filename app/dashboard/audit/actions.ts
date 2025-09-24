"use server"

import { format } from "date-fns"

import {
  type AuditLogFilters,
  AuditLogFetchError,
  createAuditLogCsv,
  fetchAuditLogs,
} from "@/lib/audit-logs"
import { createSupbaseServerClient } from "@/utils/supaone"

const EXPORT_ROW_LIMIT = 1000

export type AuditLogExportInput = {
  filters: AuditLogFilters
  limit?: number
}

export type AuditLogExportResponse =
  | { success: true; csv: string; fileName: string; count: number }
  | { success: false; error: string }

export async function exportAuditLogsCsvAction(
  input: AuditLogExportInput
): Promise<AuditLogExportResponse> {
  try {
    const supabase = await createSupbaseServerClient()
    const limit = Math.min(input.limit ?? EXPORT_ROW_LIMIT, EXPORT_ROW_LIMIT)

    const result = await fetchAuditLogs(
      supabase,
      input.filters,
      { limit, page: 1 },
      { includeFacets: false }
    )

    const csv = createAuditLogCsv(result.logs)
    const fileName = `audit-logs-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`

    return {
      success: true,
      csv,
      fileName,
      count: result.logs.length,
    }
  } catch (error) {
    if (error instanceof AuditLogFetchError) {
      return { success: false, error: error.message }
    }

    console.error("Failed to export audit logs", { error, input })
    return { success: false, error: "Failed to export audit logs" }
  }
}
