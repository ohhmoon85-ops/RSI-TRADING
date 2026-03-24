/**
 * Alpha Vantage Fetcher
 * 미국주식 분봉/일봉 데이터 (무료 25req/day)
 */

import type { Candle } from '@/types';

const AV_TF_MAP: Record<string, string> = {
  '5m': '5min',
  '15m': '15min',
  '1h': '60min',
  '1d': 'daily',
};

export async function fetchAlphaVantageCandles(
  ticker: string,
  timeframe: string,
  timeoutMs = 4000
): Promise<Candle[]> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) throw new Error('ALPHA_VANTAGE_KEY 미설정');

  const interval = AV_TF_MAP[timeframe];
  if (!interval) throw new Error(`지원하지 않는 타임프레임: ${timeframe}`);

  const isIntraday = timeframe !== '1d';
  const func = isIntraday ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY';

  const params = new URLSearchParams({
    function: func,
    symbol: ticker,
    apikey: apiKey,
    outputsize: 'compact',
    datatype: 'json',
    ...(isIntraday && { interval }),
  });

  const url = `https://www.alphavantage.co/query?${params}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal, next: { revalidate: 0 } });
    if (!res.ok) throw new Error(`AV HTTP ${res.status}`);

    const json = await res.json();

    // 에러 메시지 확인
    if (json['Note'] || json['Information']) {
      throw new Error('Alpha Vantage 요청 한도 초과');
    }

    // 시계열 키 추출
    const tsKey = Object.keys(json).find((k) => k.startsWith('Time Series'));
    if (!tsKey) throw new Error('Alpha Vantage: 시계열 데이터 없음');

    const series: Record<string, Record<string, string>> = json[tsKey];

    const candles: Candle[] = Object.entries(series)
      .map(([dateStr, v]) => ({
        time: new Date(dateStr).getTime(),
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseFloat(v['5. volume']),
      }))
      .sort((a, b) => a.time - b.time);

    return candles;
  } finally {
    clearTimeout(timer);
  }
}
