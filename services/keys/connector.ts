import { KeyServiceError } from './errors';
import type {
  KeyCabinetAlert,
  KeyCabinetAlertStreamOptions,
  KeyCabinetConnector,
  KeyCabinetInventorySnapshot,
  KeyCabinetKeyState,
  KeyCheckoutRecord,
  KeyPolicySeverity,
} from './types';

export interface OnPremKeyCabinetConnectorConfig {
  baseUrl: string;
  apiKey: string;
  cabinetId: string;
  id?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
  defaultAlertPollIntervalMs?: number;
}

type FetchLike = typeof fetch;

interface InventoryResponse {
  capturedAt: string;
  keys: Array<
    Omit<KeyCabinetKeyState, 'lastUpdatedAt'> & {
      lastUpdatedAt?: string;
    }
  >;
}

interface AlertResponse {
  keyId: string;
  slotId: string;
  event: string;
  occurredAt: string;
  severity: KeyPolicySeverity;
  details?: Record<string, unknown>;
  cursor?: string;
}

interface CheckoutPayload {
  transactionId: string;
  keyId: string;
  userId: string;
  dueAt: string;
  metadata?: Record<string, unknown>;
}

interface ReturnPayload {
  transactionId: string;
  keyId: string;
  userId: string;
  returnedAt: string;
  metadata?: Record<string, unknown>;
}

export class OnPremKeyCabinetConnector implements KeyCabinetConnector {
  readonly id: string;

  private readonly baseUrl: string;

  private readonly apiKey: string;

  private readonly fetchImpl: FetchLike;

  private readonly cabinetId: string;

  private readonly timeoutMs: number;

  private readonly defaultAlertPollIntervalMs: number;

  constructor(config: OnPremKeyCabinetConnectorConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.cabinetId = config.cabinetId;
    this.timeoutMs = config.timeoutMs ?? 10000;
    this.defaultAlertPollIntervalMs = config.defaultAlertPollIntervalMs ?? 15000;
    this.id = config.id ?? config.cabinetId;

    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new KeyServiceError('CONFIGURATION_ERROR', 'Fetch API is not available for key cabinet connector');
    }
    this.fetchImpl = fetchImpl;
  }

  async syncInventory(): Promise<KeyCabinetInventorySnapshot> {
    const response = await this.request<InventoryResponse>(`/cabinets/${this.cabinetId}/inventory`, {
      method: 'GET',
    });

    return {
      cabinetId: this.cabinetId,
      capturedAt: new Date(response.capturedAt),
      keys: response.keys.map((key) => ({
        ...key,
        lastUpdatedAt: key.lastUpdatedAt ? new Date(key.lastUpdatedAt) : undefined,
      })),
    };
  }

  async dispatchCheckout(record: KeyCheckoutRecord): Promise<void> {
    const payload: CheckoutPayload = {
      transactionId: record.id,
      keyId: record.keyId,
      userId: record.userId,
      dueAt: record.dueAt.toISOString(),
      metadata: record.metadata,
    };

    await this.request(`/cabinets/${this.cabinetId}/transactions/checkout`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async dispatchReturn(record: KeyCheckoutRecord): Promise<void> {
    const payload: ReturnPayload = {
      transactionId: record.id,
      keyId: record.keyId,
      userId: record.userId,
      returnedAt: (record.returnedAt ?? new Date()).toISOString(),
      metadata: record.metadata,
    };

    await this.request(`/cabinets/${this.cabinetId}/transactions/return`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async *streamAlerts(options: KeyCabinetAlertStreamOptions = {}): AsyncIterable<KeyCabinetAlert> {
    const pollInterval = options.pollIntervalMs ?? this.defaultAlertPollIntervalMs;
    let cursor = options.since?.toISOString();

    while (!options.signal?.aborted) {
      let alerts: AlertResponse[] | undefined;
      try {
        alerts = await this.request<AlertResponse[]>(
          `/cabinets/${this.cabinetId}/alerts${cursor ? `?since=${encodeURIComponent(cursor)}` : ''}`,
          {
            method: 'GET',
            signal: options.signal,
          },
        );
      } catch (error) {
        if (options.signal?.aborted) {
          break;
        }
        throw error;
      }

      for (const alert of alerts ?? []) {
        cursor = alert.cursor ?? alert.occurredAt;
        yield {
          cabinetId: this.cabinetId,
          keyId: alert.keyId,
          slotId: alert.slotId,
          event: normalizeAlertEvent(alert.event),
          occurredAt: new Date(alert.occurredAt),
          severity: alert.severity,
          details: alert.details,
        };
      }

      if (options.signal?.aborted) {
        break;
      }

      try {
        await delay(pollInterval, options.signal);
      } catch (error) {
        if (options.signal?.aborted) {
          break;
        }
        throw error;
      }
    }
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${this.apiKey}`);
    if (!headers.has('content-type') && init.body) {
      headers.set('content-type', 'application/json');
    }

    const controller = init.signal ? undefined : new AbortController();
    const timeoutHandle = controller
      ? setTimeout(() => controller.abort(), this.timeoutMs)
      : undefined;
    const signal = init.signal ?? controller?.signal;

    try {
      const response = await this.fetchImpl(url, {
        ...init,
        headers,
        signal,
      });

      if (!response.ok) {
        const body = await safeReadJson(response);
        throw new KeyServiceError('CONNECTOR_ERROR', 'Key cabinet responded with an error', {
          details: {
            status: response.status,
            path,
            body,
          },
        });
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const text = await response.text();
      const trimmed = text.trim();
      return trimmed ? (JSON.parse(trimmed) as T) : (undefined as T);
    } catch (error) {
      if (signal?.aborted) {
        throw new KeyServiceError('CONNECTOR_ERROR', 'Key cabinet request aborted', {
          cause: error,
          details: { path },
        });
      }

      throw KeyServiceError.from(error, 'CONNECTOR_ERROR', 'Failed to communicate with key cabinet', {
        path,
      });
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}

const safeReadJson = async (response: Response): Promise<unknown> => {
  try {
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
  } catch (error) {
    return { parseError: error instanceof Error ? error.message : 'unknown error' };
  }
};

const normalizeAlertEvent = (event: string): KeyCabinetAlert['event'] => {
  switch (event) {
    case 'door_opened':
    case 'door_forced':
    case 'power_loss':
    case 'tamper':
      return event;
    default:
      return 'unknown';
  }
};

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const onAbort = () => {
      clearTimeout(handle);
      reject(createAbortError());
    };

    const handle = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });

const createAbortError = (): Error => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};
