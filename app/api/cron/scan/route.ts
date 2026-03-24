/**
 * Vercel Cron Job 진입점
 * POST /api/cron/scan  — 5분마다 실행
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScan } from '@/lib/scanner';

export const runtime = 'nodejs';
export const maxDuration = 60; // Vercel Pro: 60초, Free: 10초

export async function GET(req: NextRequest) {
  // Cron 인증 (Vercel에서 자동으로 CRON_SECRET 헤더 설정)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();

  try {
    const result = await runScan();
    const duration = Date.now() - start;

    console.log(`[Cron] 완료: ${result.processed}종목, ${result.signals}신호, ${duration}ms`);

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      signals: result.signals,
      errors: result.errors,
      durationMs: duration,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Cron] 오류:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
