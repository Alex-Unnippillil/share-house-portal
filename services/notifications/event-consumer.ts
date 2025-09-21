import EventEmitter from 'eventemitter3';

import type { NotificationService } from './notification-service';
import type { IntegrationEvent } from './types';

export class NotificationEventConsumer {
  private readonly subscriptions: Array<() => void> = [];

  constructor(private readonly service: NotificationService) {}

  listenTo<T extends Record<string, unknown>>(
    emitter: EventEmitter<T>,
    eventName: keyof T & string,
    mapper?: (payload: T[keyof T]) => IntegrationEvent | IntegrationEvent[] | null | Promise<IntegrationEvent | IntegrationEvent[] | null>,
  ) {
    const handler = async (payload: T[keyof T]) => {
      try {
        const mapped = mapper ? await mapper(payload) : (payload as IntegrationEvent | IntegrationEvent[] | null);
        if (!mapped) {
          return;
        }
        await this.consume(mapped);
      } catch (error) {
        console.error('Failed to process integration event', error);
      }
    };

    emitter.on(eventName, handler as (payload: T[keyof T]) => void);
    this.subscriptions.push(() => emitter.off(eventName, handler as (payload: T[keyof T]) => void));
  }

  async consume(event: IntegrationEvent | IntegrationEvent[]) {
    const events = Array.isArray(event) ? event : [event];

    for (const item of events) {
      await this.service.send(item);
    }
  }

  detachAll() {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.length = 0;
  }
}
