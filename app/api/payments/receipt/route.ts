import { enqueuePaymentReceiptEmail } from "@/lib/notification-queue";
import { paymentReceiptSchema } from "@/lib/payment-receipt";

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return Response.json(
      { error: "Resend API key is not configured." },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json(
      { error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  const parsed = paymentReceiptSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid payment receipt payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const correlationId =
    request.headers.get("x-request-id") ??
    `payment-receipt:${parsed.data.paymentId}`;

  try {
    const { jobId } = await enqueuePaymentReceiptEmail(parsed.data, {
      correlationId,
      maxAttempts: 5,
    });

    console.info("Enqueued payment receipt email job", {
      jobId,
      correlationId,
      paymentId: parsed.data.paymentId,
      customerEmail: parsed.data.customerEmail,
    });

    return Response.json(
      { success: true, jobId, correlationId },
      { status: 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
