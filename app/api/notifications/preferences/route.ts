import { NextRequest, NextResponse } from 'next/server';

import { notificationPreferenceCenter } from '@/services/notifications';
import type { PreferenceUpdate } from '@/services/notifications/types';

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId query parameter is required.' }, { status: 400 });
  }

  const preferences = notificationPreferenceCenter.getPreferences(userId);
  return NextResponse.json({ preferences });
}

export async function PUT(request: NextRequest) {
  const payload = await request.json().catch(() => undefined);

  if (!payload) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const updates: PreferenceUpdate[] = Array.isArray(payload) ? payload : [payload];
  updates.forEach((update) => notificationPreferenceCenter.updatePreference(update));

  return NextResponse.json({ updated: updates.length });
}
