/**
 * Web Push 구독 등록/삭제
 */

import { NextRequest, NextResponse } from 'next/server';
import { savePushSubscription, removePushSubscription } from '@/lib/notify/webpush';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { subscription } = body;

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: '구독 정보 없음' }, { status: 400 });
  }

  await savePushSubscription(subscription);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { endpoint } = body;
  if (!endpoint) return NextResponse.json({ error: 'endpoint 필수' }, { status: 400 });

  await removePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
