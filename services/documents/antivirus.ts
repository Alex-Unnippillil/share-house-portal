import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

export interface AntivirusScanResult {
  status: 'queued' | 'clean' | 'infected' | 'pending';
  scanId?: string;
  details?: Record<string, unknown>;
  completedAt?: Date;
}

export interface AntivirusScanner {
  triggerScan(
    bucket: string,
    key: string,
    context?: Record<string, unknown>,
  ): Promise<AntivirusScanResult>;
}

export class LambdaAntivirusScanner implements AntivirusScanner {
  constructor(
    private readonly client: LambdaClient,
    private readonly functionName: string,
  ) {}

  async triggerScan(
    bucket: string,
    key: string,
    context?: Record<string, unknown>,
  ): Promise<AntivirusScanResult> {
    const payload = JSON.stringify({ bucket, key, context });
    const command = new InvokeCommand({
      FunctionName: this.functionName,
      InvocationType: 'RequestResponse',
      Payload: new TextEncoder().encode(payload),
    });

    const response = await this.client.send(command);
    if (!response.Payload) {
      return { status: 'queued' };
    }

    try {
      const decoded = new TextDecoder().decode(response.Payload);
      const data = JSON.parse(decoded);
      return {
        status: (data.status as AntivirusScanResult['status']) ?? 'queued',
        scanId: data.scanId,
        details: data.details,
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      };
    } catch (error) {
      console.warn('Failed to parse Lambda antivirus response', error);
      return { status: 'queued' };
    }
  }
}

export class SidecarAntivirusScanner implements AntivirusScanner {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  async triggerScan(
    bucket: string,
    key: string,
    context?: Record<string, unknown>,
  ): Promise<AntivirusScanResult> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ bucket, key, context }),
    });

    if (!response.ok) {
      throw new Error(
        `Antivirus sidecar returned ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return {
      status: (data.status as AntivirusScanResult['status']) ?? 'queued',
      scanId: data.scanId,
      details: data.details,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    };
  }
}
