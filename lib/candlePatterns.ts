/**
 * 캔들 패턴 판별 모듈
 * 장악형 캔들(Engulfing) 중심
 */

import type { Candle } from '@/types';

/** 캔들 몸통 크기 */
export function bodySize(c: Candle): number {
  return Math.abs(c.close - c.open);
}

/** 캔들이 양봉인지 */
export function isBullish(c: Candle): boolean {
  return c.close > c.open;
}

/** 캔들이 음봉인지 */
export function isBearish(c: Candle): boolean {
  return c.close < c.open;
}

/**
 * 상승 장악형 (Bullish Engulfing)
 * 현재 양봉 몸통이 직전 음봉 몸통을 완전히 감쌉니다.
 * curr.open <= prev.close AND curr.close >= prev.open
 */
export function isBullishEngulfing(prev: Candle, curr: Candle): boolean {
  if (!isBearish(prev) || !isBullish(curr)) return false;
  return curr.open <= prev.close && curr.close >= prev.open;
}

/**
 * 하락 장악형 (Bearish Engulfing)
 * 현재 음봉 몸통이 직전 양봉 몸통을 완전히 감쌉니다.
 * curr.open >= prev.close AND curr.close <= prev.open
 */
export function isBearishEngulfing(prev: Candle, curr: Candle): boolean {
  if (!isBullish(prev) || !isBearish(curr)) return false;
  return curr.open >= prev.close && curr.close <= prev.open;
}

/**
 * 도지 캔들 (Doji)
 * 몸통이 전체 범위의 10% 이하
 */
export function isDoji(c: Candle, threshold = 0.1): boolean {
  const range = c.high - c.low;
  if (range === 0) return true;
  return bodySize(c) / range <= threshold;
}

/**
 * 망치형 캔들 (Hammer) - 매수 반전
 * 아래 꼬리가 몸통의 2배 이상, 위 꼬리 없거나 짧음
 */
export function isHammer(c: Candle): boolean {
  const body = bodySize(c);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  if (body === 0) return false;
  return lowerWick >= body * 2 && upperWick <= body * 0.5;
}

/**
 * 역망치형 캔들 (Inverted Hammer) - 매수 반전
 */
export function isInvertedHammer(c: Candle): boolean {
  const body = bodySize(c);
  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  if (body === 0) return false;
  return upperWick >= body * 2 && lowerWick <= body * 0.5;
}

/**
 * 유성형 캔들 (Shooting Star) - 매도 반전
 */
export function isShootingStar(c: Candle): boolean {
  return isBearish(c) && isInvertedHammer(c);
}

/**
 * 최근 N개 캔들에서 쌍바닥 패턴 탐지
 * 두 번의 저점 확인, 두 번째 저점이 첫 번째보다 높거나 같아야 함
 */
export interface DoubleBottomResult {
  found: boolean;
  firstLowIdx: number;
  secondLowIdx: number;
  firstLow: number;
  secondLow: number;
}

export function findDoubleBottom(
  candles: Candle[],
  bbLowers: number[],
  lookback = 30
): DoubleBottomResult {
  const slice = candles.slice(-lookback);
  const bbSlice = bbLowers.slice(-lookback);
  const len = slice.length;

  let firstLowIdx = -1;
  let firstLow = Infinity;

  // 1차 저점 찾기: BB 하단 이탈 후 반등한 저점
  for (let i = 0; i < len - 5; i++) {
    if (slice[i].low < bbSlice[i] && slice[i].low < firstLow) {
      firstLow = slice[i].low;
      firstLowIdx = i;
    }
  }

  if (firstLowIdx < 0) return { found: false, firstLowIdx: -1, secondLowIdx: -1, firstLow: 0, secondLow: 0 };

  // 2차 저점 찾기: 첫 번째 이후 구간, BB 내부에서 형성
  let secondLowIdx = -1;
  let secondLow = Infinity;

  for (let i = firstLowIdx + 3; i < len; i++) {
    // 두 번째 저점은 BB 내부에서 형성 (이미 반등)
    if (slice[i].low >= bbSlice[i] && slice[i].low <= secondLow) {
      secondLow = slice[i].low;
      secondLowIdx = i;
    }
  }

  if (secondLowIdx < 0) return { found: false, firstLowIdx, secondLowIdx: -1, firstLow, secondLow: 0 };

  // 두 번째 저점이 첫 번째보다 높거나 같아야 함 (가격 다이버전스)
  const found = secondLow >= firstLow;
  return { found, firstLowIdx, secondLowIdx, firstLow, secondLow };
}

/**
 * 최근 N개 캔들에서 쌍봉 패턴 탐지
 */
export interface DoubleTopResult {
  found: boolean;
  firstHighIdx: number;
  secondHighIdx: number;
  firstHigh: number;
  secondHigh: number;
}

export function findDoubleTop(
  candles: Candle[],
  bbUppers: number[],
  lookback = 30
): DoubleTopResult {
  const slice = candles.slice(-lookback);
  const bbSlice = bbUppers.slice(-lookback);
  const len = slice.length;

  let firstHighIdx = -1;
  let firstHigh = -Infinity;

  for (let i = 0; i < len - 5; i++) {
    if (slice[i].high > bbSlice[i] && slice[i].high > firstHigh) {
      firstHigh = slice[i].high;
      firstHighIdx = i;
    }
  }

  if (firstHighIdx < 0) return { found: false, firstHighIdx: -1, secondHighIdx: -1, firstHigh: 0, secondHigh: 0 };

  let secondHighIdx = -1;
  let secondHigh = -Infinity;

  for (let i = firstHighIdx + 3; i < len; i++) {
    if (slice[i].high <= bbSlice[i] && slice[i].high > secondHigh) {
      secondHigh = slice[i].high;
      secondHighIdx = i;
    }
  }

  if (secondHighIdx < 0) return { found: false, firstHighIdx, secondHighIdx: -1, firstHigh, secondHigh: 0 };

  const found = secondHigh <= firstHigh;
  return { found, firstHighIdx, secondHighIdx, firstHigh, secondHigh };
}
