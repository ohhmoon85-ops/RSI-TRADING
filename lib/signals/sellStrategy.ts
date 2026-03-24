/**
 * 매도 전략 — 쌍봉 + 하락 장악형
 * RSI ≥ 70 + BB 상단 이탈 + 쌍봉 + 하락 장악형
 */

import type { Candle, Signal, WatchlistItem } from '@/types';
import type { BBResult, MACDResult } from '@/lib/indicators';
import { isRSIDeadZone, getBBPosition, getMACDCross, lastOne } from '@/lib/indicators';
import { isBearishEngulfing, findDoubleTop } from '@/lib/candlePatterns';
import { calcSellRisk, selectSellStopLoss } from '@/lib/riskCalc';
import { nanoid } from 'nanoid';

interface SellStrategyInput {
  item: WatchlistItem;
  candles: Candle[];
  rsi: number[];
  bb: BBResult[];
  macd: MACDResult[];
  timeframe: string;
  rrRatio?: number;
  rsiSellThreshold?: number;
}

export function detectSellStrategy(input: SellStrategyInput): Signal | null {
  const { item, candles, rsi, bb, macd, timeframe, rrRatio = 1.0, rsiSellThreshold = 70 } = input;

  if (candles.length < 30 || rsi.length < 2 || bb.length < 2) return null;

  const currRSI = lastOne(rsi);
  if (currRSI === undefined) return null;

  // Step 1: RSI 과매수 필터
  if (currRSI < rsiSellThreshold) return null;
  if (isRSIDeadZone(currRSI)) return null;

  const currBB = lastOne(bb);
  if (!currBB) return null;

  const currCandle = lastOne(candles)!;
  const prevCandle = candles[candles.length - 2];

  // Step 2: BB 상단 이탈 확인
  const bbPos = getBBPosition(currCandle.close, currBB);
  if (bbPos !== 'ABOVE_UPPER') return null;

  // Step 3: 쌍봉 확인
  const bbUppers = bb.map((b) => b.upper);
  const doubleTop = findDoubleTop(candles, bbUppers);
  if (!doubleTop.found) return null;

  // 두 번째 고점이 BB 상단 내부에서 형성되어야 함
  const secondHighCandle = candles[doubleTop.secondHighIdx];
  if (!secondHighCandle) return null;

  // Step 4: 하락 장악형 확인
  if (!isBearishEngulfing(prevCandle, currCandle)) return null;

  // 손절: 직전 최고점
  const prevHigh = Math.max(...candles.slice(-5).map((c) => c.high));
  const stopLoss = selectSellStopLoss(prevHigh);

  const entryPrice = currCandle.close;
  const risk = calcSellRisk(entryPrice, stopLoss, rrRatio);

  // MACD
  const prevMACD = macd[macd.length - 2];
  const currMACD = lastOne(macd);
  const macdCross = prevMACD && currMACD ? getMACDCross(prevMACD, currMACD) : 'NONE';

  const signal: Signal = {
    id: nanoid(),
    ticker: item.ticker,
    market: item.market,
    timeframe: timeframe as Signal['timeframe'],
    type: 'SELL',
    strategy: '매도 전략 — 쌍봉 + 하락 장악형',
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
