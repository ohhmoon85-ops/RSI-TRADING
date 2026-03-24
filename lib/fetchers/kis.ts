/**
 * 한국투자증권(KIS) OpenAPI Fetcher
 * 한국주식 실시간/분봉 데이터 (P1 주소스)
 */

import type { Candle } from '@/types';
import { kv } from '@/lib/kv';

const KV_TOKEN_KEY = 'kis:access_token';

/** 모의투자 여부 — Vercel 환경변수 KIS_PAPER=true 로 설정 */
function isPaper(): boolean {
  return process.env.KIS_PAPER === 'true';
}

/** KIS 베이스 URL (실전 vs 모의) */
function kisBase(): string {
  return isPaper()
    ? 'https://openapivts.koreainvestment.com:9443'
    : 'https://openapi.koreainvestment.com:9443';
}

/** OAuth 토큰 발급 — KV에 캐싱 (분당 1회 제한 대응) */
async function getKISToken(): Promise<string> {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;

  if (!appKey || !appSecret) throw new Error('KIS_APP_KEY/SECRET 미설정');

  // KV에서 캐시된 토큰 확인 (서버리스 인스턴스 간 공유)
  const cached = await kv.get<string>(KV_TOKEN_KEY);
  if (cached) return cached;

  const res = await fetch(`${kisBase()}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      appsecret: appSecret,
    }),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`KIS 토큰 발급 실패: ${res.status} (${isPaper() ? '모의' : '실전'}) — ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const token: string = json.access_token;
  const ttlSec: number = (json.expires_in ?? 86400) - 300; // 만료 5분 전에 갱신

  // KV에 저장 — 모든 서버리스 인스턴스가 공유
  await kv.set(KV_TOKEN_KEY, token, { ex: ttlSec });

  return token;
}

const KIS_TF_MAP: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '1d': 'D',
};

/** 국내 주식 분봉/일봉 조회 */
export async function fetchKISCandles(
  ticker: string,
  timeframe: string,
  timeoutMs = 3000
): Promise<Candle[]> {
  const token = await getKISToken();
  const appKey = process.env.KIS_APP_KEY!;
  const appSecret = process.env.KIS_APP_SECRET!;

  const isMinute = timeframe !== '1d';
  const endpoint = isMinute
    ? `${kisBase()}/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice`
    : `${kisBase()}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`;

  const trId = isMinute ? 'FHKST03010200' : 'FHKST03010100';

  const params = new URLSearchParams({
    FID_ETC_CLS_CODE: '',
    FID_COND_MRKT_DIV_CODE: 'J',
    FID_INPUT_ISCD: ticker,
    FID_INPUT_HOUR_1: '000000',
    FID_PW_DATA_INCU_YN: 'Y',
    ...(isMinute && { FID_HOUR_CLS_CODE: KIS_TF_MAP[timeframe] ?? '15' }),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${endpoint}?${params}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: trId,
        custtype: 'P',
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`KIS HTTP ${res.status}`);

    const json = await res.json();
    const output2: Array<Record<string, string>> = json.output2 ?? [];

    const candles: Candle[] = output2
      .map((row) => {
        const dateStr = row.stck_bsop_date ?? row.stck_cntg_hour;
        const timeStr = row.stck_cntg_hour ?? '000000';
        const dt = dateStr + timeStr;
        // YYYYMMDDHHMMSS 파싱
        const time = new Date(
          `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}T${dt.slice(8, 10)}:${dt.slice(10, 12)}:${dt.slice(12, 14)}+09:00`
        ).getTime();

        return {
          time,
          open: parseFloat(row.stck_oprc),
          high: parseFloat(row.stck_hgpr),
          low: parseFloat(row.stck_lwpr),
          close: parseFloat(row.stck_prpr ?? row.stck_clpr),
          volume: parseFloat(row.cntg_vol ?? row.acml_vol ?? '0'),
        };
      })
      .filter((c) => !isNaN(c.time) && c.close > 0)
      .sort((a, b) => a.time - b.time);

    return candles;
  } finally {
    clearTimeout(timer);
  }
}
