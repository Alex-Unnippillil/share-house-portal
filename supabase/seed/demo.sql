-- Seed demo payments ensuring each invoice has a mock Stripe payment intent
INSERT INTO public.payments (invoice_id, stripe_pi_id, amount_cents, status)
SELECT
  i.id,
  'pi_demo_' || substr(md5(i.id::text), 1, 24),
  GREATEST(100, (get_byte(decode(md5(i.id::text), 'hex'), 0) + 1) * 100),
  'succeeded'
FROM public.invoices i
WHERE NOT EXISTS (
  SELECT 1 FROM public.payments p WHERE p.invoice_id = i.id
);
