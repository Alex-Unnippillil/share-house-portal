import { ConnectorContext, ConnectorFactory, IntegrationConnector } from '../connector-sdk';
import { ConnectorJobResult, IntegrationJob } from '../types';

const metadata = {
  key: 'voice.assistant-bridge',
  displayName: 'Voice Assistant Bridge (Placeholder)',
  category: 'voice',
  description: 'Placeholder connector for voice assistant integrations (e.g., Alexa, Google Assistant).',
  capabilities: ['voice:intents', 'voice:routines'],
  configGuide: 'Map intents to building actions and configure account linking.',
} as const;

export class VoiceAssistantConnectorPlaceholder extends IntegrationConnector {
  constructor(context: ConnectorContext) {
    super(context, metadata);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateConfig(config: Record<string, unknown>): void {
    // Placeholder connectors do not enforce schema yet.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(job: IntegrationJob): Promise<ConnectorJobResult> {
    this.logger.warn('Voice assistant connector placeholder invoked', {
      operation: job.operation,
    });

    return {
      success: false,
      notes: 'Voice assistant connector placeholder. Provide skill handlers before scheduling jobs.',
    };
  }
}

export const voiceAssistantConnectorPlaceholderFactory: ConnectorFactory = {
  metadata,
  create: (context: ConnectorContext) => new VoiceAssistantConnectorPlaceholder(context),
};
