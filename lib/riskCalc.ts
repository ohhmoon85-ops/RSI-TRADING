/**
 * 손절/익절가 자동 계산 모듈
 */

export interface RiskLevels {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
}

/**
 * 매수 포지션 손익 계산
 * @param entryPrice 진입가 (종가)
 * @param stopLossPrice 손절가 (BB 하단 or 전저점)
 * @param rrRatio 손익비 (기본 2.0 = 1:2)
 */
export function calcBuyRisk(
  entryPrice: number,
  stopLossPrice: number,
  rrRatio = 2.0
): RiskLevels {
  const riskAmount = entryPrice - stopLossPrice;
  const rewardAmount = riskAmount * rrRatio;
  const takeProfit = entryPrice + rewardAmount;

  return {
    entryPrice,
    stopLoss: Math.max(stopLossPrice, 0),
    takeProfit,
    riskAmount,
    rewardAmount,
    riskRewardRatio: rrRatio,
  };
}

/**
 * 매도(숏) 포지션 손익 계산
 * @param entryPrice 진입가
 * @param stopLossPrice 손절가 (직전 고점)
 * @param rrRatio 손익비 (기본 1.0 = 1:1)
 */
export function calcSellRisk(
  entryPrice: number,
  stopLossPrice: number,
  rrRatio = 1.0
): RiskLevels {
  const riskAmount = stopLossPrice - entryPrice;
  const rewardAmount = riskAmount * rrRatio;
  const takeProfit = entryPrice - rewardAmount;

  return {
    entryPrice,
    stopLoss: stopLossPrice,
    takeProfit: Math.max(takeProfit, 0),
    riskAmount,
    rewardAmount,
    riskRewardRatio: rrRatio,
  };
}

/**
 * BB 하단선과 전저점 중 더 보수적인(낮은) 값을 손절가로 사용
 */
export function selectBuyStopLoss(bbLower: number, prevLow: number): number {
  return Math.min(bbLower, prevLow);
}

/**
 * 전고점을 손절가로 사용
 */
export function selectSellStopLoss(prevHigh: number): number {
  return prevHigh;
}

/**
 * 손익비 % 계산
 */
export function calcPnLPercent(entry: number, exit: number, isBuy: boolean): number {
  if (isBuy) return ((exit - entry) / entry) * 100;
  return ((entry - exit) / entry) * 100;
}
