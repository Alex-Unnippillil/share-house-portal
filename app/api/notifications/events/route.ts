import { NextRequest, NextResponse } from 'next/server';

import { notificationMetrics, notificationService } from '@/services/notifications';
import { SendGridEmailProvider } from '@/services/notifications/channels/email';
import { TwilioProvider } from '@/services/notifications/channels/sms';
import { PushNotificationProvider } from '@/services/notifications/channels/push';
import type { NotificationChannel, NotificationEvent } from '@/services/notifications/types';

export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get('channel');
  const type = request.nextUrl.searchParams.get('type');
  const recipient = request.nextUrl.searchParams.get('recipient');
  const provider = request.nextUrl.searchParams.get('provider');

  if (channel || type || recipient || provider) {
    const events = notificationMetrics.filterEvents({
      channel: (channel as NotificationChannel | null) ?? undefined,
      type: (type as NotificationEvent['type'] | null) ?? undefined,
      recipient: recipient ?? undefined,
      provider: provider ?? undefined,
    });

    return NextResponse.json({ events });
  }

  return NextResponse.json(notificationMetrics.getSummary());
}

export async function POST(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');

  if (!provider) {
    return NextResponse.json({ error: 'Provider query parameter is required.' }, { status: 400 });
  }

  const payload = await request.json().catch(() => undefined);

  if (!payload) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  let events = [];

  switch (provider) {
    case 'sendgrid':
      events = SendGridEmailProvider.parseWebhook(payload);
      break;
    case 'twilio-sms':
      events = TwilioProvider.parseWebhook(payload, 'sms');
      break;
    case 'twilio-voice':
      events = TwilioProvider.parseWebhook(payload, 'voice');
      break;
    case 'fcm':
      events = PushNotificationProvider.parseFcmWebhook(payload);
      break;
    default:
      return NextResponse.json({ error: `Unsupported provider: ${provider}` }, { status: 400 });
  }

  notificationService.recordEvents(events);

  return NextResponse.json({ received: events.length });
}
