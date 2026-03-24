/**
 * Yahoo Finance 데이터 Fetcher
 * 비공식 API 사용 (폴백 소스)
 */

import type { Candle } from '@/types';

const TF_MAP: Record<string, string> = {
  '5m': '5m',
  '15m': '15m',
  '1h': '60m',
  '1d': '1d',
};

const RANGE_MAP: Record<string, string> = {
  '5m': '5d',
  '15m': '10d',
  '1h': '60d',
  '1d': '1y',
};

export async function fetchYahooCandles(
  ticker: string,
  timeframe: string,
  timeoutMs = 5000
): Promise<Candle[]> {
  const interval = TF_MAP[timeframe] ?? '15m';
  const range = RANGE_MAP[timeframe] ?? '10d';

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RSIAlertPro/1.0)',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) throw new Error('Yahoo: 빈 응답');

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i];
      const h = quote.high?.[i];
      const l = quote.low?.[i];
      const c = quote.close?.[i];
      const v = quote.volume?.[i];
      if (o == null || h == null || l == null || c == null) continue;

      candles.push({
        time: timestamps[i] * 1000,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v ?? 0,
      });
    }

    return candles;
  } finally {
    clearTimeout(timer);
  }
}
