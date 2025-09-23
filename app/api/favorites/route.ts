import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import type { Database, Json } from "@/lib/supabase"
import createSupabaseServer from "@/utils/supabase-server"

type FavoriteRow = Database["public"]["Tables"]["user_favorites"]["Row"]

export type FavoriteMetadata = Record<string, string>

export type FavoriteResponse = {
  id: string
  entityType: string
  entityId: string
  sortOrder: number
  pinnedAt: string | null
  metadata?: FavoriteMetadata
}

function serializeFavorite(row: FavoriteRow): FavoriteResponse {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    sortOrder: row.sort_order,
    pinnedAt: row.pinned_at,
    metadata: normalizeMetadata(row.metadata),
  }
}

function normalizeMetadata(metadata: FavoriteRow["metadata"]): FavoriteMetadata | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined
  }

  const entries = Object.entries(metadata).reduce<FavoriteMetadata>((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value
    }
    return acc
  }, {})

  return Object.keys(entries).length > 0 ? entries : undefined
}

function sanitizeMetadata(metadata: unknown): Json | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined
  }

  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === "string") {
      result[key] = value
    }
  }

  return Object.keys(result).length > 0 ? (result as Json) : undefined
}

async function getAuthenticatedUserId() {
  const cookieStore = cookies()
  const supabase = createSupabaseServer(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { supabase, userId: null as const }
  }

  return { supabase, userId: user.id }
}

async function fetchUserFavorites(
  supabase: ReturnType<typeof createSupabaseServer>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("pinned_at", { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

async function buildFavoritesResponse(
  supabase: ReturnType<typeof createSupabaseServer>,
  userId: string,
  status = 200,
) {
  const favorites = await fetchUserFavorites(supabase, userId)
  return NextResponse.json(
    {
      favorites: favorites.map(serializeFavorite),
    },
    { status },
  )
}

export async function GET() {
  const { supabase, userId } = await getAuthenticatedUserId()

  if (!userId) {
    return NextResponse.json({ favorites: [] }, { status: 401 })
  }

  try {
    return await buildFavoritesResponse(supabase, userId)
  } catch (error) {
    console.error("Failed to load favorites", error)
    return NextResponse.json({ error: "Unable to fetch favorites" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { supabase, userId } = await getAuthenticatedUserId()

  if (!userId) {
    return NextResponse.json({ favorites: [] }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { entityType, entityId, metadata } = (payload || {}) as {
    entityType?: string
    entityId?: string
    metadata?: unknown
  }

  if (!entityType || !entityId) {
    return NextResponse.json(
      { error: "Missing entityType or entityId" },
      { status: 400 },
    )
  }

  try {
    const existing = await supabase
      .from("user_favorites")
      .select("id")
      .eq("user_id", userId)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle()

    if (existing.data?.id) {
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .eq("id", existing.data.id)
        .eq("user_id", userId)

      if (error) {
        throw error
      }
    } else {
      const { data: maxSortRow, error: sortError } = await supabase
        .from("user_favorites")
        .select("sort_order")
        .eq("user_id", userId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sortError && sortError.code !== "PGRST116") {
        throw sortError
      }

      const nextSortOrder = (maxSortRow?.sort_order ?? 0) + 1
      const insertPayload = {
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        metadata: sanitizeMetadata(metadata),
        sort_order: nextSortOrder,
        pinned_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase
        .from("user_favorites")
        .insert(insertPayload)

      if (insertError) {
        throw insertError
      }
    }

    return await buildFavoritesResponse(supabase, userId)
  } catch (error) {
    console.error("Failed to toggle favorite", error)
    return NextResponse.json({ error: "Unable to update favorite" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { supabase, userId } = await getAuthenticatedUserId()

  if (!userId) {
    return NextResponse.json({ favorites: [] }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { orderedIds } = (payload || {}) as { orderedIds?: unknown }

  if (!Array.isArray(orderedIds)) {
    return NextResponse.json(
      { error: "orderedIds must be an array" },
      { status: 400 },
    )
  }

  try {
    const favorites = await fetchUserFavorites(supabase, userId)
    const orderLookup = new Set(orderedIds)
    const now = new Date().toISOString()

    let position = 0
    const applyUpdate = async (id: string) => {
      position += 1
      const { error } = await supabase
        .from("user_favorites")
        .update({ sort_order: position, updated_at: now })
        .eq("id", id)
        .eq("user_id", userId)

      if (error) {
        throw error
      }
    }

    for (const id of orderedIds) {
      if (typeof id !== "string") {
        continue
      }

      if (!favorites.some((favorite) => favorite.id === id)) {
        continue
      }

      await applyUpdate(id)
    }

    for (const favorite of favorites) {
      if (orderLookup.has(favorite.id)) {
        continue
      }

      await applyUpdate(favorite.id)
    }

    return await buildFavoritesResponse(supabase, userId)
  } catch (error) {
    console.error("Failed to reorder favorites", error)
    return NextResponse.json({ error: "Unable to reorder favorites" }, { status: 500 })
  }
}
