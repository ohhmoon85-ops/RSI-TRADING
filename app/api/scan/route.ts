/**
 * POST /api/scan — 브라우저 수동 스캔 (인증 불필요)
 * Cron 인증과 분리하여 대시보드에서 자유롭게 호출 가능
 */

import { NextResponse } from 'next/server';
import { runScan } from '@/lib/scanner';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const start = Date.now();
  try {
    const result = await runScan(true); // 전체 57개 동시 스캔
    const duration = Date.now() - start;
    console.log(`[Manual Scan] 완료: ${result.processed}종목, ${result.signals}신호, ${duration}ms`);
    if (result.errors.length > 0) {
      console.error('[Manual Scan] 오류:', result.errors.slice(0, 5).join(' | '));
    }
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      signals: result.signals,
      errors: result.errors,
      durationMs: duration,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[Manual Scan] 치명적 오류:', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
