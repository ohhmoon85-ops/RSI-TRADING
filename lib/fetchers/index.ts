/**
 * 데이터 소스 — KIS 전용 (한국주식)
 */

import type { Candle } from '@/types';
import { fetchKISCandles } from './kis';

export async function fetchCandles(
  ticker: string,
  timeframe: string
): Promise<Candle[]> {
  return fetchKISCandles(ticker, timeframe, 5000);
}
