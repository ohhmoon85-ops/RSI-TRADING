/**
 * 앱 설정 CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Settings } from '@/types';
import { kv, KV_KEYS } from '@/lib/kv';

export const runtime = 'nodejs';

const DEFAULTS: Settings = {
  rsiBuyThreshold: 30,
  rsiSellThreshold: 70,
  rsiDeadZoneLow: 40,
  rsiDeadZoneHigh: 60,
  bbPeriod: 20,
  bbStdDev: 2,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  defaultRR: 2,
  telegramBotToken: '',
  telegramChatId: '',
  resendApiKey: '',
  alertEmail: '',
  webPushPublicKey: '',
  webPushPrivateKey: '',
};

/** GET /api/settings */
export async function GET() {
  const saved = await kv.get<Partial<Settings>>(KV_KEYS.settings());
  return NextResponse.json({ settings: { ...DEFAULTS, ...saved } });
}

/** POST /api/settings */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await kv.set(KV_KEYS.settings(), body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
