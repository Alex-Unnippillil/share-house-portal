import { CredentialVault } from './credential-vault';
import { ConnectorFactory, ConnectorContext, IntegrationConnector } from './connector-sdk';
import { ConsoleIntegrationLogger, IntegrationLogger, createScopedLogger } from './logger';
import { ConnectorJobResult, ConnectorRuntimeOptions, IntegrationJob } from './types';

interface QueuedJob {
  job: IntegrationJob;
  runtime?: ConnectorRuntimeOptions;
  enqueuedAt: Date;
  attempts: number;
}

export interface IntegrationJobRunnerOptions {
  vault?: CredentialVault;
  logger?: IntegrationLogger;
  defaultMaxAttempts?: number;
}

export class IntegrationJobRunner {
  private readonly vault: CredentialVault;

  private readonly logger: IntegrationLogger;

  private readonly defaultMaxAttempts: number;

  private readonly connectors = new Map<string, ConnectorFactory>();

  private readonly queue: QueuedJob[] = [];

  constructor(options: IntegrationJobRunnerOptions = {}) {
    this.vault = options.vault ?? new CredentialVault();
    this.logger = options.logger
      ? createScopedLogger('integration-job-runner', options.logger)
      : new ConsoleIntegrationLogger('integration-job-runner');
    this.defaultMaxAttempts = options.defaultMaxAttempts ?? 3;
  }

  registerConnector(factory: ConnectorFactory): void {
    if (this.connectors.has(factory.metadata.key)) {
      throw new Error(`Connector with key ${factory.metadata.key} is already registered`);
    }

    this.connectors.set(factory.metadata.key, factory);
    this.logger.info('Registered connector', factory.metadata);
  }

  getRegisteredConnectors(): ConnectorFactory[] {
    return [...this.connectors.values()];
  }

  enqueue(job: IntegrationJob, runtime?: ConnectorRuntimeOptions): void {
    const entry: QueuedJob = {
      job: { ...job, attempts: job.attempts ?? 0 },
      runtime,
      enqueuedAt: new Date(),
      attempts: job.attempts ?? 0,
    };

    this.queue.push(entry);
    this.logger.debug('Job enqueued', {
      jobId: job.id,
      connectorKey: job.connectorKey,
      operation: job.operation,
      attempts: entry.attempts,
    });
  }

  async runNext(): Promise<ConnectorJobResult | null> {
    const next = this.queue.shift();

    if (!next) {
      return null;
    }

    return this.execute(next);
  }

  async drain(): Promise<void> {
    while (this.queue.length > 0) {
      await this.runNext();
    }
  }

  async run(job: IntegrationJob, runtime?: ConnectorRuntimeOptions): Promise<ConnectorJobResult> {
    const queued: QueuedJob = {
      job: { ...job, attempts: job.attempts ?? 0 },
      runtime,
      enqueuedAt: new Date(),
      attempts: job.attempts ?? 0,
    };

    return this.execute(queued);
  }

  private async execute(queued: QueuedJob): Promise<ConnectorJobResult> {
    const { job } = queued;
    const runtime = queued.runtime;
    const connector = await this.instantiateConnector(job.connectorKey, runtime);

    queued.attempts += 1;
    job.attempts = queued.attempts;

    try {
      await connector.validateConfig(job.config ?? {});
      this.logger.info('Executing job', {
        jobId: job.id,
        connectorKey: job.connectorKey,
        operation: job.operation,
        attempt: queued.attempts,
      });

      const result = await connector.run(job, runtime);
      this.logger.info('Job completed', {
        jobId: job.id,
        connectorKey: job.connectorKey,
        operation: job.operation,
        attempt: queued.attempts,
        success: result.success,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Job execution failed', {
        jobId: job.id,
        connectorKey: job.connectorKey,
        operation: job.operation,
        attempt: queued.attempts,
        error: errorMessage,
      });

      const maxAttempts = runtime?.maxAttempts ?? this.defaultMaxAttempts;

      if (queued.attempts < maxAttempts && !runtime?.signal?.aborted) {
        this.logger.warn('Re-enqueuing job after failure', {
          jobId: job.id,
          connectorKey: job.connectorKey,
          attempt: queued.attempts,
          maxAttempts,
        });

        this.queue.push(queued);
      }

      throw error;
    }
  }

  private async instantiateConnector(
    connectorKey: string,
    runtime?: ConnectorRuntimeOptions,
  ): Promise<IntegrationConnector> {
    const factory = this.connectors.get(connectorKey);

    if (!factory) {
      throw new Error(`Connector ${connectorKey} has not been registered`);
    }

    if (runtime?.signal?.aborted) {
      throw new Error(`Job cancelled before connector ${connectorKey} could start`);
    }

    const context: ConnectorContext = {
      vault: this.vault,
      logger: this.logger,
      environment: process.env.NODE_ENV ?? 'development',
      emitMetric: (name, value, tags) => {
        this.logger.debug('Metric emitted', {
          name,
          value,
          ...tags,
        });
      },
    };

    const connector = factory.create(context);
    await connector.initialize();

    return connector;
  }
}
