/**
 * 핵심 스캔 엔진
 * Cron Job에서 호출. 유니버스 전체 종목 병렬 스캔 + 신호/결과 저장
 */

import type { Signal, ScanResult, Timeframe, WatchlistItem } from '@/types';
import { fetchCandles } from '@/lib/fetchers';
import { calcIndicators } from '@/lib/indicators';
import { detectStrategyA } from '@/lib/signals/strategyA';
import { detectStrategyB } from '@/lib/signals/strategyB';
import { detectSellStrategy } from '@/lib/signals/sellStrategy';
import { shouldSendAlert } from '@/lib/notify/deduplicate';
import { sendTelegram } from '@/lib/notify/telegram';
import { sendWebPush } from '@/lib/notify/webpush';
import { kv, KV_KEYS } from '@/lib/kv';
import { KOREA_UNIVERSE, DEFAULT_SCAN_TIMEFRAMES } from '@/lib/universe';

const DEFAULT_SETTINGS = {
  rsiBuyThreshold: 30,
  rsiSellThreshold: 70,
  bbPeriod: 20,
  bbStdDev: 2,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  defaultRR: 2.0,
};

/** 단일 종목 + 타임프레임 스캔 → ScanResult + Signal[] */
async function scanOne(
  ticker: string,
  name: string,
  sector: string,
  timeframe: string
): Promise<{ result: ScanResult; signals: Signal[] }> {
  const candles = await fetchCandles(ticker, timeframe);
  // 최소 26개 필요 (MACD slow 26 기준)
  if (candles.length < 26) {
    throw new Error(`캔들 데이터 부족 (${candles.length}개, 최소 26 필요)`);
  }

  const indicators = calcIndicators(candles, {
    rsiPeriod: 14,
    bbPeriod: DEFAULT_SETTINGS.bbPeriod,
    bbStdDev: DEFAULT_SETTINGS.bbStdDev,
    macdFast: DEFAULT_SETTINGS.macdFast,
    macdSlow: DEFAULT_SETTINGS.macdSlow,
    macdSignal: DEFAULT_SETTINGS.macdSignal,
  });

  const lastCandle = candles[candles.length - 1];
  const lastRsi = indicators.rsi[indicators.rsi.length - 1];
  const lastBb = indicators.bb[indicators.bb.length - 1];
  const lastMacd = indicators.macd[indicators.macd.length - 1];

  // BB 포지션
  const bbPosition: ScanResult['bbPosition'] =
    lastCandle.close > lastBb.upper
      ? 'ABOVE_UPPER'
      : lastCandle.close < lastBb.lower
      ? 'BELOW_LOWER'
      : 'INSIDE';

  // MACD 크로스 (전 캔들과 비교)
  const prevMacd = indicators.macd[indicators.macd.length - 2];
  let macdCross: ScanResult['macdCross'] = 'NONE';
  if (prevMacd && lastMacd) {
    if (prevMacd.MACD < prevMacd.signal && lastMacd.MACD >= lastMacd.signal) {
      macdCross = 'GOLDEN';
    } else if (prevMacd.MACD > prevMacd.signal && lastMacd.MACD <= lastMacd.signal) {
      macdCross = 'DEAD';
    }
  }

  // 가상의 WatchlistItem (유니버스 스캔용)
  const fakeItem: WatchlistItem = {
    id: `universe:${ticker}`,
    ticker,
    name,
    market: 'KR',
    timeframes: [timeframe as Timeframe],
    notifyTelegram: true,
    notifyPush: true,
    notifyEmail: false,
    createdAt: 0,
  };

  const commonInput = {
    item: fakeItem,
    candles,
    rsi: indicators.rsi,
    bb: indicators.bb,
    macd: indicators.macd,
    timeframe,
  };

  const candidates: Array<Signal | null> = [
    detectStrategyA({ ...commonInput, rsiBuyThreshold: DEFAULT_SETTINGS.rsiBuyThreshold, rrRatio: DEFAULT_SETTINGS.defaultRR }),
    detectStrategyB({ ...commonInput, rsiBuyThreshold: DEFAULT_SETTINGS.rsiBuyThreshold, rrRatio: DEFAULT_SETTINGS.defaultRR }),
    detectSellStrategy({ ...commonInput, rsiSellThreshold: DEFAULT_SETTINGS.rsiSellThreshold, rrRatio: 1.0 }),
  ];

  const detectedSignals = candidates.filter((s): s is Signal => s !== null);

  const scanResult: ScanResult = {
    ticker,
    name,
    sector,
    timeframe: timeframe as Timeframe,
    rsi: lastRsi,
    bbPosition,
    macdCross,
    signal: detectedSignals.length > 0 ? detectedSignals[0].type : null,
    price: lastCandle.close,
    scannedAt: Date.now(),
  };

  return { result: scanResult, signals: detectedSignals };
}

/** 신호 저장 + 알림 발송 */
async function processSignal(signal: Signal): Promise<void> {
  const canSend = await shouldSendAlert(
    signal.ticker,
    signal.timeframe,
    signal.type,
    signal.candleOpenTime
  );
  if (!canSend) return;

  await kv.set(KV_KEYS.signal(signal.id), signal, { ex: 30 * 86400 });

  const list = (await kv.get<string[]>(KV_KEYS.signalList())) ?? [];
  list.unshift(signal.id);
  if (list.length > 200) list.splice(200);
  await kv.set(KV_KEYS.signalList(), list);

  // 알림 (전역 설정 기반)
  const tasks: Promise<void>[] = [
    sendTelegram(signal).catch((e) => console.error('[Telegram]', e)),
    sendWebPush(signal).catch((e) => console.error('[WebPush]', e)),
  ];

  await Promise.allSettled(tasks);
}

/** 유니버스 스캔
 * @param fullScan true → 전체 57개 동시 스캔 (수동 스캔용, 60초 제한)
 *                 false → 15개 배치 순환 (Cron용, 10초 제한)
 */
export async function runScan(fullScan = false): Promise<{ processed: number; signals: number; errors: string[] }> {
  const BATCH_SIZE = 15;

  let batch = KOREA_UNIVERSE;
  if (!fullScan) {
    // 배치 인덱스로 순환
    const batchIdx = (await kv.get<number>(KV_KEYS.batchIndex())) ?? 0;
    const totalBatches = Math.ceil(KOREA_UNIVERSE.length / BATCH_SIZE);
    const start = batchIdx * BATCH_SIZE;
    batch = KOREA_UNIVERSE.slice(start, start + BATCH_SIZE);
    await kv.set(KV_KEYS.batchIndex(), (batchIdx + 1) % totalBatches);
  }

  const errors: string[] = [];
  let signalCount = 0;

  // 타임프레임별 스캔 결과 누적 (기존 결과에 merge)
  const resultsByTf: Record<string, ScanResult[]> = {};
  for (const tf of DEFAULT_SCAN_TIMEFRAMES) {
    resultsByTf[tf] = (await kv.get<ScanResult[]>(KV_KEYS.scanResults(tf))) ?? [];
  }

  // 병렬 스캔 전 토큰 미리 발급 (분당 1회 제한 대응)
  try {
    await fetchCandles('005930', '15m');
  } catch {
    // 워밍업 실패해도 계속 진행 (이미 캐시됐을 수 있음)
  }

  const scanTasks = batch.flatMap(({ ticker, name, sector }) =>
    DEFAULT_SCAN_TIMEFRAMES.map(async (tf) => {
      try {
        const { result, signals } = await scanOne(ticker, name, sector, tf);

        // 스캔 결과 업데이트 (같은 ticker+tf가 있으면 교체)
        const existing = resultsByTf[tf];
        const idx = existing.findIndex((r) => r.ticker === ticker);
        if (idx >= 0) {
          existing[idx] = result;
        } else {
          existing.push(result);
        }

        for (const signal of signals) {
          await processSignal(signal);
          signalCount++;
        }
      } catch (e) {
        const msg = `[${ticker}/${tf}] ${e instanceof Error ? e.message : e}`;
        errors.push(msg);
        console.error(msg);
      }
    })
  );

  await Promise.allSettled(scanTasks);

  // 결과 KV 저장 (TTL: 2시간 — 다음 완전 순환 내 갱신 보장)
  for (const tf of DEFAULT_SCAN_TIMEFRAMES) {
    await kv.set(KV_KEYS.scanResults(tf), resultsByTf[tf], { ex: 7200 });
  }

  return { processed: batch.length, signals: signalCount, errors };
}
