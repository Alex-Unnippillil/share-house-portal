"use server"

import { z } from "zod"

import {
  type QuickAddIntent,
  type BookingQuickAddPayload,
  type InvoiceQuickAddPayload,
  type MaintenanceQuickAddPayload,
  type VisitorQuickAddPayload,
} from "@/lib/nlp/quick-add"
import { createSupbaseServerClient } from "@/utils/supaone"

const invoiceSubmissionSchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().length(3),
  dueDate: z.string().optional(),
  description: z.string().optional(),
  counterparty: z.string().optional(),
})

const bookingSubmissionSchema = z.object({
  amenityId: z.string().min(1),
  amenityLabel: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  hasExplicitEnd: z.boolean(),
  note: z.string().optional(),
})

const maintenanceSubmissionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]),
})

const visitorSubmissionSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  purpose: z.string().min(1),
})

const quickAddSubmissionSchema = z.discriminatedUnion("intent", [
  z.object({
    intent: z.literal("invoice"),
    commandText: z.string().min(1),
    payload: invoiceSubmissionSchema,
  }),
  z.object({
    intent: z.literal("booking"),
    commandText: z.string().min(1),
    payload: bookingSubmissionSchema,
  }),
  z.object({
    intent: z.literal("maintenance"),
    commandText: z.string().min(1),
    payload: maintenanceSubmissionSchema,
  }),
  z.object({
    intent: z.literal("visitor"),
    commandText: z.string().min(1),
    payload: visitorSubmissionSchema,
  }),
])

export type QuickAddSubmissionInput = z.infer<typeof quickAddSubmissionSchema>

export interface QuickAddSubmissionResult {
  success: boolean
  intent: QuickAddIntent
  recordId?: string
  message: string
}

export async function submitQuickAdd(
  submission: QuickAddSubmissionInput,
): Promise<QuickAddSubmissionResult> {
  const parsed = quickAddSubmissionSchema.safeParse(submission)

  if (!parsed.success) {
    throw new Error("Invalid quick-add payload.")
  }

  const payload = parsed.data
  const supabase = await createSupbaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!user) {
    throw new Error("You must be signed in to use Quick Add.")
  }

  switch (payload.intent) {
    case "invoice":
      return submitInvoice(payload.commandText, payload.payload, user.id, supabase)
    case "booking":
      return submitBooking(payload.commandText, payload.payload, user.id, supabase)
    case "maintenance":
      return submitMaintenance(payload.commandText, payload.payload, user.id, supabase)
    case "visitor":
      return submitVisitor(payload.commandText, payload.payload, user.id, supabase)
    default:
      throw new Error("Unsupported quick-add intent.")
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createSupbaseServerClient>>

async function submitInvoice(
  commandText: string,
  payload: InvoiceQuickAddPayload,
  userId: string,
  supabase: SupabaseClient,
): Promise<QuickAddSubmissionResult> {
  const { data, error } = await supabase
    .from("rent_payments")
    .insert({
      user_id: userId,
      amount: payload.amountCents,
      currency: payload.currency.toLowerCase(),
      status: "pending",
      description:
        payload.description ??
        (payload.counterparty
          ? `Quick add invoice for ${payload.counterparty}`
          : "Quick add invoice"),
      payer_name: payload.counterparty ?? null,
      metadata: {
        quick_add: true,
        due_date: payload.dueDate ?? null,
        command_text: commandText,
      },
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    success: true,
    intent: "invoice",
    recordId: data?.id,
    message: "Invoice draft recorded.",
  }
}

async function submitBooking(
  commandText: string,
  payload: BookingQuickAddPayload,
  userId: string,
  supabase: SupabaseClient,
): Promise<QuickAddSubmissionResult> {
  const { data, error } = await supabase
    .from("amenity_bookings")
    .insert({
      amenity_id: payload.amenityId,
      created_by: userId,
      status: payload.hasExplicitEnd ? "confirmed" : "pending",
      start_time: payload.startTime,
      end_time: payload.endTime,
      metadata: {
        quick_add: true,
        note: payload.note ?? null,
        amenity_label: payload.amenityLabel,
        command_text: commandText,
      },
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    success: true,
    intent: "booking",
    recordId: data?.id,
    message: "Amenity booking created.",
  }
}

async function submitMaintenance(
  commandText: string,
  payload: MaintenanceQuickAddPayload,
  userId: string,
  supabase: SupabaseClient,
): Promise<QuickAddSubmissionResult> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert({
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      status: "pending",
      requested_by: userId,
      metadata: {
        quick_add: true,
        command_text: commandText,
      },
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    success: true,
    intent: "maintenance",
    recordId: data?.id,
    message: "Maintenance request filed.",
  }
}

async function submitVisitor(
  commandText: string,
  payload: VisitorQuickAddPayload,
  userId: string,
  supabase: SupabaseClient,
): Promise<QuickAddSubmissionResult> {
  const { data, error } = await supabase
    .from("visitor_logs")
    .insert({
      guest_name: payload.guestName,
      guest_email: payload.guestEmail,
      guest_phone: payload.guestPhone ?? null,
      host_id: userId,
      check_in_date: payload.checkIn,
      check_out_date: payload.checkOut,
      purpose: payload.purpose,
      status: "pending",
      special_notes: commandText,
    })
    .select("id")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return {
    success: true,
    intent: "visitor",
    recordId: data?.id,
    message: "Visitor registered for review.",
  }
}
