import { cookies } from 'next/headers';

import { PaymentReceiptEmail, buildPaymentReceiptFromRentPayment } from '@/components/emails/payment-receipt';
import { Resend } from 'resend';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/supabase';
import { z } from 'zod';

const paymentReceiptSchema = z.object({
  rentPaymentId: z.string().uuid(),
  sendCopyTo: z.array(z.string().email()).optional(),
  overrideEmail: z.string().email().optional(),
});

export async function POST(request: Request) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return Response.json(
      { error: "Resend API key is not configured." },
      { status: 500 },
    );
  }

  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "You must be signed in to send receipts." }, { status: 401 });
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

  const { rentPaymentId, sendCopyTo, overrideEmail } = parsed.data;

  const paymentRecord = await supabase
    .from('rent_payments')
    .select('*, tenant:profiles(full_name, email, id, role)')
    .eq('id', rentPaymentId)
    .maybeSingle();

  if (paymentRecord.error) {
    return Response.json({ error: paymentRecord.error.message }, { status: 500 });
  }

  if (!paymentRecord.data) {
    return Response.json({ error: 'Rent payment not found.' }, { status: 404 });
  }

  const tenant = paymentRecord.data.tenant;

  const requesterProfile = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (requesterProfile.error) {
    return Response.json({ error: requesterProfile.error.message }, { status: 500 });
  }

  const requesterRole = requesterProfile.data?.role ?? 'user';
  const isTenant = tenant?.id === user.id;
  const canManage = ['property_manager', 'admin'].includes(requesterRole);

  if (!isTenant && !canManage) {
    return Response.json({ error: 'You do not have permission to send this receipt.' }, { status: 403 });
  }

  const tenantEmail = overrideEmail ?? tenant?.email ?? user.email;

  if (!tenantEmail) {
    return Response.json({ error: 'A recipient email is required.' }, { status: 400 });
  }

  const resend = new Resend(resendApiKey);

  const fromAddress = process.env.RESEND_RECEIPTS_FROM ?? 'Onyx Receipts <receipts@resend.dev>';
  const emailRecipients = [tenantEmail, ...(sendCopyTo ?? [])];

  const receiptProps = buildPaymentReceiptFromRentPayment({
    payment: paymentRecord.data,
    tenantName: tenant?.full_name ?? user.email ?? 'Resident',
    businessName: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : 'Onyx',
    supportEmail: process.env.SUPPORT_EMAIL ?? undefined,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: emailRecipients,
      subject: `Receipt for payment ${receiptProps.paymentId}`,
      react: PaymentReceiptEmail(receiptProps),
    });

    if (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ error: message }, { status: 502 });
    }

    return Response.json({ id: data?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
