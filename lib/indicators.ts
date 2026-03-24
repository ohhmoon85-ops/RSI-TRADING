/**
 * 기술적 지표 계산 모듈
 * technicalindicators 패키지 기반
 */

import type { Candle, Indicators } from '@/types';

// technicalindicators는 CommonJS 모듈
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ti = require('technicalindicators');

export interface RSIResult {
  value: number;
  index: number;
}

export interface BBResult {
  upper: number;
  middle: number;
  lower: number;
}

export interface MACDResult {
  MACD: number;
  signal: number;
  histogram: number;
}

/** RSI 계산 */
export function calcRSI(closes: number[], period = 14): number[] {
  return ti.RSI.calculate({ period, values: closes });
}

/** 볼린저 밴드 계산 */
export function calcBB(closes: number[], period = 20, stdDev = 2): BBResult[] {
  return ti.BollingerBands.calculate({ period, stdDev, values: closes });
}

/** MACD 계산 */
export function calcMACD(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult[] {
  return ti.MACD.calculate({
    fastPeriod,
    slowPeriod,
    signalPeriod,
    values: closes,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });
}

/** 전체 지표 한 번에 계산 */
export function calcIndicators(
  candles: Candle[],
  options?: {
    rsiPeriod?: number;
    bbPeriod?: number;
    bbStdDev?: number;
    macdFast?: number;
    macdSlow?: number;
    macdSignal?: number;
  }
): Indicators {
  const closes = candles.map((c) => c.close);

  const rsi = calcRSI(closes, options?.rsiPeriod ?? 14);
  const bb = calcBB(closes, options?.bbPeriod ?? 20, options?.bbStdDev ?? 2);
  const macd = calcMACD(
    closes,
    options?.macdFast ?? 12,
    options?.macdSlow ?? 26,
    options?.macdSignal ?? 9
  );

  return { rsi, bb, macd };
}

/** RSI 횡보 구간 필터 (40~60) */
export function isRSIDeadZone(
  rsi: number,
  low = 40,
  high = 60
): boolean {
  return rsi > low && rsi < high;
}

/** BB 위치 판별 */
export function getBBPosition(
  close: number,
  bb: BBResult
): 'ABOVE_UPPER' | 'BELOW_LOWER' | 'INSIDE' {
  if (close >= bb.upper) return 'ABOVE_UPPER';
  if (close <= bb.lower) return 'BELOW_LOWER';
  return 'INSIDE';
}

/** MACD 크로스 방향 판별 */
export function getMACDCross(
  prev: MACDResult,
  curr: MACDResult
): 'GOLDEN' | 'DEAD' | 'NONE' {
  if (
    prev.MACD !== undefined &&
    curr.MACD !== undefined &&
    prev.signal !== undefined &&
    curr.signal !== undefined
  ) {
    if (prev.MACD < prev.signal && curr.MACD > curr.signal) return 'GOLDEN';
    if (prev.MACD > prev.signal && curr.MACD < curr.signal) return 'DEAD';
  }
  return 'NONE';
}

/** 배열 마지막 N개 요소 */
export function last<T>(arr: T[], n = 1): T[] {
  return arr.slice(-n);
}

/** 배열 마지막 요소 */
export function lastOne<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}
