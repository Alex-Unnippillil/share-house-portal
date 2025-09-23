import type { ReactNode } from "react"

import { cookies } from "next/headers"

import Breadcrumbs from "@/components/navigation/Breadcrumbs"
import createSupabaseServer from "@/utils/supabase-server"

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

async function resolveDocumentLabel(documentId: string): Promise<string | null> {
  if (!documentId) {
    return null
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null
  }

  try {
    const supabase = createSupabaseServer(cookies())
    const { data, error } = await supabase
      .from("documents")
      .select("title")
      .eq("id", documentId)
      .maybeSingle()

    if (error) {
      return null
    }

    if (data && hasText(data.title)) {
      return data.title
    }
  } catch (error) {
    return null
  }

  return null
}

const formatDocumentFallback = (documentId: string) =>
  `Document ${documentId.slice(0, 8).toUpperCase()}`

export default async function DocumentsLayout({
  children,
  params,
}: {
  children: ReactNode
  params: { documentId?: string }
}) {
  const documentId = params?.documentId
  const resolvedLabel = documentId ? await resolveDocumentLabel(documentId) : null
  const segmentLabels = documentId
    ? { [documentId]: resolvedLabel ?? formatDocumentFallback(documentId) }
    : undefined

  return (
    <>
      <div className="container max-w-7xl pb-4 pt-6">
        <Breadcrumbs segmentLabels={segmentLabels} />
      </div>
      {children}
    </>
  )
}
