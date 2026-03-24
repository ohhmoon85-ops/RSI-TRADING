/**
 * 전략 A — 역추세 반전 (쌍바닥 + 상승 장악형)
 * RSI ≤ 30 + BB 하단 이탈 + 쌍바닥 + 상승 장악형 음봉
 */

import type { Candle, Signal, WatchlistItem } from '@/types';
import type { BBResult, MACDResult } from '@/lib/indicators';
import {
  isRSIDeadZone,
  getBBPosition,
  getMACDCross,
  lastOne,
} from '@/lib/indicators';
import { isBullishEngulfing, findDoubleBottom } from '@/lib/candlePatterns';
import { calcBuyRisk, selectBuyStopLoss } from '@/lib/riskCalc';
import { nanoid } from 'nanoid';

interface StrategyAInput {
  item: WatchlistItem;
  candles: Candle[];
  rsi: number[];
  bb: BBResult[];
  macd: MACDResult[];
  timeframe: string;
  rrRatio?: number;
  rsiBuyThreshold?: number;
}

export function detectStrategyA(input: StrategyAInput): Signal | null {
  const { item, candles, rsi, bb, timeframe, rrRatio = 2.0, rsiBuyThreshold = 30 } = input;

  if (candles.length < 30 || rsi.length < 2 || bb.length < 2) return null;

  const currRSI = lastOne(rsi);
  if (currRSI === undefined) return null;

  // Step 1: RSI 과매도 필터
  if (currRSI > rsiBuyThreshold) return null;

  // RSI 횡보 구간 절대 금지
  if (isRSIDeadZone(currRSI)) return null;

  const currBB = lastOne(bb);
  if (!currBB) return null;

  const currCandle = lastOne(candles)!;
  const prevCandle = candles[candles.length - 2];

  // Step 2: BB 하단 과확장 확인
  const bbPos = getBBPosition(currCandle.close, currBB);
  if (bbPos !== 'BELOW_LOWER') return null;

  // Step 3: 상승 장악형 캔들 확인
  if (!isBullishEngulfing(prevCandle, currCandle)) return null;

  // Step 4: 쌍바닥 패턴 확인
  const bbLowers = bb.map((b) => b.lower);
  const doubleBottom = findDoubleBottom(candles, bbLowers);
  if (!doubleBottom.found) return null;

  // Step 4 조건: 2차 저점 ≥ BB 하단 (밴드 내부 안착)
  const secondLowCandle = candles[doubleBottom.secondLowIdx];
  if (!secondLowCandle) return null;

  const secondLowBB = bb[doubleBottom.secondLowIdx];
  if (!secondLowBB) return null;
  if (secondLowCandle.low < secondLowBB.lower) return null;

  // 진입가 = 현재 종가
  const entryPrice = currCandle.close;

  // 손절: BB 하단 vs 전저점 중 낮은 값
  const prevLow = Math.min(...candles.slice(-5).map((c) => c.low));
  const stopLoss = selectBuyStopLoss(currBB.lower, prevLow);

  // 익절 계산
  const risk = calcBuyRisk(entryPrice, stopLoss, rrRatio);

  // MACD 상태
  const prevMACD = input.macd[input.macd.length - 2];
  const currMACD = lastOne(input.macd);
  const macdCross = prevMACD && currMACD ? getMACDCross(prevMACD, currMACD) : 'NONE';

  const signal: Signal = {
    id: nanoid(),
    ticker: item.ticker,
    market: item.market,
    timeframe: timeframe as Signal['timeframe'],
    type: 'BUY_A',
    strategy: '전략 A — 역추세 반전 (쌍바닥)',
    entryPrice,
    stopLoss: risk.stopLoss,
    takeProfit: risk.takeProfit,
    riskRewardRatio: rrRatio,
    rsi: currRSI,
    bbPosition: bbPos,
    macdCross,
    candleOpenTime: currCandle.time,
    createdAt: Date.now(),
    status: 'ACTIVE',
    step: 4,
  };

  return signal;
}
