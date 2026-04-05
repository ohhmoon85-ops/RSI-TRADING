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

/** 토큰을 KV에 미리 발급·저장 (병렬 스캔 전 1회 호출) */
export async function warmupKISToken(): Promise<string> {
  return getKISToken();
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
  timeoutMs = 5000
): Promise<Candle[]> {
  const token = await getKISToken();
  const appKey = process.env.KIS_APP_KEY!;
  const appSecret = process.env.KIS_APP_SECRET!;

  const isDaily = timeframe === '1d';
  const endpoint = isDaily
    ? `${kisBase()}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`
    : `${kisBase()}/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice`;

  const trId = isDaily ? 'FHKST03010100' : 'FHKST03010200';

  // 현재 한국시간
  const nowKST = new Date(Date.now() + 9 * 3600 * 1000);
  const yyyymmdd = nowKST.toISOString().slice(0, 10).replace(/-/g, '');
  const hhmm = nowKST.toISOString().slice(11, 19).replace(/:/g, '');

  // 일봉: 90일치 요청 / 분봉: 현재 시각 기준 최근 데이터
  const past90 = new Date(nowKST.getTime() - 90 * 86400 * 1000)
    .toISOString().slice(0, 10).replace(/-/g, '');

  const params = isDaily
    ? new URLSearchParams({
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: ticker,
        FID_INPUT_DATE_1: past90,
        FID_INPUT_DATE_2: yyyymmdd,
        FID_PERIOD_DIV_CODE: 'D',
        FID_ORG_ADJ_PRC: '1',
      })
    : new URLSearchParams({
        FID_ETC_CLS_CODE: '',
        FID_COND_MRKT_DIV_CODE: 'J',
        FID_INPUT_ISCD: ticker,
        FID_INPUT_HOUR_1: hhmm,
        FID_PW_DATA_INCU_YN: 'Y',
        FID_HOUR_CLS_CODE: KIS_TF_MAP[timeframe] ?? '15',
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

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`KIS HTTP ${res.status}: ${body.slice(0, 100)}`);
    }

    const json = await res.json();

    // 일봉: output2, 분봉: output2
    const output2: Array<Record<string, string>> = json.output2 ?? [];

    const candles: Candle[] = output2
      .map((row) => {
        let time: number;
        if (isDaily) {
          // 일봉: stck_bsop_date = YYYYMMDD
          const d = row.stck_bsop_date ?? '';
          time = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T09:00:00+09:00`).getTime();
        } else {
          // 분봉: stck_bsop_date + stck_cntg_hour
          const dateStr = row.stck_bsop_date ?? '';
          const timeStr = row.stck_cntg_hour ?? '000000';
          time = new Date(
            `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T${timeStr.slice(0, 2)}:${timeStr.slice(2, 4)}:${timeStr.slice(4, 6)}+09:00`
          ).getTime();
        }

        return {
          time,
          open: parseFloat(row.stck_oprc),
          high: parseFloat(row.stck_hgpr),
          low: parseFloat(row.stck_lwpr),
          close: parseFloat(row.stck_clpr ?? row.stck_prpr),
          volume: parseFloat(row.acml_vol ?? row.cntg_vol ?? '0'),
        };
      })
      .filter((c) => !isNaN(c.time) && c.close > 0)
      .sort((a, b) => a.time - b.time);

    return candles;
  } finally {
    clearTimeout(timer);
  }
}
