import type {
  ChannelResponse,
  NotificationEvent,
  NotificationRecipient,
  RenderedTemplate,
  SendNotificationRequest,
} from '../types';

export interface TwilioConfig {
  accountSid?: string;
  authToken?: string;
  messagingServiceSid?: string;
  fromNumber?: string;
  voiceFromNumber?: string;
  statusCallbackUrl?: string;
}

interface TwilioWebhookPayload {
  MessageStatus?: string;
  SmsStatus?: string;
  CallStatus?: string;
  MessageSid?: string;
  CallSid?: string;
  To?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  EventType?: string;
}

export class TwilioProvider {
  constructor(private readonly config: TwilioConfig) {}

  private get baseUrl() {
    if (!this.config.accountSid) {
      return '';
    }
    return `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}`;
  }

  private get authHeader() {
    if (!this.config.accountSid || !this.config.authToken) {
      return undefined;
    }
    const token = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');
    return `Basic ${token}`;
  }

  async sendSms(
    rendered: RenderedTemplate,
    recipient: NotificationRecipient,
    request: SendNotificationRequest,
  ): Promise<ChannelResponse> {
    if (!this.authHeader || !this.baseUrl) {
      return {
        success: false,
        status: 'skipped',
        channel: 'sms',
        recipient,
        timestamp: new Date(),
        provider: 'twilio',
        error: 'Twilio credentials are not configured.',
      } satisfies ChannelResponse;
    }

    const body = new URLSearchParams({
      To: recipient.address,
      Body: rendered.text ?? rendered.html ?? '',
    });

    if (this.config.messagingServiceSid) {
      body.append('MessagingServiceSid', this.config.messagingServiceSid);
    } else if (this.config.fromNumber) {
      body.append('From', this.config.fromNumber);
    }

    if (this.config.statusCallbackUrl) {
      body.append('StatusCallback', this.config.statusCallbackUrl);
    }

    try {
      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          status: 'failed',
          channel: 'sms',
          recipient,
          timestamp: new Date(),
          provider: 'twilio',
          error: `Twilio error: ${response.status} ${errorBody}`.slice(0, 500),
        } satisfies ChannelResponse;
      }

      const json = (await response.json()) as { sid?: string };

      return {
        success: true,
        status: 'queued',
        channel: 'sms',
        recipient,
        timestamp: new Date(),
        provider: 'twilio',
        messageId: json.sid,
      } satisfies ChannelResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        status: 'failed',
        channel: 'sms',
        recipient,
        timestamp: new Date(),
        provider: 'twilio',
        error: message,
      } satisfies ChannelResponse;
    }
  }

  async sendVoice(
    rendered: RenderedTemplate,
    recipient: NotificationRecipient,
    request: SendNotificationRequest,
  ): Promise<ChannelResponse> {
    if (!this.authHeader || !this.baseUrl) {
      return {
        success: false,
        status: 'skipped',
        channel: 'voice',
        recipient,
        timestamp: new Date(),
        provider: 'twilio',
        error: 'Twilio credentials are not configured.',
      } satisfies ChannelResponse;
    }

    const voiceMessage = request.providerOverrides?.twiml as string | undefined;
    const body = new URLSearchParams({
      To: recipient.address,
      Twiml:
        voiceMessage ??
        `<Response><Say>${rendered.text ?? rendered.html ?? ''}</Say></Response>`,
    });

    if (this.config.voiceFromNumber) {
      body.append('From', this.config.voiceFromNumber);
    } else if (this.config.fromNumber) {
      body.append('From', this.config.fromNumber);
    }

    if (this.config.statusCallbackUrl) {
      body.append('StatusCallback', this.config.statusCallbackUrl);
    }

    try {
      const response = await fetch(`${this.baseUrl}/Calls.json`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          status: 'failed',
          channel: 'voice',
          recipient,
          timestamp: new Date(),
          provider: 'twilio',
          error: `Twilio error: ${response.status} ${errorBody}`.slice(0, 500),
        } satisfies ChannelResponse;
      }

      const json = (await response.json()) as { sid?: string };

      return {
        success: true,
        status: 'queued',
        channel: 'voice',
        recipient,
        timestamp: new Date(),
        provider: 'twilio',
        messageId: json.sid,
      } satisfies ChannelResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        status: 'failed',
        channel: 'voice',
        recipient,
        timestamp: new Date(),
        provider: 'twilio',
        error: message,
      } satisfies ChannelResponse;
    }
  }

  static parseWebhook(payload: unknown, channel: 'sms' | 'voice' = 'sms'): NotificationEvent[] {
    if (!payload) {
      return [];
    }

    const data: TwilioWebhookPayload =
      typeof payload === 'string'
        ? Object.fromEntries(new URLSearchParams(payload))
        : (payload as TwilioWebhookPayload);

    const status = data.MessageStatus || data.SmsStatus || data.CallStatus;
    const sid = data.MessageSid || data.CallSid;
    const recipient = data.To ?? '';

    if (!status) {
      return [];
    }

    const normalizedStatus = status.toLowerCase();
    const timestamp = new Date();

    switch (normalizedStatus) {
      case 'delivered':
      case 'completed':
        return [
          {
            type: 'delivered',
            channel,
            provider: 'twilio',
            recipient,
            timestamp,
            messageId: sid,
            data,
          },
        ];
      case 'queued':
      case 'sending':
        return [
          {
            type: 'queued',
            channel,
            provider: 'twilio',
            recipient,
            timestamp,
            messageId: sid,
            data,
          },
        ];
      case 'failed':
      case 'undelivered':
      case 'busy':
      case 'no-answer':
        return [
          {
            type: 'failed',
            channel,
            provider: 'twilio',
            recipient,
            timestamp,
            messageId: sid,
            reason: data.ErrorMessage ?? data.ErrorCode,
            data,
          },
        ];
      default:
        return [];
    }
  }
}
