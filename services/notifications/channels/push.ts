import http2 from 'node:http2';
import { createSign } from 'node:crypto';

import type {
  ChannelResponse,
  NotificationEvent,
  NotificationRecipient,
  RenderedTemplate,
  SendNotificationRequest,
} from '../types';

export interface FcmConfig {
  serverKey?: string;
  defaultTitle?: string;
}

export interface ApnsConfig {
  keyId?: string;
  teamId?: string;
  privateKey?: string;
  bundleId?: string;
  topic?: string;
}

export interface PushProviderConfig {
  fcm?: FcmConfig;
  apns?: ApnsConfig;
}

interface FcmResponse {
  message_id?: string | number;
  success?: number;
  failure?: number;
  results?: Array<{ message_id?: string; error?: string }>;
}

export class PushNotificationProvider {
  constructor(private readonly config: PushProviderConfig) {}

  async send(
    rendered: RenderedTemplate,
    recipient: NotificationRecipient,
    request: SendNotificationRequest,
  ): Promise<ChannelResponse> {
    const platform =
      (request.providerOverrides?.platform as 'fcm' | 'apns' | undefined) ??
      (recipient.metadata?.platform as 'fcm' | 'apns' | undefined) ??
      'fcm';

    if (platform === 'apns') {
      return this.sendApns(rendered, recipient, request);
    }

    return this.sendFcm(rendered, recipient, request);
  }

  private async sendFcm(
    rendered: RenderedTemplate,
    recipient: NotificationRecipient,
    request: SendNotificationRequest,
  ): Promise<ChannelResponse> {
    const serverKey = this.config.fcm?.serverKey;

    if (!serverKey) {
      return {
        success: false,
        status: 'skipped',
        channel: 'push',
        recipient,
        timestamp: new Date(),
        provider: 'fcm',
        error: 'FCM server key is not configured.',
      } satisfies ChannelResponse;
    }

    const payload = {
      to: recipient.address,
      notification: {
        title: rendered.subject ?? this.config.fcm?.defaultTitle ?? 'Notification',
        body: rendered.text ?? rendered.html ?? '',
      },
      data: {
        ...request.context,
        templateId: request.templateId,
        category: request.category,
        correlationId: request.correlationId,
      },
    };

    try {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          status: 'failed',
          channel: 'push',
          recipient,
          timestamp: new Date(),
          provider: 'fcm',
          error: `FCM error: ${response.status} ${errorBody}`.slice(0, 500),
        } satisfies ChannelResponse;
      }

      const json = (await response.json()) as FcmResponse;
      const messageId = json.message_id ?? json.results?.[0]?.message_id;
      const status = json.failure && json.failure > 0 ? 'failed' : 'sent';

      return {
        success: !json.failure,
        status: status === 'sent' ? 'sent' : 'failed',
        channel: 'push',
        recipient,
        timestamp: new Date(),
        provider: 'fcm',
        messageId: messageId ? String(messageId) : undefined,
        error: json.results?.[0]?.error,
      } satisfies ChannelResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        status: 'failed',
        channel: 'push',
        recipient,
        timestamp: new Date(),
        provider: 'fcm',
        error: message,
      } satisfies ChannelResponse;
    }
  }

  private async sendApns(
    rendered: RenderedTemplate,
    recipient: NotificationRecipient,
    request: SendNotificationRequest,
  ): Promise<ChannelResponse> {
    const { apns } = this.config;

    if (!apns?.keyId || !apns.teamId || !apns.privateKey || !apns.bundleId) {
      return {
        success: false,
        status: 'skipped',
        channel: 'push',
        recipient,
        timestamp: new Date(),
        provider: 'apns',
        error: 'APNs credentials are not configured.',
      } satisfies ChannelResponse;
    }

    const jwt = this.createApnsJwt(apns);

    if (!jwt) {
      return {
        success: false,
        status: 'failed',
        channel: 'push',
        recipient,
        timestamp: new Date(),
        provider: 'apns',
        error: 'Failed to sign APNs token.',
      } satisfies ChannelResponse;
    }

    const body = JSON.stringify({
      aps: {
        alert: {
          title: rendered.subject ?? 'Notification',
          body: rendered.text ?? rendered.html ?? '',
        },
        sound: 'default',
      },
      data: {
        ...request.context,
        templateId: request.templateId,
        category: request.category,
        correlationId: request.correlationId,
      },
    });

    const client = http2.connect('https://api.push.apple.com');

    return await new Promise<ChannelResponse>((resolve) => {
      const requestHeaders = {
        ':method': 'POST',
        ':path': `/3/device/${recipient.address}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': apns.topic ?? apns.bundleId,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
      } as http2.ClientSessionRequestOptions['headers'];

      const req = client.request(requestHeaders);

      const chunks: Buffer[] = [];
      req.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      req.on('response', (headers) => {
        const status = Number(headers[':status'] ?? 0);

        req.on('end', () => {
          client.close();
          const bodyText = Buffer.concat(chunks).toString('utf8');
          if (status >= 200 && status < 300) {
            resolve({
              success: true,
              status: 'sent',
              channel: 'push',
              recipient,
              timestamp: new Date(),
              provider: 'apns',
              messageId: headers['apns-id'] ? String(headers['apns-id']) : undefined,
            });
          } else {
            resolve({
              success: false,
              status: 'failed',
              channel: 'push',
              recipient,
              timestamp: new Date(),
              provider: 'apns',
              error: `APNs error: ${status} ${bodyText}`.slice(0, 500),
            });
          }
        });
      });

      req.on('error', (error) => {
        client.close();
        resolve({
          success: false,
          status: 'failed',
          channel: 'push',
          recipient,
          timestamp: new Date(),
          provider: 'apns',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });

      req.end(body);
    });
  }

  static parseFcmWebhook(payload: unknown): NotificationEvent[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const events: NotificationEvent[] = [];
    const data = payload as { message?: { messageId?: string; token?: string; data?: Record<string, unknown> } };

    if (data.message?.messageId && data.message?.token) {
      events.push({
        type: 'delivered',
        channel: 'push',
        provider: 'fcm',
        recipient: data.message.token,
        timestamp: new Date(),
        messageId: data.message.messageId,
        data,
      });
    }

    return events;
  }

  private createApnsJwt(config: ApnsConfig) {
    try {
      const header = base64UrlEncode(
        Buffer.from(
          JSON.stringify({
            alg: 'ES256',
            kid: config.keyId,
          }),
        ),
      );
      const payload = base64UrlEncode(
        Buffer.from(
          JSON.stringify({
            iss: config.teamId,
            iat: Math.floor(Date.now() / 1000),
          }),
        ),
      );
      const unsignedToken = `${header}.${payload}`;

      const signer = createSign('sha256');
      signer.update(unsignedToken);
      signer.end();

      const signature = signer.sign({ key: config.privateKey as string, dsaEncoding: 'ieee-p1363' });
      const signatureEncoded = base64UrlEncode(signature);
      return `${unsignedToken}.${signatureEncoded}`;
    } catch (error) {
      console.error('Failed to create APNs JWT', error);
      return null;
    }
  }
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
