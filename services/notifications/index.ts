import { TemplateEngine } from './template-engine';
import { PreferenceCenter } from './preference-center';
import { MetricsStore } from './metrics-store';
import { SendGridEmailProvider } from './channels/email';
import { TwilioProvider } from './channels/sms';
import { PushNotificationProvider } from './channels/push';
import { NotificationService } from './notification-service';
import { NotificationEventConsumer } from './event-consumer';
import { notificationProviderConfig, notificationServiceConfig } from './config';
import type { IntegrationEvent } from './types';
import { appEventBus } from '@/lib/event-bus';
import type { CalendarEventCreatedPayload } from '@/lib/event-bus';

interface NotificationRuntime {
  service: NotificationService;
  templateEngine: TemplateEngine;
  preferenceCenter: PreferenceCenter;
  metrics: MetricsStore;
  consumer: NotificationEventConsumer;
}

declare global {
  // eslint-disable-next-line no-var
  var __notificationRuntime: NotificationRuntime | undefined;
}

function registerDefaultTemplates(engine: TemplateEngine) {
  engine.registerTemplate({
    id: 'generic-email',
    channel: 'email',
    name: 'Generic Email',
    subject: '{{subject}}',
    html: '<p>{{message}}</p>',
    text: '{{message}}',
    defaultContext: {
      subject: 'Notification',
      message: '',
    },
  });

  engine.registerTemplate({
    id: 'generic-sms',
    channel: 'sms',
    name: 'Generic SMS',
    text: '{{message}}',
    defaultContext: {
      message: '',
    },
  });

  engine.registerTemplate({
    id: 'generic-voice',
    channel: 'voice',
    name: 'Generic Voice',
    text: '{{message}}',
    defaultContext: {
      message: '',
    },
  });

  engine.registerTemplate({
    id: 'generic-push',
    channel: 'push',
    name: 'Generic Push',
    subject: '{{title}}',
    text: '{{message}}',
    defaultContext: {
      title: 'Notification',
      message: '',
    },
  });

  engine.registerTemplate({
    id: 'calendar-event-created',
    channel: 'email',
    name: 'Calendar Event Created',
    subject: 'You have a new meeting: {{summary}}',
    html: `
      <h1>{{summary}}</h1>
      <p>{{description}}</p>
      <p><strong>Starts:</strong> {{startTime}}</p>
      <p><strong>Ends:</strong> {{endTime}}</p>
    `,
    text: `Your meeting "{{summary}}" is scheduled for {{startTime}} and ends at {{endTime}}.`,
    defaultContext: {
      summary: 'Meeting',
      description: '',
      startTime: '',
      endTime: '',
    },
  });
}

function createRuntime(): NotificationRuntime {
  const templateEngine = new TemplateEngine();
  registerDefaultTemplates(templateEngine);

  const preferenceCenter = new PreferenceCenter();
  const metrics = new MetricsStore();

  const emailProvider = new SendGridEmailProvider(notificationProviderConfig.sendgrid);
  const twilioProvider = new TwilioProvider(notificationProviderConfig.twilio);
  const pushProvider = new PushNotificationProvider(notificationProviderConfig.push);

  const service = new NotificationService({
    templateEngine,
    preferenceCenter,
    metrics,
    emailProvider,
    smsProvider: twilioProvider,
    voiceProvider: twilioProvider,
    pushProvider,
    config: notificationServiceConfig,
  });

  const consumer = new NotificationEventConsumer(service);

  preferenceCenter.on('change', (event) => {
    appEventBus.emit('notifications:preferenceChanged', event);
  });

  consumer.listenTo(appEventBus, 'calendar:eventCreated', mapCalendarEventToNotification);

  return {
    service,
    templateEngine,
    preferenceCenter,
    metrics,
    consumer,
  } satisfies NotificationRuntime;
}

function mapCalendarEventToNotification(payload: CalendarEventCreatedPayload): IntegrationEvent {
  return {
    channel: 'email',
    templateId: 'calendar-event-created',
    recipients: [
      {
        userId: payload.attendeeEmail,
        address: payload.attendeeEmail,
        name: payload.attendeeName,
      },
    ],
    context: {
      summary: payload.summary,
      description: payload.description,
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
    category: 'calendar',
  } satisfies IntegrationEvent;
}

const runtime = globalThis.__notificationRuntime ?? (globalThis.__notificationRuntime = createRuntime());

export const notificationService = runtime.service;
export const notificationTemplateEngine = runtime.templateEngine;
export const notificationPreferenceCenter = runtime.preferenceCenter;
export const notificationMetrics = runtime.metrics;
export const notificationEventConsumer = runtime.consumer;
