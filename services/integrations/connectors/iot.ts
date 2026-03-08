import { ConnectorContext, ConnectorFactory, IntegrationConnector } from '../connector-sdk';
import { ConnectorJobResult, IntegrationJob } from '../types';

const metadata = {
  key: 'iot.device-hub',
  displayName: 'IoT Device Hub (Placeholder)',
  category: 'iot',
  description: 'Placeholder connector for future smart device integrations.',
  capabilities: ['devices:control', 'devices:telemetry'],
  configGuide: 'Define device namespaces, command mappings, and telemetry handlers.',
} as const;

export class IotConnectorPlaceholder extends IntegrationConnector {
  constructor(context: ConnectorContext) {
    super(context, metadata);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateConfig(config: Record<string, unknown>): void {
    // Placeholder connectors do not enforce schema yet.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(job: IntegrationJob): Promise<ConnectorJobResult> {
    this.logger.warn('IoT connector placeholder invoked', {
      operation: job.operation,
    });

    return {
      success: false,
      notes: 'IoT connector placeholder. Implement device-specific logic before enabling jobs.',
    };
  }
}

export const iotConnectorPlaceholderFactory: ConnectorFactory = {
  metadata,
  create: (context: ConnectorContext) => new IotConnectorPlaceholder(context),
};
