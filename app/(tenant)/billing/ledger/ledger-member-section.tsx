import React from 'react'
import { formatCurrency, formatDate, LedgerSummary } from './ledger-utils'

type LedgerMemberSectionProps = {
  summary: LedgerSummary
  currency?: string
}

function getMandateLabel(summary: LedgerSummary): string {
  const mandate = summary.padMandate

  if (!mandate) {
    return 'No PAD mandate on file'
  }

  const bank = mandate.bank_name ? `${mandate.bank_name} •••${mandate.account_last4 ?? ''}`.trim() : undefined

  switch (mandate.status) {
    case 'active':
      return bank ? `Active PAD with ${bank}` : 'Active PAD mandate'
    case 'pending':
      return bank ? `Pending PAD confirmation for ${bank}` : 'PAD mandate pending confirmation'
    case 'revoked':
      return 'PAD mandate revoked'
    default:
      return 'No PAD mandate on file'
  }
}

export function LedgerMemberSection({ summary, currency = 'CAD' }: LedgerMemberSectionProps) {
  const mandateLabel = getMandateLabel(summary)

  return (
    <section
      aria-labelledby={`member-ledger-${summary.member.id}`}
      className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 id={`member-ledger-${summary.member.id}`} className="text-lg font-semibold text-slate-900">
            {summary.member.name}
          </h2>
          {summary.member.email ? (
            <p className="text-sm text-slate-500">{summary.member.email}</p>
          ) : (
            <p className="text-sm text-slate-500">No email on file</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding balance</p>
          <p className="text-2xl font-semibold text-rose-600">
            {formatCurrency(summary.outstandingBalance, currency)}
          </p>
          <p className="text-xs text-slate-500">
            Late fees accrued: {formatCurrency(summary.lateFeesAccrued, currency)}
          </p>
          <p className="mt-2 text-xs text-slate-500">{mandateLabel}</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label="Invoice ledger">
            <caption className="bg-slate-50 px-4 py-2 text-left text-sm font-medium text-slate-700">
              Invoices
            </caption>
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-semibold text-slate-700">
                  Invoice
                </th>
                <th scope="col" className="px-4 py-2 text-left font-semibold text-slate-700">
                  Due date
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-slate-700">
                  Amount
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-slate-700">
                  Paid
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-slate-700">
                  Outstanding
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-slate-700">
                  Late fees
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summary.invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                summary.invoices.map(invoice => (
                  <tr key={invoice.id} className="bg-white">
                    <th
                      scope="row"
                      className="px-4 py-2 text-left text-sm font-medium text-slate-700"
                    >
                      {invoice.description ?? `Invoice ${invoice.id}`}
                    </th>
                    <td className="px-4 py-2 text-sm text-slate-600">{formatDate(invoice.due_date)}</td>
                    <td className="px-4 py-2 text-right text-sm text-slate-700">
                      {formatCurrency(invoice.amount_due, currency)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-600">
                      {formatCurrency(invoice.amount_paid, currency)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-700">
                      {formatCurrency(invoice.remaining_balance, currency)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-600">
                      {formatCurrency(invoice.late_fee_amount, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm" aria-label="Payment history">
            <caption className="bg-slate-50 px-4 py-2 text-left text-sm font-medium text-slate-700">
              Payments
            </caption>
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-semibold text-slate-700">
                  Payment
                </th>
                <th scope="col" className="px-4 py-2 text-left font-semibold text-slate-700">
                  Applied to
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-slate-700">
                  Amount
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-slate-700">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {summary.payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                    No payments recorded
                  </td>
                </tr>
              ) : (
                summary.payments.map(payment => (
                  <tr key={payment.id} className="bg-white">
                    <th
                      scope="row"
                      className="px-4 py-2 text-left text-sm font-medium text-slate-700"
                    >
                      {payment.method ?? 'Payment'}
                    </th>
                    <td className="px-4 py-2 text-sm text-slate-600">
                      {payment.invoice_id ? `Invoice ${payment.invoice_id}` : 'Unapplied'}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-700">
                      {formatCurrency(payment.amount, currency)}
                    </td>
                    <td className="px-4 py-2 text-right text-sm text-slate-600">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {summary.partialPayments.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-amber-200">
          <table className="min-w-full divide-y divide-amber-200 text-sm" aria-label="Partial payments">
            <caption className="bg-amber-50 px-4 py-2 text-left text-sm font-medium text-amber-800">
              Partial payment breakdown
            </caption>
            <thead className="bg-amber-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-semibold text-amber-800">
                  Invoice
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-amber-800">
                  Amount due
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-amber-800">
                  Paid to date
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-amber-800">
                  Remaining
                </th>
                <th scope="col" className="px-4 py-2 text-right font-semibold text-amber-800">
                  Late fees
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-200 bg-white">
              {summary.partialPayments.map(partial => (
                <tr key={partial.invoice_id}>
                  <th
                    scope="row"
                    className="px-4 py-2 text-left text-sm font-medium text-amber-900"
                  >
                    {partial.description}
                  </th>
                  <td className="px-4 py-2 text-right text-sm text-amber-900">
                    {formatCurrency(partial.amount_due, currency)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-amber-900">
                    {formatCurrency(partial.amount_paid, currency)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-amber-900">
                    {formatCurrency(partial.remaining_balance, currency)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm text-amber-900">
                    {formatCurrency(partial.late_fee_amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
