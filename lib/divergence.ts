/**
 * RSI 다이버전스 탐지 모듈
 */

import type { Candle } from '@/types';

export interface DivergenceResult {
  found: boolean;
  type: 'BULLISH' | 'BEARISH' | 'NONE';
  firstIdx: number;
  secondIdx: number;
  firstPriceLow: number;
  secondPriceLow: number;
  firstRSILow: number;
  secondRSILow: number;
}

/**
 * 상승 다이버전스 (Bullish Divergence)
 * 주가 저점은 낮아지는데 RSI 저점은 높아지는 패턴
 * 탐색 윈도우: 최근 lookback 개 캔들
 */
export function findBullishDivergence(
  candles: Candle[],
  rsiValues: number[],
  lookback = 30
): DivergenceResult {
  const minLen = Math.min(candles.length, rsiValues.length);
  const start = Math.max(0, minLen - lookback);

  const priceSlice = candles.slice(start);
  const rsiSlice = rsiValues.slice(start);
  const len = priceSlice.length;

  if (len < 10) {
    return { found: false, type: 'NONE', firstIdx: -1, secondIdx: -1, firstPriceLow: 0, secondPriceLow: 0, firstRSILow: 0, secondRSILow: 0 };
  }

  // 로컬 저점 찾기 (양쪽 캔들보다 낮은 점)
  const localLows: Array<{ idx: number; price: number; rsi: number }> = [];

  for (let i = 2; i < len - 2; i++) {
    const price = priceSlice[i].low;
    if (
      price < priceSlice[i - 1].low &&
      price < priceSlice[i - 2].low &&
      price < priceSlice[i + 1].low &&
      price < priceSlice[i + 2].low &&
      rsiSlice[i] !== undefined
    ) {
      localLows.push({ idx: i, price, rsi: rsiSlice[i] });
    }
  }

  if (localLows.length < 2) {
    return { found: false, type: 'NONE', firstIdx: -1, secondIdx: -1, firstPriceLow: 0, secondPriceLow: 0, firstRSILow: 0, secondRSILow: 0 };
  }

  // 가장 최근 두 개의 로컬 저점으로 다이버전스 확인
  const second = localLows[localLows.length - 1];
  const first = localLows[localLows.length - 2];

  // 가격은 낮아지고, RSI는 높아지면 상승 다이버전스
  const found = second.price < first.price && second.rsi > first.rsi;

  return {
    found,
    type: found ? 'BULLISH' : 'NONE',
    firstIdx: first.idx + start,
    secondIdx: second.idx + start,
    firstPriceLow: first.price,
    secondPriceLow: second.price,
    firstRSILow: first.rsi,
    secondRSILow: second.rsi,
  };
}

/**
 * 하락 다이버전스 (Bearish Divergence)
 * 주가 고점은 높아지는데 RSI 고점은 낮아지는 패턴
 */
export function findBearishDivergence(
  candles: Candle[],
  rsiValues: number[],
  lookback = 30
): DivergenceResult {
  const minLen = Math.min(candles.length, rsiValues.length);
  const start = Math.max(0, minLen - lookback);

  const priceSlice = candles.slice(start);
  const rsiSlice = rsiValues.slice(start);
  const len = priceSlice.length;

  if (len < 10) {
    return { found: false, type: 'NONE', firstIdx: -1, secondIdx: -1, firstPriceLow: 0, secondPriceLow: 0, firstRSILow: 0, secondRSILow: 0 };
  }

  const localHighs: Array<{ idx: number; price: number; rsi: number }> = [];

  for (let i = 2; i < len - 2; i++) {
    const price = priceSlice[i].high;
    if (
      price > priceSlice[i - 1].high &&
      price > priceSlice[i - 2].high &&
      price > priceSlice[i + 1].high &&
      price > priceSlice[i + 2].high &&
      rsiSlice[i] !== undefined
    ) {
      localHighs.push({ idx: i, price, rsi: rsiSlice[i] });
    }
  }

  if (localHighs.length < 2) {
    return { found: false, type: 'NONE', firstIdx: -1, secondIdx: -1, firstPriceLow: 0, secondPriceLow: 0, firstRSILow: 0, secondRSILow: 0 };
  }

  const second = localHighs[localHighs.length - 1];
  const first = localHighs[localHighs.length - 2];

  const found = second.price > first.price && second.rsi < first.rsi;

  return {
    found,
    type: found ? 'BEARISH' : 'NONE',
    firstIdx: first.idx + start,
    secondIdx: second.idx + start,
    firstPriceLow: first.price,
    secondPriceLow: second.price,
    firstRSILow: first.rsi,
    secondRSILow: second.rsi,
  };
}
