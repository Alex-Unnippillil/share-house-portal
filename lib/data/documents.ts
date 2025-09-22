"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { recordNetworkBatch } from "./instrumentation";
import type { DocumentListFilters, DocumentWithLease } from "@/types/documents";
import type { TypedSupabaseClient } from "@/utils/typed-supabase-client";
import createSupabaseServer from "@/utils/supabase-server";

const documentListFiltersSchema = z.object({
  status: z.array(z.enum(["draft", "pending_signature", "signed", "expired", "cancelled"])).optional(),
  type: z.array(z.enum(["lease", "addendum", "insurance", "maintenance", "other"])).optional(),
  tenant_id: z.string().uuid().optional(),
  unit_id: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

interface DocumentLoaderOptions {
  filters?: DocumentListFilters;
  client?: TypedSupabaseClient;
}

export interface DocumentsListPayload {
  documents: DocumentWithLease[];
}

export async function getDocumentsListPayload(
  options: DocumentLoaderOptions = {}
): Promise<DocumentsListPayload> {
  const supabase = options.client ?? createSupabaseServer(cookies());
  const filters = options.filters ? documentListFiltersSchema.parse(options.filters) : {};
  let requestCount = 0;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  requestCount += 1;

  if (authError || !authData?.user) {
    throw new Error("You must be logged in to view documents.");
  }

  const { data, error } = await supabase.rpc("get_documents_with_relations", {
    p_user_id: authData.user.id,
    p_filters: filters,
  });
  requestCount += 1;

  if (error) {
    throw new Error(error.message || "Failed to load documents.");
  }

  const documents = (data as DocumentWithLease[]) || [];

  recordNetworkBatch("documents.page", requestCount);

  return { documents };
}
