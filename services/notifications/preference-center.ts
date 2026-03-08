import EventEmitter from 'eventemitter3';

import type {
  ChannelPreference,
  NotificationChannel,
  NotificationRecipient,
  PreferenceUpdate,
  UserNotificationPreferences,
} from './types';

const DEFAULT_CHANNEL_STATE: ChannelPreference = {
  enabled: true,
  categories: {},
  quietHours: null,
  lastUpdated: new Date(),
};

export interface PreferenceChangeEvent {
  userId: string;
  channel: NotificationChannel;
  enabled: boolean;
  category?: string;
}

type PreferenceEvents = {
  change: (event: PreferenceChangeEvent) => void;
};

export class PreferenceCenter extends EventEmitter<PreferenceEvents> {
  private readonly store = new Map<string, UserNotificationPreferences>();

  getPreferences(userId: string): UserNotificationPreferences {
    const existing = this.store.get(userId);

    if (existing) {
      return existing;
    }

    const fresh: UserNotificationPreferences = {
      userId,
      channels: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.store.set(userId, fresh);
    return fresh;
  }

  setPreferences(preferences: UserNotificationPreferences) {
    preferences.updatedAt = new Date();
    if (!preferences.createdAt) {
      preferences.createdAt = new Date();
    }
    this.store.set(preferences.userId, preferences);
  }

  updatePreference(update: PreferenceUpdate) {
    const preferences = this.getPreferences(update.userId);
    const channelState = { ...DEFAULT_CHANNEL_STATE, ...(preferences.channels[update.channel] ?? {}) };

    channelState.enabled = update.enabled;
    channelState.lastUpdated = new Date();
    channelState.quietHours = update.quietHours ?? channelState.quietHours ?? null;

    if (update.category) {
      channelState.categories = {
        ...channelState.categories,
        [update.category]: update.enabled,
      };
    }

    preferences.channels = {
      ...preferences.channels,
      [update.channel]: channelState,
    };
    preferences.updatedAt = new Date();

    this.store.set(update.userId, preferences);
    this.emit('change', {
      userId: update.userId,
      channel: update.channel,
      enabled: update.enabled,
      category: update.category,
    });
  }

  bulkUpdate(updates: PreferenceUpdate[]) {
    updates.forEach((update) => this.updatePreference(update));
  }

  isChannelEnabled(
    userId: string,
    channel: NotificationChannel,
    category?: string,
    date: Date = new Date(),
  ) {
    const preferences = this.getPreferences(userId);
    const channelPrefs = preferences.channels[channel];

    if (!channelPrefs) {
      return true;
    }

    if (!channelPrefs.enabled) {
      return false;
    }

    if (category && channelPrefs.categories[category] === false) {
      return false;
    }

    if (channelPrefs.quietHours) {
      const { start, end } = channelPrefs.quietHours;
      if (start && end) {
        const [startHour, startMinute] = start.split(':').map(Number);
        const [endHour, endMinute] = end.split(':').map(Number);
        const currentMinutes = date.getHours() * 60 + date.getMinutes();
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        const isQuiet =
          startMinutes < endMinutes
            ? currentMinutes >= startMinutes && currentMinutes < endMinutes
            : currentMinutes >= startMinutes || currentMinutes < endMinutes;

        if (isQuiet) {
          return false;
        }
      }
    }

    return true;
  }

  resolveRecipients(
    channel: NotificationChannel,
    recipients: NotificationRecipient[],
    category?: string,
  ): { allowed: NotificationRecipient[]; suppressed: NotificationRecipient[] } {
    const allowed: NotificationRecipient[] = [];
    const suppressed: NotificationRecipient[] = [];

    recipients.forEach((recipient) => {
      if (this.isChannelEnabled(recipient.userId, channel, category)) {
        allowed.push(recipient);
      } else {
        suppressed.push(recipient);
      }
    });

    return { allowed, suppressed };
  }

  listSubscribers(channel: NotificationChannel, category?: string) {
    const matches: string[] = [];

    this.store.forEach((prefs) => {
      if (this.isChannelEnabled(prefs.userId, channel, category)) {
        matches.push(prefs.userId);
      }
    });

    return matches;
  }

  exportAll(): UserNotificationPreferences[] {
    return Array.from(this.store.values()).map((preference) => ({ ...preference }));
  }
}
