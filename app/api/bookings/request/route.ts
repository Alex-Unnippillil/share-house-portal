import { mapPostgresError } from "@/lib/postgres-error-map"
import { createClient } from "@/utils/supabase/server"
import { z } from "zod"

const bookingRequestSchema = z
  .object({
    amenityId: z.string().min(1, "Amenity is required."),
    unitId: z.string().min(1, "Unit is required."),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.endsAt > data.startsAt, {
    message: "End time must be after start time.",
    path: ["endsAt"],
  })

type BookingRequest = z.infer<typeof bookingRequestSchema>

function formatBookingPayload(input: BookingRequest, tenantId: string) {
  return {
    amenity_id: input.amenityId,
    unit_id: input.unitId,
    start_time: input.startsAt.toISOString(),
    end_time: input.endsAt.toISOString(),
    notes: input.notes ?? null,
    tenant_id: tenantId,
  }
}

export async function POST(request: Request) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 })
  }

  const parsed = bookingRequestSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid booking request.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  const bookingRow = formatBookingPayload(parsed.data, user.id)

  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert(bookingRow)
      .select()
      .single()

    if (error) {
      const { message, status } = mapPostgresError(error)
      return Response.json({ error: message }, { status })
    }

    return Response.json({ booking: data }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error."
    return Response.json({ error: message }, { status: 500 })
  }
}
