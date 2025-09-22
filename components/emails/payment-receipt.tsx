import * as React from 'react';

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

const styles = {
  container: {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    backgroundColor: '#f8fafc',
    padding: '24px',
  },
  card: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
  },
  header: {
    backgroundColor: '#111827',
    color: '#f8fafc',
    padding: '24px',
  },
  headerTitle: {
    margin: 0,
    fontSize: '24px',
  },
  headerSubtitle: {
    margin: '8px 0 0',
    color: '#cbd5f5',
  },
  content: {
    padding: '24px',
  },
  greeting: {
    margin: '0 0 16px',
    fontSize: '16px',
    color: '#0f172a',
  },
  summaryText: {
    margin: '0 0 24px',
    color: '#475569',
    lineHeight: 1.6,
  },
  summaryGrid: {
    backgroundColor: '#f1f5f9',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '24px',
    display: 'grid',
    gap: '8px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  },
  summaryLabel: {
    margin: 0,
    color: '#64748b',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  summaryValue: {
    margin: '4px 0 0',
    color: '#0f172a',
    fontWeight: 600,
  },
  lineItemsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px',
  },
  lineItemsHeaderLeft: {
    textAlign: 'left' as const,
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  lineItemsHeaderRight: {
    textAlign: 'right' as const,
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  lineItemCell: {
    padding: '8px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  lineItemCellRight: {
    padding: '8px 0',
    textAlign: 'right' as const,
    borderBottom: '1px solid #f1f5f9',
  },
  totalText: {
    textAlign: 'right' as const,
    fontWeight: 600,
    marginTop: '16px',
  },
  totalsWrapper: {
    marginTop: '16px',
  },
  totalsTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  totalsLabel: {
    padding: '4px 0',
    textAlign: 'right' as const,
    color: '#475569',
  },
  totalsValue: {
    padding: '4px 0',
    textAlign: 'right' as const,
    fontWeight: 500,
  },
  totalsStrongLabel: {
    padding: '8px 0',
    textAlign: 'right' as const,
    fontWeight: 600,
  },
  totalsStrongValue: {
    padding: '8px 0',
    textAlign: 'right' as const,
    fontWeight: 600,
  },
  section: {
    marginTop: '24px',
  },
  sectionHeading: {
    margin: '0 0 8px',
    fontSize: '16px',
    color: '#0f172a',
  },
  sectionParagraph: {
    margin: 0,
    color: '#475569',
  },
  address: {
    margin: 0,
    whiteSpace: 'pre-line' as const,
    color: '#475569',
  },
  notice: {
    marginTop: '32px',
    color: '#475569',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  noticeParagraph: {
    margin: 0,
  },
  noticeLink: {
    color: '#2563eb',
    textDecoration: 'none',
    marginLeft: '4px',
  },
  noticeThanks: {
    margin: '16px 0 0',
  },
} satisfies Record<string, React.CSSProperties>;

const renderLineItems = (
  items: PaymentReceiptLineItem[] | undefined,
  currency: string,
) => {
  if (!items?.length) return null;

  return (
    <table style={styles.lineItemsTable}>
      <thead>
        <tr>
          <th style={styles.lineItemsHeaderLeft}>Item</th>
          <th style={styles.lineItemsHeaderRight}>Qty</th>
          <th style={styles.lineItemsHeaderRight}>Unit</th>
          <th style={styles.lineItemsHeaderRight}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.description}-${index}`}>
            <td style={styles.lineItemCell}>{item.description}</td>
            <td style={styles.lineItemCellRight}>
              {item.quantity ?? '-'}
            </td>
            <td style={styles.lineItemCellRight}>
              {item.unitAmount != null ? formatCurrency(item.unitAmount, currency) : '—'}
            </td>
            <td style={styles.lineItemCellRight}>
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
    'subtotalAmount' | 'taxAmount' | 'discountAmount' | 'amountPaid' | 'currency'
  >,
) => {
  const { subtotalAmount, taxAmount, discountAmount, amountPaid, currency } = props;

  const hasAdjustments =
    subtotalAmount != null || taxAmount != null || discountAmount != null;

  if (!hasAdjustments) {
    return (
      <p style={styles.totalText}>
        Total: {formatCurrency(amountPaid, currency)}
      </p>
    );
  }

  return (
    <div style={styles.totalsWrapper}>
      <table style={styles.totalsTable}>
        <tbody>
          {subtotalAmount != null && (
            <tr>
              <td style={styles.totalsLabel}>Subtotal</td>
              <td style={styles.totalsValue}>
                {formatCurrency(subtotalAmount, currency)}
              </td>
            </tr>
          )}
          {taxAmount != null && (
            <tr>
              <td style={styles.totalsLabel}>Tax</td>
              <td style={styles.totalsValue}>
                {formatCurrency(taxAmount, currency)}
              </td>
            </tr>
          )}
          {discountAmount != null && (
            <tr>
              <td style={styles.totalsLabel}>Discount</td>
              <td style={styles.totalsValue}>
                -{formatCurrency(discountAmount, currency)}
              </td>
            </tr>
          )}
          <tr>
            <td style={styles.totalsStrongLabel}>Total Paid</td>
            <td style={styles.totalsStrongValue}>
              {formatCurrency(amountPaid, currency)}
            </td>
          </tr>
        </tbody>
      </table>
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
  businessName = 'Onyx',
  supportEmail,
  billingAddress,
  notes,
  subtotalAmount,
  taxAmount,
  discountAmount,
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>{businessName}</h1>
          <p style={styles.headerSubtitle}>Payment Receipt</p>
        </div>

        <div style={styles.content}>
          <p style={styles.greeting}>
            Hi {customerName},
          </p>
          <p style={styles.summaryText}>
            Thank you for your payment. This email is a receipt for your recent transaction. A
            summary of the payment is included below for your records.
          </p>

          <div style={styles.summaryGrid}>
            <div>
              <p style={styles.summaryLabel}>
                Payment ID
              </p>
              <p style={styles.summaryValue}>{paymentId}</p>
            </div>
            <div>
              <p style={styles.summaryLabel}>
                Paid On
              </p>
              <p style={styles.summaryValue}>
                {formatDate(paymentDate)}
              </p>
            </div>
            <div>
              <p style={styles.summaryLabel}>
                Amount Paid
              </p>
              <p style={styles.summaryValue}>
                {formatCurrency(amountPaid, currency)}
              </p>
            </div>
          </div>

          {renderLineItems(items, currency)}

          {renderTotals({
            subtotalAmount,
            taxAmount,
            discountAmount,
            amountPaid,
            currency,
          })}

          {billingAddress && (
            <div style={styles.section}>
              <h3 style={styles.sectionHeading}>Billing Address</h3>
              <p style={styles.address}>{billingAddress}</p>
            </div>
          )}

          {notes && (
            <div style={styles.section}>
              <h3 style={styles.sectionHeading}>Notes</h3>
              <p style={styles.sectionParagraph}>{notes}</p>
            </div>
          )}

          <div style={styles.notice}>
            <p style={styles.noticeParagraph}>
              If you have any questions about this payment, please contact
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} style={styles.noticeLink}>
                  {supportEmail}
                </a>
              ) : (
                ' our support team'
              )}
              .
            </p>
            <p style={styles.noticeThanks}>Thank you for choosing {businessName}.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceiptEmail;
