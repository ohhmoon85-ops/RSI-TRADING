// ============================================================
// 전역 타입 정의
// ============================================================

export type Market = 'KR';
export type Timeframe = '5m' | '15m' | '1h' | '1d';
export type SignalType = 'BUY_A' | 'BUY_B' | 'SELL';
export type SignalStatus = 'ACTIVE' | 'TP_HIT' | 'SL_HIT' | 'EXPIRED' | 'PENDING';

/** OHLCV 캔들 데이터 */
export interface Candle {
  time: number;       // Unix timestamp (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 지표 계산 결과 */
export interface Indicators {
  rsi: number[];
  bb: Array<{ upper: number; middle: number; lower: number }>;
  macd: Array<{ MACD: number; signal: number; histogram: number }>;
}

/** 신호 객체 */
export interface Signal {
  id: string;
  ticker: string;
  market: Market;
  timeframe: Timeframe;
  type: SignalType;
  strategy: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  rsi: number;
  bbPosition: 'ABOVE_UPPER' | 'BELOW_LOWER' | 'INSIDE';
  macdCross: 'GOLDEN' | 'DEAD' | 'NONE';
  candleOpenTime: number;
  createdAt: number;
  status: SignalStatus;
  step: number;         // 1~4단계 진행
  note?: string;
  result?: 'WIN' | 'LOSS' | 'HOLD';
  pnlPercent?: number;
}

/** 위시리스트 종목 */
export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  market: Market;
  timeframes: Timeframe[];
  notifyTelegram: boolean;
  notifyPush: boolean;
  notifyEmail: boolean;
  createdAt: number;
}

/** 사용자 설정 */
export interface Settings {
  rsiBuyThreshold: number;      // 기본 30
  rsiSellThreshold: number;     // 기본 70
  rsiDeadZoneLow: number;       // 기본 40
  rsiDeadZoneHigh: number;      // 기본 60
  bbPeriod: number;             // 기본 20
  bbStdDev: number;             // 기본 2
  macdFast: number;             // 기본 12
  macdSlow: number;             // 기본 26
  macdSignal: number;           // 기본 9
  defaultRR: number;            // 기본 2 (1:2)
  telegramBotToken: string;
  telegramChatId: string;
  resendApiKey: string;
  alertEmail: string;
  webPushPublicKey: string;
  webPushPrivateKey: string;
}

/** 전략 통계 */
export interface StrategyStats {
  strategy: SignalType;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  avgRR: number;
}

/** Cron 실행 결과 */
export interface CronResult {
  processed: number;
  signals: number;
  errors: string[];
  durationMs: number;
}
