/**
 * 신호 목록 조회 / 결과 업데이트 API
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Signal } from '@/types';
import { kv, KV_KEYS } from '@/lib/kv';

export const runtime = 'nodejs';

/** GET /api/signals — 최신 신호 목록 반환 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
  const type = searchParams.get('type'); // BUY_A | BUY_B | SELL
  const ticker = searchParams.get('ticker');

  try {
    const ids = (await kv.get<string[]>(KV_KEYS.signalList())) ?? [];
    const slicedIds = ids.slice(0, limit * 2); // 필터링 여유분

    const signals = (
      await Promise.all(slicedIds.map((id) => kv.get<Signal>(KV_KEYS.signal(id))))
    ).filter((s): s is Signal => s !== null);

    let filtered = signals;
    if (type) filtered = filtered.filter((s) => s.type === type);
    if (ticker) filtered = filtered.filter((s) => s.ticker.toUpperCase() === ticker.toUpperCase());

    return NextResponse.json({ signals: filtered.slice(0, limit), total: filtered.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** PATCH /api/signals — 신호 결과 업데이트 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, result, pnlPercent, note } = body;

    if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 });

    const signal = await kv.get<Signal>(KV_KEYS.signal(id));
    if (!signal) return NextResponse.json({ error: '신호 없음' }, { status: 404 });

    const updated: Signal = {
      ...signal,
      result: result ?? signal.result,
      pnlPercent: pnlPercent ?? signal.pnlPercent,
      note: note ?? signal.note,
      status: result === 'WIN' ? 'TP_HIT' : result === 'LOSS' ? 'SL_HIT' : signal.status,
    };

    await kv.set(KV_KEYS.signal(id), updated, { ex: 30 * 86400 });
    return NextResponse.json({ ok: true, signal: updated });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** DELETE /api/signals?id=xxx */
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 });

  await kv.del(KV_KEYS.signal(id));

  const list = (await kv.get<string[]>(KV_KEYS.signalList())) ?? [];
  await kv.set(KV_KEYS.signalList(), list.filter((i) => i !== id));

  return NextResponse.json({ ok: true });
}
