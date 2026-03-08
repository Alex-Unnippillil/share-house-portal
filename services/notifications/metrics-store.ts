import type {
  ChannelResponse,
  DeliveryEvent,
  MetricsSummary,
  NotificationChannel,
  NotificationEvent,
} from './types';

const MAX_EVENT_HISTORY = 5000;

export class MetricsStore {
  private readonly events: NotificationEvent[] = [];
  private readonly sends: ChannelResponse[] = [];
  private suppressed = 0;

  recordSend(response: ChannelResponse) {
    this.sends.push(response);
    this.trimArray(this.sends);
  }

  recordSuppressed(count = 1) {
    this.suppressed += count;
  }

  recordEvent(event: NotificationEvent) {
    this.events.push(event);
    this.trimArray(this.events);
  }

  getSummary(): MetricsSummary {
    const summary: MetricsSummary = {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0,
      totalFailed: 0,
      totalComplained: 0,
      suppressed: this.suppressed,
      byChannel: {
        email: { sent: 0, delivered: 0, bounced: 0, failed: 0, suppressed: 0 },
        sms: { sent: 0, delivered: 0, bounced: 0, failed: 0, suppressed: 0 },
        voice: { sent: 0, delivered: 0, bounced: 0, failed: 0, suppressed: 0 },
        push: { sent: 0, delivered: 0, bounced: 0, failed: 0, suppressed: 0 },
      },
      lastEvents: this.events.slice(-50),
      updatedAt: null,
    };

    this.sends.forEach((send) => {
      if (send.status === 'sent' || send.status === 'queued') {
        summary.totalSent += 1;
        summary.byChannel[send.channel].sent += 1;
      }
      if (send.status === 'failed') {
        summary.totalFailed += 1;
        summary.byChannel[send.channel].failed += 1;
      }
      if (send.status === 'skipped') {
        summary.byChannel[send.channel].suppressed += 1;
      }
      summary.updatedAt = send.timestamp;
    });

    this.events.forEach((event) => {
      if (isDelivery(event)) {
        summary.byChannel[event.channel].delivered += 1;
        if (event.type === 'delivered') {
          summary.totalDelivered += 1;
        }
        if (event.type === 'opened') {
          summary.totalOpened += 1;
        }
        if (event.type === 'clicked') {
          summary.totalClicked += 1;
        }
      } else {
        summary.byChannel[event.channel].bounced += 1;
        if (event.type === 'bounced') {
          summary.totalBounced += 1;
        }
        if (event.type === 'failed') {
          summary.totalFailed += 1;
        }
        if (event.type === 'complained') {
          summary.totalComplained += 1;
        }
      }
      summary.updatedAt = event.timestamp;
    });

    summary.suppressed += summary.byChannel.email.suppressed +
      summary.byChannel.sms.suppressed +
      summary.byChannel.voice.suppressed +
      summary.byChannel.push.suppressed;

    return summary;
  }

  filterEvents(filter: {
    channel?: NotificationChannel;
    type?: NotificationEvent['type'];
    provider?: string;
    recipient?: string;
  }) {
    return this.events.filter((event) => {
      if (filter.channel && event.channel !== filter.channel) {
        return false;
      }
      if (filter.type && event.type !== filter.type) {
        return false;
      }
      if (filter.provider && event.provider !== filter.provider) {
        return false;
      }
      if (filter.recipient && event.recipient !== filter.recipient) {
        return false;
      }
      return true;
    });
  }

  private trimArray<T>(array: T[]) {
    if (array.length > MAX_EVENT_HISTORY) {
      array.splice(0, array.length - MAX_EVENT_HISTORY);
    }
  }
}

function isDelivery(event: NotificationEvent): event is DeliveryEvent {
  return event.type === 'delivered' || event.type === 'opened' || event.type === 'clicked' || event.type === 'sent' || event.type === 'queued';
}
