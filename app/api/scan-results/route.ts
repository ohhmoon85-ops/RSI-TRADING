/**
 * GET /api/scan-results?tf=15m
 * 유니버스 최신 스캔 결과 반환
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ScanResult } from '@/types';
import { kv, KV_KEYS } from '@/lib/kv';
import { KOREA_UNIVERSE } from '@/lib/universe';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const tf = new URL(req.url).searchParams.get('tf') ?? '15m';

  const results = (await kv.get<ScanResult[]>(KV_KEYS.scanResults(tf))) ?? [];

  // 아직 스캔 안 된 종목은 placeholder로 채움
  const byTicker = new Map(results.map((r) => [r.ticker, r]));
  const merged = KOREA_UNIVERSE.map((stock) =>
    byTicker.get(stock.ticker) ?? null
  ).filter((r): r is ScanResult => r !== null);

  // RSI 낮은 순 정렬 (매수 신호 포착 쉽도록)
  merged.sort((a, b) => a.rsi - b.rsi);

  return NextResponse.json({ results: merged, total: KOREA_UNIVERSE.length, scanned: merged.length });
}
