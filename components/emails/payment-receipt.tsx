import * as React from 'react';
import type {
  PaymentReceiptTaxBreakdown,
  PaymentReceiptTaxDetails,
} from '@/types/payments';

export interface PaymentReceiptLineItem {
  description: string;
  quantity?: number;
  unitAmount?: number;
  totalAmount?: number;
}

export interface PaymentReceiptEmailProps {
  customerName: string;
  paymentId: string;
  amountPaid: number;
  currency: string;
  paymentDate: Date;
  items?: PaymentReceiptLineItem[];
  businessName?: string;
  supportEmail?: string;
  billingAddress?: string;
  notes?: string;
  subtotalAmount?: number;
  taxAmount?: number;
  taxRate?: number;
  taxDetails?: PaymentReceiptTaxDetails;
  discountAmount?: number;
}

const formatCurrency = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch (error) {
    const formattedAmount = amount.toFixed(2);
    return `${formattedAmount} ${currency}`;
  }
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(2).replace(/\.00$/, '')}%`;
};

const renderLineItems = (
  items: PaymentReceiptLineItem[] | undefined,
  currency: string,
) => {
  if (!items?.length) return null;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>Item</th>
          <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>Qty</th>
          <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>Unit</th>
          <th style={{ textAlign: 'right', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.description}-${index}`}>
            <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>{item.description}</td>
            <td style={{ padding: '8px 0', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
              {item.quantity ?? '-'}
            </td>
            <td style={{ padding: '8px 0', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
              {item.unitAmount != null ? formatCurrency(item.unitAmount, currency) : '—'}
            </td>
            <td style={{ padding: '8px 0', textAlign: 'right', borderBottom: '1px solid #f1f5f9' }}>
              {item.totalAmount != null
                ? formatCurrency(item.totalAmount, currency)
                : item.unitAmount != null && item.quantity != null
                  ? formatCurrency(item.unitAmount * item.quantity, currency)
                  : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const renderTotals = (
  props: Pick<
    PaymentReceiptEmailProps,
    |
      'subtotalAmount'
      | 'taxAmount'
      | 'taxRate'
      | 'discountAmount'
      | 'amountPaid'
      | 'currency'
  >,
) => {
  const { subtotalAmount, taxAmount, taxRate, discountAmount, amountPaid, currency } = props;

  const hasAdjustments =
    subtotalAmount != null || taxAmount != null || discountAmount != null;

  if (!hasAdjustments) {
    return (
      <p style={{ textAlign: 'right', fontWeight: 600, marginTop: '16px' }}>
        Total: {formatCurrency(amountPaid, currency)}
      </p>
    );
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {subtotalAmount != null && (
            <tr>
              <td style={{ padding: '4px 0', textAlign: 'right', color: '#475569' }}>Subtotal</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500 }}>
                {formatCurrency(subtotalAmount, currency)}
              </td>
            </tr>
          )}
          {taxAmount != null && (
            <tr>
              <td style={{ padding: '4px 0', textAlign: 'right', color: '#475569' }}>Tax</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500 }}>
                {taxRate != null && (
                  <span style={{ color: '#64748b', marginRight: '8px', fontWeight: 400 }}>
                    {formatPercent(taxRate)}
                  </span>
                )}
                {formatCurrency(taxAmount, currency)}
              </td>
            </tr>
          )}
          {discountAmount != null && (
            <tr>
              <td style={{ padding: '4px 0', textAlign: 'right', color: '#475569' }}>Discount</td>
              <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500 }}>
                -{formatCurrency(discountAmount, currency)}
              </td>
            </tr>
          )}
          <tr>
            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>Total Paid</td>
            <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>
              {formatCurrency(amountPaid, currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const renderTaxDetails = (
  details: PaymentReceiptTaxDetails | undefined,
  currency: string,
) => {
  if (!details) return null;

  if (Array.isArray(details)) {
    const entries = details as PaymentReceiptTaxBreakdown[];

    if (!entries.length) {
      return null;
    }

    return (
      <div style={{ marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#0f172a' }}>
          Tax breakdown
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={`${entry.label}-${index}`}>
                <td style={{ padding: '4px 0', textAlign: 'left', color: '#475569' }}>
                  <div style={{ fontWeight: 500, color: '#0f172a' }}>{entry.label}</div>
                  {entry.jurisdiction ? (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{entry.jurisdiction}</div>
                  ) : null}
                </td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 500 }}>
                  {entry.rate != null && (
                    <span style={{ color: '#64748b', marginRight: '8px', fontWeight: 400 }}>
                      {formatPercent(entry.rate)}
                    </span>
                  )}
                  {formatCurrency(entry.amount, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#0f172a' }}>Tax details</h3>
      <pre
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          lineHeight: 1.5,
          color: '#1e293b',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {JSON.stringify(details, null, 2)}
      </pre>
    </div>
  );
};

export const PaymentReceiptEmail: React.FC<Readonly<PaymentReceiptEmailProps>> = ({
  customerName,
  paymentId,
  amountPaid,
  currency,
  paymentDate,
  items,
  businessName = 'Roomsily',
  supportEmail,
  billingAddress,
  notes,
  subtotalAmount,
  taxAmount,
  taxRate,
  taxDetails,
  discountAmount,
}) => {
  return (
    <div
      style={{
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        backgroundColor: '#f8fafc',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
        }}
      >
        <div style={{ backgroundColor: '#111827', color: '#f8fafc', padding: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>{businessName}</h1>
          <p style={{ margin: '8px 0 0', color: '#cbd5f5' }}>Payment Receipt</p>
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 16px', fontSize: '16px', color: '#0f172a' }}>
            Hi {customerName},
          </p>
          <p style={{ margin: '0 0 24px', color: '#475569', lineHeight: 1.6 }}>
            Thank you for your payment. This email is a receipt for your recent transaction. A
            summary of the payment is included below for your records.
          </p>

          <div
            style={{
              backgroundColor: '#f1f5f9',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '24px',
              display: 'grid',
              gap: '8px',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            }}
          >
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                Payment ID
              </p>
              <p style={{ margin: '4px 0 0', color: '#0f172a', fontWeight: 600 }}>{paymentId}</p>
            </div>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                Paid On
              </p>
              <p style={{ margin: '4px 0 0', color: '#0f172a', fontWeight: 600 }}>
                {formatDate(paymentDate)}
              </p>
            </div>
            <div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                Amount Paid
              </p>
              <p style={{ margin: '4px 0 0', color: '#0f172a', fontWeight: 600 }}>
                {formatCurrency(amountPaid, currency)}
              </p>
            </div>
          </div>

          {renderLineItems(items, currency)}

          {renderTotals({
            subtotalAmount,
            taxAmount,
            taxRate,
            discountAmount,
            amountPaid,
            currency,
          })}

          {renderTaxDetails(taxDetails, currency)}

          {billingAddress && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#0f172a' }}>Billing Address</h3>
              <p style={{ margin: 0, whiteSpace: 'pre-line', color: '#475569' }}>{billingAddress}</p>
            </div>
          )}

          {notes && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#0f172a' }}>Notes</h3>
              <p style={{ margin: 0, color: '#475569' }}>{notes}</p>
            </div>
          )}

          <div style={{ marginTop: '32px', color: '#475569', fontSize: '14px', lineHeight: 1.6 }}>
            <p style={{ margin: 0 }}>
              If you have any questions about this payment, please contact
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} style={{ color: '#2563eb', textDecoration: 'none', marginLeft: '4px' }}>
                  {supportEmail}
                </a>
              ) : (
                ' our support team'
              )}
              .
            </p>
            <p style={{ margin: '16px 0 0' }}>Thank you for choosing {businessName}.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptEmail;
