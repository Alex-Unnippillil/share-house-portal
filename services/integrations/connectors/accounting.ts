import { ConnectorContext, ConnectorFactory, IntegrationConnector } from '../connector-sdk';
import { ConnectorJobResult, ConnectorRuntimeOptions, IntegrationJob } from '../types';

interface AccountingCredentials {
  apiKey: string;
  apiSecret: string;
  accountId: string;
  baseUrl?: string;
}

interface SyncChartPayload {
  since?: string;
}

interface InvoicePayload {
  invoiceId: string;
  amount: number;
  currency: string;
  customerId: string;
  issuedAt: string;
}

interface TransactionPayload {
  since?: string;
  until?: string;
}

const metadata = {
  key: 'accounting.general-ledger',
  displayName: 'General Ledger Accounting',
  category: 'accounting',
  description: 'Synchronises general ledger data such as accounts, invoices, and transactions.',
  capabilities: ['chart-of-accounts:read', 'invoices:write', 'transactions:read'],
  docsUrl: 'https://example.com/connectors/accounting',
} as const;

export class AccountingConnector extends IntegrationConnector {
  constructor(context: ConnectorContext) {
    super(context, metadata);
  }

  async validateConfig(config: Record<string, unknown>): Promise<void> {
    if (config.timezone && typeof config.timezone !== 'string') {
      throw new Error('`timezone` must be a string when provided.');
    }
  }

  async run(job: IntegrationJob, runtime?: ConnectorRuntimeOptions): Promise<ConnectorJobResult> {
    this.abortIfRequested(runtime);

    const credentials = await this.readCredentials<AccountingCredentials>(job.credentialsId);

    switch (job.operation) {
      case 'syncChartOfAccounts': {
        const payload = job.payload as SyncChartPayload | undefined;
        return this.syncChartOfAccounts(credentials, payload);
      }
      case 'submitInvoice': {
        const payload = job.payload as InvoicePayload | undefined;
        return this.submitInvoice(credentials, payload);
      }
      case 'fetchTransactions': {
        const payload = job.payload as TransactionPayload | undefined;
        return this.fetchTransactions(credentials, payload);
      }
      default:
        throw new Error(`Unsupported accounting operation ${job.operation}`);
    }
  }

  private async syncChartOfAccounts(
    credentials: AccountingCredentials,
    payload?: SyncChartPayload,
  ): Promise<ConnectorJobResult> {
    this.logger.info('Syncing chart of accounts', {
      accountId: credentials.accountId,
      since: payload?.since ?? 'beginning',
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const accounts = [
      { id: '1000', name: 'Cash and Cash Equivalents', type: 'asset' },
      { id: '2000', name: 'Accounts Payable', type: 'liability' },
      { id: '4000', name: 'Revenue', type: 'income' },
    ];

    this.emitMetric('chart_of_accounts_synced', accounts.length, {
      scope: payload?.since ? 'incremental' : 'full',
    });

    return {
      success: true,
      data: { accounts, syncedAt: new Date().toISOString() },
      notes: 'Fetched chart of accounts from accounting platform.',
    };
  }

  private async submitInvoice(
    credentials: AccountingCredentials,
    payload?: InvoicePayload,
  ): Promise<ConnectorJobResult> {
    this.assertPayloadShape(payload, ['invoiceId', 'amount', 'currency', 'customerId', 'issuedAt']);

    this.logger.info('Submitting invoice', {
      invoiceId: payload.invoiceId,
      customerId: payload.customerId,
      amount: payload.amount,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    this.emitMetric('invoices_submitted', 1, {
      currency: payload.currency,
    });

    return {
      success: true,
      data: {
        externalInvoiceId: `acct-${payload.invoiceId}`,
        status: 'accepted',
        processedAt: new Date().toISOString(),
      },
      notes: 'Invoice forwarded to accounting system.',
    };
  }

  private async fetchTransactions(
    credentials: AccountingCredentials,
    payload?: TransactionPayload,
  ): Promise<ConnectorJobResult> {
    this.logger.info('Fetching transactions', {
      accountId: credentials.accountId,
      since: payload?.since ?? 'beginning',
      until: payload?.until ?? 'now',
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const transactions = [
      { id: 'txn-1', amount: 12500, currency: 'USD', postedAt: '2024-05-01' },
      { id: 'txn-2', amount: -7300, currency: 'USD', postedAt: '2024-05-06' },
    ];

    this.emitMetric('transactions_fetched', transactions.length, {
      range: payload?.since ? 'incremental' : 'full',
    });

    return {
      success: true,
      data: {
        transactions,
        nextCursor: 'cursor-123',
      },
    };
  }
}

export const accountingConnectorFactory: ConnectorFactory = {
  metadata,
  create: (context) => new AccountingConnector(context),
};
