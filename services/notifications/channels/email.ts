import type {
  ChannelResponse,
  DeliveryEvent,
  NotificationEvent,
  NotificationRecipient,
  RenderedTemplate,
  SendNotificationRequest,
} from '../types';

export interface SendGridConfig {
  apiKey?: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string;
}

interface SendGridPayload {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
    dynamic_template_data?: Record<string, unknown>;
    custom_args?: Record<string, unknown>;
  }>;
  from: { email: string; name?: string };
  reply_to?: { email: string; name?: string };
  subject?: string;
  content?: Array<{ type: string; value: string }>;
  categories?: string[];
  tracking_settings?: {
    click_tracking?: { enable: boolean };
    open_tracking?: { enable: boolean };
  };
}

interface SendGridWebhookEvent {
  email: string;
  event: string;
  timestamp: number;
  sg_message_id?: string;
  category?: string | string[];
  reason?: string;
  type?: string;
}

export class SendGridEmailProvider {
  private readonly endpoint = 'https://api.sendgrid.com/v3/mail/send';

  constructor(private readonly config: SendGridConfig) {}

  async send(
    rendered: RenderedTemplate,
    recipient: NotificationRecipient,
    request: SendNotificationRequest,
  ): Promise<ChannelResponse> {
    if (!this.config.apiKey) {
      return {
        success: false,
        status: 'skipped',
        channel: 'email',
        recipient,
        timestamp: new Date(),
        error: 'SendGrid API key is not configured.',
        provider: 'sendgrid',
      } satisfies ChannelResponse;
    }

    const payload = this.buildPayload(rendered, recipient, request);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          status: 'failed',
          channel: 'email',
          recipient,
          timestamp: new Date(),
          provider: 'sendgrid',
          error: `SendGrid error: ${response.status} ${errorBody}`.slice(0, 500),
        } satisfies ChannelResponse;
      }

      const messageId = response.headers.get('x-message-id') ?? undefined;

      return {
        success: true,
        status: 'sent',
        channel: 'email',
        recipient,
        timestamp: new Date(),
        provider: 'sendgrid',
        messageId,
      } satisfies ChannelResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        status: 'failed',
        channel: 'email',
        recipient,
        timestamp: new Date(),
        provider: 'sendgrid',
        error: message,
      } satisfies ChannelResponse;
    }
  }

  private buildPayload(
    rendered: RenderedTemplate,
    recipient: NotificationRecipient,
    request: SendNotificationRequest,
  ): SendGridPayload {
    const content: SendGridPayload['content'] = [];

    if (rendered.text) {
      content.push({ type: 'text/plain', value: rendered.text });
    }

    if (rendered.html) {
      content.push({ type: 'text/html', value: rendered.html });
    }

    if (content.length === 0) {
      content.push({ type: 'text/plain', value: '' });
    }

    return {
      personalizations: [
        {
          to: [
            {
              email: recipient.address,
              name: recipient.name,
            },
          ],
          dynamic_template_data: request.context,
          custom_args: {
            correlationId: request.correlationId,
            templateId: request.templateId,
            userId: recipient.userId,
            category: request.category,
          },
        },
      ],
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName,
      },
      reply_to: this.config.replyTo ? { email: this.config.replyTo } : undefined,
      subject: rendered.subject,
      content,
      categories: request.category ? [request.category] : undefined,
      tracking_settings: {
        click_tracking: { enable: request.options?.trackClicks ?? true },
        open_tracking: { enable: request.options?.trackOpens ?? true },
      },
    } satisfies SendGridPayload;
  }

  static parseWebhook(payload: unknown): NotificationEvent[] {
    if (!Array.isArray(payload)) {
      return [];
    }

    const events: NotificationEvent[] = [];

    (payload as SendGridWebhookEvent[]).forEach((event) => {
      const timestamp = event.timestamp ? new Date(event.timestamp * 1000) : new Date();
      const category = Array.isArray(event.category)
        ? event.category[0]
        : event.category;

      switch (event.event) {
        case 'delivered':
        case 'processed':
        case 'deferred':
        case 'open':
        case 'click': {
          const mapped: DeliveryEvent = {
            type:
              event.event === 'open'
                ? 'opened'
                : event.event === 'click'
                  ? 'clicked'
                  : event.event === 'processed'
                    ? 'queued'
                    : event.event === 'deferred'
                      ? 'sent'
                      : 'delivered',
            channel: 'email',
            provider: 'sendgrid',
            recipient: event.email,
            timestamp,
            messageId: event.sg_message_id,
            category: category ?? undefined,
            data: { raw: event },
          };
          events.push(mapped);
          break;
        }
        case 'bounce':
        case 'dropped':
        case 'spamreport': {
          events.push({
            type: event.event === 'spamreport' ? 'complained' : event.event === 'dropped' ? 'failed' : 'bounced',
            channel: 'email',
            provider: 'sendgrid',
            recipient: event.email,
            timestamp,
            messageId: event.sg_message_id,
            category: category ?? undefined,
            reason: event.reason,
            data: { raw: event },
          });
          break;
        }
        default: {
          break;
        }
      }
    });

    return events;
  }
}
