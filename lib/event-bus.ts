import EventEmitter from 'eventemitter3';

type NotificationChannel = 'email' | 'sms' | 'voice' | 'push';

export interface CalendarEventCreatedPayload {
  summary: string;
  description: string;
  startTime: string;
  endTime: string;
  attendeeEmail: string;
  attendeeName?: string;
}

export interface PreferenceChangedPayload {
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  category?: string;
}

export interface AppEventMap {
  'calendar:eventCreated': CalendarEventCreatedPayload;
  'notifications:preferenceChanged': PreferenceChangedPayload;
}

declare global {
  // eslint-disable-next-line no-var
  var __appEventBus: EventEmitter<AppEventMap> | undefined;
}

export const appEventBus: EventEmitter<AppEventMap> =
  globalThis.__appEventBus ?? (globalThis.__appEventBus = new EventEmitter<AppEventMap>());
