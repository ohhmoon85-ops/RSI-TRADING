/**
 * 위시리스트 CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import type { WatchlistItem } from '@/types';
import { kv, KV_KEYS } from '@/lib/kv';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

async function getWatchlist(): Promise<WatchlistItem[]> {
  return (await kv.get<WatchlistItem[]>(KV_KEYS.watchlist())) ?? [];
}

/** GET /api/watchlist */
export async function GET() {
  const items = await getWatchlist();
  return NextResponse.json({ items });
}

/** POST /api/watchlist — 종목 추가 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticker, name, market, timeframes } = body;

    if (!ticker || !market) {
      return NextResponse.json({ error: 'ticker, market 필수' }, { status: 400 });
    }

    const items = await getWatchlist();

    // 중복 확인
    if (items.some((i) => i.ticker.toUpperCase() === ticker.toUpperCase())) {
      return NextResponse.json({ error: '이미 등록된 종목' }, { status: 409 });
    }

    const newItem: WatchlistItem = {
      id: nanoid(),
      ticker: ticker.toUpperCase(),
      name: name ?? ticker.toUpperCase(),
      market,
      timeframes: timeframes ?? ['15m'],
      notifyTelegram: true,
      notifyPush: true,
      notifyEmail: false,
      createdAt: Date.now(),
    };

    items.push(newItem);
    await kv.set(KV_KEYS.watchlist(), items);

    return NextResponse.json({ ok: true, item: newItem }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** PATCH /api/watchlist — 종목 설정 수정 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 });

    const items = await getWatchlist();
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return NextResponse.json({ error: '종목 없음' }, { status: 404 });

    items[idx] = { ...items[idx], ...updates };
    await kv.set(KV_KEYS.watchlist(), items);

    return NextResponse.json({ ok: true, item: items[idx] });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/** DELETE /api/watchlist?id=xxx */
export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id 필수' }, { status: 400 });

  const items = await getWatchlist();
  const updated = items.filter((i) => i.id !== id);
  await kv.set(KV_KEYS.watchlist(), updated);

  return NextResponse.json({ ok: true });
}
