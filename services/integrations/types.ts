export type IntegrationJobPayload = Record<string, unknown>;

export interface IntegrationJob {
  id: string;
  connectorKey: string;
  operation: string;
  payload?: IntegrationJobPayload;
  credentialsId: string;
  config?: Record<string, unknown>;
  attempts?: number;
  scheduledFor?: Date;
  requestedBy?: string;
}

export interface ConnectorJobResult {
  success: boolean;
  data?: unknown;
  metrics?: Record<string, number>;
  notes?: string;
  nextRunAt?: Date;
}

export interface ConnectorJobError {
  message: string;
  recoverable: boolean;
  details?: unknown;
}

export interface ConnectorRuntimeOptions {
  signal?: AbortSignal;
  dryRun?: boolean;
  maxAttempts?: number;
}
