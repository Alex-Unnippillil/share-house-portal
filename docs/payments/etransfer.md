# Manual e-Transfer fallback guide

This guide explains how to reconcile rent payments that arrive via Interac e-Transfer instead of the default Stripe flow. Tenants
receive a unique memo reference code on the portal that should be copied into their banking app. When the code is present the
ledger auto-matches the transfer. Use the process below when a deposit arrives without a reference code or needs manual
intervention.

## Reference codes

- Reference codes are generated from the invoice number, tenant ID, and lease identifier. They are deterministic, so tenants and
  admins will always see the same code.
- The memo field is mandatory. Transfers without the code are held for manual review and can take up to one business day to
  appear on the tenant ledger.
- If a tenant cannot paste the code, instruct them to email the bank confirmation and reference the fallback steps in this
  document.

## Manual reconciliation workflow

1. Confirm the transfer hit the auto-deposit inbox (`payments@onyxsharehouse.com`).
2. Look up the tenant invoice in the portal and copy the generated reference code. The code is displayed on
   `/billing/e-transfer` and in the admin manual receipts tool.
3. Navigate to **Dashboard → Payments → Manual receipts** and enter the transfer details. Include the bank confirmation number
   in the notes field for auditing.
4. Once saved the receipt is marked `completed` in the `payments` table. The ledger and tenant receipts update immediately.
5. If the tenant used the wrong amount, record the payment for the actual deposited value and flag the variance to the property
   manager for follow-up.

## Operational limitations

- Interac deposits that arrive after 17:00 local time are reconciled the following morning.
- Manual receipts do not trigger Stripe emails. Send a separate acknowledgement if the tenant expects a confirmation message.
- The admin form does not currently support batch entry. Each transfer must be logged individually.
- Auto-matching depends on the memo code. Encourage tenants to use the generated code even if they have previously paid by
  e-Transfer.

## Escalation checklist

- If a receipt is still missing after four business hours, verify the memo code and confirm that the transfer hit the
  auto-deposit inbox.
- If the funds are missing from the inbox, contact the tenant for the transaction confirmation number and escalate to the bank if
  required.
- Document any escalations in the manual receipt notes so future audits can trace the resolution path.
