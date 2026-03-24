/**
 * 데이터 소스 우선순위 체인 (한국주식 전용)
 * KIS (P1) → Yahoo KR (Fallback)
 */

import type { Candle } from '@/types';
import { fetchKISCandles } from './kis';
import { fetchYahooCandles } from './yahoo';

export async function fetchCandles(
  ticker: string,
  timeframe: string
): Promise<Candle[]> {
  const errors: string[] = [];

  // P1: 한국투자증권 KIS
  try {
    const candles = await fetchKISCandles(ticker, timeframe, 3000);
    if (candles.length > 30) return candles;
  } catch (e) {
    errors.push(`KIS: ${e instanceof Error ? e.message : e}`);
  }

  // Fallback: Yahoo Finance (코스피 .KS / 코스닥 .KQ)
  try {
    const suffix = ticker.startsWith('A') ? '.KQ' : '.KS';
    const yTicker = ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? ticker : ticker + suffix;
    const candles = await fetchYahooCandles(yTicker, timeframe, 5000);
    if (candles.length > 10) return candles;
  } catch (e) {
    errors.push(`Yahoo KR: ${e instanceof Error ? e.message : e}`);
  }

  throw new Error(`[${ticker}] 모든 데이터 소스 실패: ${errors.join(' | ')}`);
}
