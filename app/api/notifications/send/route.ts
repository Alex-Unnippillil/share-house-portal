import { NextRequest, NextResponse } from 'next/server';

import { notificationService } from '@/services/notifications';
import type { SendNotificationRequest } from '@/services/notifications/types';

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => undefined);

  if (!payload) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  try {
    const summary = await notificationService.send(payload as SendNotificationRequest);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
