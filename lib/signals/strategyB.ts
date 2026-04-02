/**
 * 전략 B — 상승 다이버전스 + MACD 골든크로스
 */

import type { Candle, Signal, WatchlistItem } from '@/types';
import type { BBResult, MACDResult } from '@/lib/indicators';
import { isRSIDeadZone, getBBPosition, getMACDCross, lastOne } from '@/lib/indicators';
import { isBullishEngulfing, isHammer } from '@/lib/candlePatterns';
import { findBullishDivergence } from '@/lib/divergence';
import { calcBuyRisk } from '@/lib/riskCalc';
import { nanoid } from 'nanoid';

interface StrategyBInput {
  item: WatchlistItem;
  candles: Candle[];
  rsi: number[];
  bb: BBResult[];
  macd: MACDResult[];
  timeframe: string;
  rrRatio?: number;
  rsiBuyThreshold?: number;
}

export function detectStrategyB(input: StrategyBInput): Signal | null {
  const { item, candles, rsi, bb, macd, timeframe, rrRatio = 2.0 } = input;

  if (candles.length < 30 || rsi.length < 5 || macd.length < 2) return null;

  const currRSI = lastOne(rsi);
  if (currRSI === undefined) return null;

  // RSI 횡보 구간 금지
  if (isRSIDeadZone(currRSI)) return null;

  // Step 1: 상승 다이버전스 탐지 (lookback 40으로 확대)
  const divergence = findBullishDivergence(candles, rsi, 40);
  if (!divergence.found) return null;

  // Step 2: MACD 골든크로스 또는 골든 상태 유지 확인 (완화)
  const prevMACD = macd[macd.length - 2];
  const currMACD = lastOne(macd);
  if (!prevMACD || !currMACD) return null;

  const macdCross = getMACDCross(prevMACD, currMACD);
  // 이번 캔들에서 골든크로스이거나, 이미 골든 상태(MACD > Signal)이면 통과
  const isMacdBullish = macdCross === 'GOLDEN' || currMACD.MACD > currMACD.signal;
  if (!isMacdBullish) return null;

  // Step 3: 상승 장악형 또는 망치형 캔들 확인 (완화: 망치형 추가)
  const currCandle = lastOne(candles)!;
  const prevCandle = candles[candles.length - 2];
  if (!isBullishEngulfing(prevCandle, currCandle) && !isHammer(currCandle)) return null;

  const currBB = lastOne(bb);
  if (!currBB) return null;

  const bbPos = getBBPosition(currCandle.close, currBB);

  const entryPrice = currCandle.close;
  const prevLow = Math.min(...candles.slice(-10).map((c) => c.low));
  const stopLoss = prevLow * 0.999; // 전저점 약간 아래

  const risk = calcBuyRisk(entryPrice, stopLoss, rrRatio);

  const signal: Signal = {
    id: nanoid(),
    ticker: item.ticker,
    market: item.market,
    timeframe: timeframe as Signal['timeframe'],
    type: 'BUY_B',
    strategy: '전략 B — 다이버전스 + MACD 골든크로스',
    entryPrice,
    stopLoss: risk.stopLoss,
    takeProfit: risk.takeProfit,
    riskRewardRatio: rrRatio,
    rsi: currRSI,
    bbPosition: bbPos,
    macdCross: 'GOLDEN',
    candleOpenTime: currCandle.time,
    createdAt: Date.now(),
    status: 'ACTIVE',
    step: 3,
  };

  return signal;
}
