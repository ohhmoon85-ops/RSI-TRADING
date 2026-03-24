/**
 * GET /api/debug/kis — KIS API 연결 진단
 */

import { NextResponse } from 'next/server';
import { fetchKISCandles } from '@/lib/fetchers/kis';

export const runtime = 'nodejs';

export async function GET() {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  // 환경변수 확인
  if (!appKey || !appSecret) {
    return NextResponse.json({
      ok: false,
      step: 'env',
      error: `환경변수 미설정 — KIS_APP_KEY: ${appKey ? '✓' : '✗'}, KIS_APP_SECRET: ${appSecret ? '✓' : '✗'}`,
    });
  }

  // 토큰 발급 테스트
  try {
    const tokenRes = await fetch('https://openapi.koreainvestment.com:9443/oauth2/tokenP', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        appkey: appKey,
        appsecret: appSecret,
      }),
    });
    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json({
        ok: false,
        step: 'token',
        status: tokenRes.status,
        error: tokenJson.msg1 ?? tokenJson.message ?? JSON.stringify(tokenJson),
      });
    }

    // 삼성전자 15분봉 1건 조회 테스트
    try {
      const candles = await fetchKISCandles('005930', '15m', 8000);
      return NextResponse.json({
        ok: true,
        step: 'candle',
        tokenOk: true,
        candleCount: candles.length,
        latestClose: candles[candles.length - 1]?.close,
        message: `KIS API 정상 — 삼성전자 캔들 ${candles.length}개 수신`,
      });
    } catch (e) {
      return NextResponse.json({
        ok: false,
        step: 'candle',
        tokenOk: true,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: 'token',
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
