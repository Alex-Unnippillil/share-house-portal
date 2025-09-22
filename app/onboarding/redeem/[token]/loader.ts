import { cache } from "react"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { createClient } from "@/utils/supa-server-actions"
import type { Tables } from "@/lib/supabase"

import type { InvitePrefetchContext } from "./types"

const fallbackInvites: Record<
  string,
  {
    invite: Tables<"household_invites">
    unit: Tables<"units">
    property: Tables<"properties">
  }
> = {
  "demo-welcome-token": {
    invite: {
      id: "invite-demo-001",
      token: "demo-welcome-token",
      email: "jamie.lee@example.com",
      status: "pending",
      invited_by: "user-taylor-morgan",
      property_id: "property-demo-001",
      unit_id: "unit-demo-3b",
      message: "Excited to have you join the household. Move-in is scheduled for June 1st!",
      created_at: new Date("2024-05-12T10:00:00Z").toISOString(),
      expires_at: new Date("2024-07-01T23:59:59Z").toISOString(),
      metadata: {
        invited_by_name: "Taylor Morgan",
        rent_share_recommendation: 1275,
      },
    },
    unit: {
      id: "unit-demo-3b",
      property_id: "property-demo-001",
      unit_number: "3B",
      bedrooms: 2,
      bathrooms: 2,
      floor_area: 980,
      rent: 2550,
      currency: "USD",
      available_from: "2024-06-01",
      created_at: null,
      updated_at: null,
      metadata: {
        parking: "Underground spot 17",
        features: ["Balcony", "In-unit laundry", "South-facing windows"],
      },
    },
    property: {
      id: "property-demo-001",
      name: "Hudson Loft Residences",
      address_line1: "88 Riverside Avenue",
      address_line2: "Lobby 4",
      city: "Jersey City",
      state: "NJ",
      postal_code: "07302",
      country: "US",
      timezone: "America/New_York",
      created_at: null,
      updated_at: null,
      metadata: {
        amenities: ["Rooftop Deck", "Co-working Lounge", "Bike Storage", "Secure Package Room"],
      },
    },
  },
}

const parseMetadata = (value: Tables<"household_invites">["metadata"]): Record<string, unknown> | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null
  }
  return value as Record<string, unknown>
}

const parsePropertyMetadata = (value: Tables<"properties">["metadata"]): Record<string, unknown> | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null
  }
  return value as Record<string, unknown>
}

const parseUnitMetadata = (value: Tables<"units">["metadata"]): Record<string, unknown> | null => {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null
  }
  return value as Record<string, unknown>
}

const extractAmenities = (metadata: Record<string, unknown> | null): string[] => {
  if (!metadata) {
    return []
  }

  const amenities = metadata["amenities"]
  if (!Array.isArray(amenities)) {
    return []
  }

  return amenities.filter((item): item is string => typeof item === "string")
}

const normalizeContext = (
  record: {
    invite: Tables<"household_invites">
    unit: Tables<"units">
    property: Tables<"properties">
  }
): InvitePrefetchContext => {
  const inviteMetadata = parseMetadata(record.invite.metadata)
  const unitMetadata = parseUnitMetadata(record.unit.metadata)
  const propertyMetadata = parsePropertyMetadata(record.property.metadata)

  const invitedByName = inviteMetadata?.invited_by_name
  const normalizedInvitedByName = typeof invitedByName === "string" ? invitedByName : null

  return {
    inviteToken: record.invite.token,
    inviteeEmail: record.invite.email,
    invitedByName: normalizedInvitedByName,
    notes: record.invite.message ?? null,
    inviteMetadata: inviteMetadata,
    unit: {
      id: record.unit.id,
      label: record.unit.unit_number,
      bedrooms: record.unit.bedrooms,
      bathrooms: record.unit.bathrooms,
      floorArea: record.unit.floor_area,
      rent: record.unit.rent,
      currency: record.unit.currency,
      availableFrom: record.unit.available_from,
      metadata: unitMetadata,
    },
    property: {
      id: record.property.id,
      name: record.property.name,
      addressLine1: record.property.address_line1,
      addressLine2: record.property.address_line2,
      city: record.property.city,
      state: record.property.state,
      postalCode: record.property.postal_code,
      country: record.property.country,
      timezone: record.property.timezone,
      amenities: extractAmenities(propertyMetadata),
      metadata: propertyMetadata,
    },
    serverRenderedAt: Date.now(),
  }
}

export const loadInviteContext = cache(async (token: string): Promise<InvitePrefetchContext> => {
  const cookieStore = cookies()
  const client = createClient(cookieStore)

  const canQuerySupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (canQuerySupabase) {
    try {
      const { data, error } = await client
        .from("household_invites")
        .select(
          `*,
          unit:units(*),
          property:properties(*)`
        )
        .eq("token", token)
        .maybeSingle()

      if (error) {
        console.error("Failed to load invite context from Supabase", error)
      } else if (data && data.unit && data.property) {
        return normalizeContext({
          invite: {
            id: data.id,
            token: data.token,
            email: data.email,
            status: data.status,
            invited_by: data.invited_by,
            property_id: data.property_id,
            unit_id: data.unit_id,
            message: data.message,
            created_at: data.created_at,
            expires_at: data.expires_at,
            metadata: data.metadata,
          },
          unit: data.unit,
          property: data.property,
        })
      }
    } catch (error) {
      console.error("Unexpected error while loading invite context", error)
    }
  }

  const fallback = fallbackInvites[token]
  if (!fallback) {
    notFound()
  }

  return normalizeContext(fallback)
})
