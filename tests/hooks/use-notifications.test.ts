import { describe, expect, it } from 'vitest';
import {
  buildMaintenanceRequestNotifications,
  type MaintenanceNotificationPayload,
} from '@/hooks/use-notifications';
import type { InAppNotification, NotificationData } from '@/lib/notifications';

describe('buildMaintenanceRequestNotifications', () => {
  const basePayload: Omit<MaintenanceNotificationPayload, 'propertyManagers'> = {
    requesterName: 'Taylor Tenant',
    title: 'Leaky faucet',
    description: 'Water is dripping nonstop under the kitchen sink.',
    priority: 'high',
  };

  it('creates email and in-app notifications for each property manager', () => {
    const notifications = buildMaintenanceRequestNotifications({
      ...basePayload,
      propertyManagers: [
        { id: 'pm-1', email: 'pm1@example.com', name: 'Avery Agent' },
        { id: 'pm-2', email: 'pm2@example.com', name: 'Blake Broker' },
      ],
    });

    const emailNotifications = notifications.filter(
      (notification): notification is NotificationData => 'template' in notification,
    );
    const inAppNotifications = notifications.filter(
      (notification): notification is InAppNotification => !('template' in notification),
    );

    expect(emailNotifications).toHaveLength(2);
    expect(inAppNotifications).toHaveLength(2);
    expect(emailNotifications.map((notification) => notification.to)).toEqual([
      'pm1@example.com',
      'pm2@example.com',
    ]);
    expect(inAppNotifications.map((notification) => notification.userId)).toEqual([
      'pm-1',
      'pm-2',
    ]);
    expect(
      inAppNotifications.every(
        (notification) => notification.metadata?.priority === basePayload.priority,
      ),
    ).toBe(true);
  });

  it('skips email notifications when an address is missing but keeps the in-app alert', () => {
    const notifications = buildMaintenanceRequestNotifications({
      ...basePayload,
      propertyManagers: [{ id: 'pm-3', email: '', name: 'Carey Coordinator' }],
    });

    expect(notifications).toHaveLength(1);
    expect('template' in notifications[0]).toBe(false);
    expect((notifications[0] as InAppNotification).userId).toBe('pm-3');
  });

  it('deduplicates property managers by user id', () => {
    const notifications = buildMaintenanceRequestNotifications({
      ...basePayload,
      propertyManagers: [
        { id: 'pm-4', email: 'primary@example.com', name: 'Devon Director' },
        { id: 'pm-4', email: 'duplicate@example.com', name: 'Duplicate' },
      ],
    });

    expect(notifications).toHaveLength(2);

    const userIds = notifications.map((notification) =>
      'template' in notification
        ? (notification as NotificationData).userId ?? null
        : notification.userId,
    );

    expect(new Set(userIds)).toEqual(new Set(['pm-4']));
  });
});
