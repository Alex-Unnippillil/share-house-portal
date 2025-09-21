import { CredentialVault } from './credential-vault';
import { ConsoleIntegrationLogger, IntegrationLogger, createScopedLogger } from './logger';
import { ConnectorJobResult, ConnectorRuntimeOptions, IntegrationJob } from './types';

export interface ConnectorMetadata {
  key: string;
  displayName: string;
  category: 'accounting' | 'access-control' | 'logistics' | 'iot' | 'voice' | string;
  description: string;
  capabilities: string[];
  configGuide?: string;
  docsUrl?: string;
  labels?: Record<string, string>;
}

export interface ConnectorContext {
  vault: CredentialVault;
  logger?: IntegrationLogger;
  environment?: string;
  emitMetric?: (name: string, value: number, tags?: Record<string, string>) => void;
}

export interface ConnectorFactory {
  metadata: ConnectorMetadata;
  create: (context: ConnectorContext) => IntegrationConnector;
}

export abstract class IntegrationConnector {
  protected readonly logger: IntegrationLogger;

  protected constructor(
    protected readonly context: ConnectorContext,
    public readonly metadata: ConnectorMetadata,
  ) {
    const baseLogger = context.logger ?? new ConsoleIntegrationLogger(`connector:${metadata.key}`);
    this.logger = createScopedLogger(`connector:${metadata.key}`, baseLogger);
  }

  async initialize(): Promise<void> {
    // Optional hook for connectors to run setup logic when the instance is created.
  }

  abstract validateConfig(config: Record<string, unknown>): Promise<void> | void;

  abstract run(job: IntegrationJob, runtime?: ConnectorRuntimeOptions): Promise<ConnectorJobResult>;

  protected async readCredentials<T extends Record<string, unknown>>(credentialId: string): Promise<T> {
    const stored = await this.context.vault.getCredentials<T>(this.metadata.key, credentialId);
    return stored.payload;
  }

  protected async ensureCredentialPresence(credentialId: string): Promise<void> {
    if (!this.context.vault.hasCredentials(this.metadata.key, credentialId)) {
      throw new Error(`Expected credentials ${credentialId} for connector ${this.metadata.key} to be present`);
    }
  }

  protected emitMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!this.context.emitMetric) {
      return;
    }

    this.context.emitMetric(name, value, { connector: this.metadata.key, ...tags });
  }

  protected assertPayloadShape(payload: Record<string, unknown> | undefined, fields: string[]): void {
    if (!payload) {
      throw new Error('Payload is required for this operation');
    }

    const missing = fields.filter((field) => !(field in payload));

    if (missing.length > 0) {
      throw new Error(`Missing required payload fields: ${missing.join(', ')}`);
    }
  }

  protected abortIfRequested(runtime?: ConnectorRuntimeOptions): void {
    if (!runtime?.signal) {
      return;
    }

    if (runtime.signal.aborted) {
      throw new Error('Job execution aborted by caller');
    }
  }
}
