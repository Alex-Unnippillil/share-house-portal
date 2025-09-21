import { TemplateEngine } from './template-engine';
import { PreferenceCenter } from './preference-center';
import { MetricsStore } from './metrics-store';
import type {
  ChannelResponse,
  NotificationEvent,
  NotificationSendSummary,
  SendNotificationRequest,
} from './types';
import type { SendGridEmailProvider } from './channels/email';
import type { TwilioProvider } from './channels/sms';
import type { PushNotificationProvider } from './channels/push';
import type { NotificationServiceConfig } from './types';

export interface NotificationServiceDependencies {
  templateEngine: TemplateEngine;
  preferenceCenter: PreferenceCenter;
  metrics: MetricsStore;
  emailProvider: SendGridEmailProvider;
  smsProvider: TwilioProvider;
  voiceProvider: TwilioProvider;
  pushProvider: PushNotificationProvider;
  config?: NotificationServiceConfig;
}

export class NotificationService {
  constructor(private readonly dependencies: NotificationServiceDependencies) {}

  get templateEngine() {
    return this.dependencies.templateEngine;
  }

  get preferenceCenter() {
    return this.dependencies.preferenceCenter;
  }

  get metrics() {
    return this.dependencies.metrics;
  }

  async send(request: SendNotificationRequest): Promise<NotificationSendSummary> {
    if (!request.recipients.length) {
      throw new Error('Notification must target at least one recipient.');
    }

    const rendered = this.dependencies.templateEngine.render(
      request.channel,
      request.templateId,
      request.context,
    );

    const { allowed, suppressed } = this.dependencies.preferenceCenter.resolveRecipients(
      request.channel,
      request.recipients,
      request.category,
    );

    const responses: ChannelResponse[] = [];

    for (const recipient of allowed) {
      const response = await this.dispatchToChannel(request, rendered, recipient);
      responses.push(response);
      this.dependencies.metrics.recordSend(response);
      if (request.options?.responseHook) {
        await request.options.responseHook(response);
      }
    }

    suppressed.forEach((recipient) => {
      const response: ChannelResponse = {
        success: false,
        status: 'skipped',
        channel: request.channel,
        recipient,
        timestamp: new Date(),
        provider: this.providerNameForChannel(request.channel),
        error: 'Suppressed by user preferences.',
      };
      responses.push(response);
      this.dependencies.metrics.recordSend(response);
    });

    const summary: NotificationSendSummary = {
      templateId: request.templateId,
      channel: request.channel,
      category: request.category,
      correlationId: request.correlationId,
      responses,
      sent: responses.filter((response) => response.status === 'sent' || response.status === 'queued').length,
      skipped: responses.filter((response) => response.status === 'skipped').length,
      failed: responses.filter((response) => response.status === 'failed').length,
      timestamp: new Date(),
    };

    return summary;
  }

  recordEvents(events: NotificationEvent[]) {
    events.forEach((event) => this.dependencies.metrics.recordEvent(event));
  }

  private async dispatchToChannel(
    request: SendNotificationRequest,
    rendered: ReturnType<TemplateEngine['render']>,
    recipient: SendNotificationRequest['recipients'][number],
  ) {
    if (request.options?.dryRun || this.dependencies.config?.dryRun) {
      return {
        success: true,
        status: 'queued',
        channel: request.channel,
        recipient,
        timestamp: new Date(),
        provider: this.providerNameForChannel(request.channel),
        meta: { dryRun: true },
      } satisfies ChannelResponse;
    }

    switch (request.channel) {
      case 'email':
        return this.dependencies.emailProvider.send(rendered, recipient, request);
      case 'sms':
        return this.dependencies.smsProvider.sendSms(rendered, recipient, request);
      case 'voice':
        return this.dependencies.voiceProvider.sendVoice(rendered, recipient, request);
      case 'push':
        return this.dependencies.pushProvider.send(rendered, recipient, request);
      default:
        throw new Error(`Unsupported channel: ${request.channel}`);
    }
  }

  private providerNameForChannel(channel: SendNotificationRequest['channel']) {
    switch (channel) {
      case 'email':
        return 'sendgrid';
      case 'sms':
      case 'voice':
        return 'twilio';
      case 'push':
        return 'push';
    }
  }
}
