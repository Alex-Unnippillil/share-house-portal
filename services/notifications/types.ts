import type EventEmitter from 'eventemitter3';

export type NotificationChannel = 'email' | 'sms' | 'voice' | 'push';

export type TemplateContext = Record<string, unknown>;

export interface NotificationTemplate {
  id: string;
  channel: NotificationChannel;
  name?: string;
  description?: string;
  subject?: string;
  html?: string;
  text?: string;
  layout?: string;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: string[];
  defaultContext?: TemplateContext;
}

export interface RenderedTemplate {
  subject?: string;
  html?: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationRecipient {
  userId: string;
  address: string;
  name?: string;
  locale?: string;
  timeZone?: string;
  metadata?: Record<string, unknown>;
}

export interface SendNotificationRequest {
  channel: NotificationChannel;
  templateId: string;
  recipients: NotificationRecipient[];
  context?: TemplateContext;
  category?: string;
  correlationId?: string;
  providerOverrides?: Record<string, unknown>;
  options?: NotificationDispatchOptions;
}

export interface NotificationDispatchOptions {
  trackOpens?: boolean;
  trackClicks?: boolean;
  highPriority?: boolean;
  delayUntil?: Date;
  dryRun?: boolean;
  responseHook?: (response: ChannelResponse) => void | Promise<void>;
}

export interface ChannelResponse {
  success: boolean;
  status: 'sent' | 'queued' | 'failed' | 'skipped';
  channel: NotificationChannel;
  recipient: NotificationRecipient;
  messageId?: string;
  provider?: string;
  error?: string;
  timestamp: Date;
  meta?: Record<string, unknown>;
}

export interface NotificationSendSummary {
  templateId: string;
  channel: NotificationChannel;
  category?: string;
  correlationId?: string;
  responses: ChannelResponse[];
  sent: number;
  skipped: number;
  failed: number;
  timestamp: Date;
}

export interface ChannelPreference {
  enabled: boolean;
  categories: Record<string, boolean>;
  quietHours?: {
    start: string; // HH:mm in 24h
    end: string; // HH:mm in 24h
  } | null;
  lastUpdated: Date;
  reason?: string;
}

export interface UserNotificationPreferences {
  userId: string;
  locale?: string;
  timeZone?: string;
  channels: Partial<Record<NotificationChannel, ChannelPreference>>;
  updatedAt: Date;
  createdAt: Date;
}

export interface PreferenceUpdate {
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  category?: string;
  reason?: string;
  quietHours?: ChannelPreference['quietHours'];
}

export interface DeliveryEvent {
  type: 'delivered' | 'opened' | 'clicked' | 'sent' | 'queued';
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  timestamp: Date;
  messageId?: string;
  category?: string;
  data?: Record<string, unknown>;
}

export interface BounceEvent {
  type: 'bounced' | 'dropped' | 'failed' | 'complained';
  channel: NotificationChannel;
  provider: string;
  recipient: string;
  timestamp: Date;
  messageId?: string;
  category?: string;
  reason?: string;
  data?: Record<string, unknown>;
}

export type NotificationEvent = DeliveryEvent | BounceEvent;

export interface MetricsSummary {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalFailed: number;
  totalComplained: number;
  suppressed: number;
  byChannel: Record<NotificationChannel, {
    sent: number;
    delivered: number;
    bounced: number;
    failed: number;
    suppressed: number;
  }>;
  lastEvents: NotificationEvent[];
  updatedAt: Date | null;
}

export interface ProviderWebhookParser {
  (payload: unknown): NotificationEvent[];
}

export interface IntegrationEvent {
  channel: NotificationChannel;
  templateId: string;
  recipients: NotificationRecipient[];
  context?: TemplateContext;
  category?: string;
  correlationId?: string;
  options?: NotificationDispatchOptions;
}

export type NotificationEventEmitter = EventEmitter<Record<string, unknown>>;

export interface NotificationServiceConfig {
  dryRun?: boolean;
}

