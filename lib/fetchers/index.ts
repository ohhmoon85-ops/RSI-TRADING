/**
 * 데이터 소스 우선순위 체인
 * KIS (P1) → Alpha Vantage (P2) → Yahoo (Fallback)
 */

import type { Candle } from '@/types';
import { fetchKISCandles } from './kis';
import { fetchAlphaVantageCandles } from './alphaVantage';
import { fetchYahooCandles } from './yahoo';

export async function fetchCandles(
  ticker: string,
  market: 'US' | 'KR',
  timeframe: string
): Promise<Candle[]> {
  const errors: string[] = [];

  if (market === 'KR') {
    // 한국주식: KIS → Yahoo KR 폴백
    try {
      const candles = await fetchKISCandles(ticker, timeframe, 3000);
      if (candles.length > 30) return candles;
    } catch (e) {
      errors.push(`KIS: ${e instanceof Error ? e.message : e}`);
    }

    // KIS 실패 시 Yahoo (한국 티커: {CODE}.KS 또는 .KQ)
    try {
      const suffix = ticker.startsWith('A') ? '.KQ' : '.KS';
      const yTicker = ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? ticker : ticker + suffix;
      const candles = await fetchYahooCandles(yTicker, timeframe, 5000);
      if (candles.length > 10) return candles;
    } catch (e) {
      errors.push(`Yahoo KR: ${e instanceof Error ? e.message : e}`);
    }
  } else {
    // 미국주식: Alpha Vantage → Yahoo US 폴백
    try {
      const candles = await fetchAlphaVantageCandles(ticker, timeframe, 3000);
      if (candles.length > 30) return candles;
    } catch (e) {
      errors.push(`AlphaVantage: ${e instanceof Error ? e.message : e}`);
    }

    try {
      const candles = await fetchYahooCandles(ticker, timeframe, 5000);
      if (candles.length > 10) return candles;
    } catch (e) {
      errors.push(`Yahoo US: ${e instanceof Error ? e.message : e}`);
    }
  }

  throw new Error(`[${ticker}] 모든 데이터 소스 실패: ${errors.join(' | ')}`);
}
