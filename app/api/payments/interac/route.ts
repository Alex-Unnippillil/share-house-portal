import { createHash } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseAdminClient } from "@/utils/supabase-admin";

const requestSchema = z.object({
  senderName: z.string().min(1).max(120),
  senderEmail: z.string().email(),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3).default("CAD"),
  reference: z.string().max(140).optional(),
  message: z.string().max(500).optional(),
  securityQuestion: z.string().max(160).optional(),
  securityAnswer: z.string().max(160).optional(),
  autoDeposit: z.boolean().optional(),
  userId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = requestSchema.parse(json);

    const supabase = getSupabaseAdminClient();
    const amountCents = Math.round(payload.amount * 100);
    const hashedAnswer = payload.securityAnswer
      ? createHash("sha256").update(payload.securityAnswer).digest("hex")
      : null;

    const { data, error } = await supabase
      .from("interac_payments")
      .insert({
        sender_name: payload.senderName,
        sender_email: payload.senderEmail,
        amount_cents: amountCents,
        currency: payload.currency.toUpperCase(),
        reference: payload.reference ?? null,
        message: payload.message ?? null,
        security_question: payload.securityQuestion ?? null,
        security_answer_hash: hashedAnswer,
        auto_deposit: payload.autoDeposit ?? false,
        status: "pending",
        user_id: payload.userId ?? null,
        metadata: payload.metadata ?? null,
      })
      .select("id, status")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        id: data?.id,
        status: data?.status ?? "pending",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid request payload.", issues: error.flatten() },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error("Failed to log Interac payment", error);
      return NextResponse.json(
        { message: error.message },
        { status: 500 }
      );
    }

    console.error("Failed to log Interac payment", error);
    return NextResponse.json(
      { message: "Unexpected error logging Interac payment." },
      { status: 500 }
    );
  }
}
