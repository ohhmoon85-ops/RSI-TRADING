/**
 * 핵심 스캔 엔진
 * Cron Job에서 호출. 종목별 병렬 처리 + 신호 저장
 */

import type { Signal, WatchlistItem } from '@/types';
import { fetchCandles } from '@/lib/fetchers';
import { calcIndicators } from '@/lib/indicators';
import { detectStrategyA } from '@/lib/signals/strategyA';
import { detectStrategyB } from '@/lib/signals/strategyB';
import { detectSellStrategy } from '@/lib/signals/sellStrategy';
import { shouldSendAlert } from '@/lib/notify/deduplicate';
import { sendTelegram } from '@/lib/notify/telegram';
import { sendEmail } from '@/lib/notify/email';
import { sendWebPush } from '@/lib/notify/webpush';
import { kv, KV_KEYS } from '@/lib/kv';

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

/** 단일 종목 + 타임프레임 스캔 */
async function scanOne(
  item: WatchlistItem,
  timeframe: string
): Promise<Signal[]> {
  const candles = await fetchCandles(item.ticker, item.market, timeframe);
  if (candles.length < 50) return [];

  const indicators = calcIndicators(candles, {
    rsiPeriod: 14,
    bbPeriod: DEFAULT_SETTINGS.bbPeriod,
    bbStdDev: DEFAULT_SETTINGS.bbStdDev,
    macdFast: DEFAULT_SETTINGS.macdFast,
    macdSlow: DEFAULT_SETTINGS.macdSlow,
    macdSignal: DEFAULT_SETTINGS.macdSignal,
  });

  const commonInput = {
    item,
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

  return candidates.filter((s): s is Signal => s !== null);
}

/** 신호 저장 + 알림 발송 파이프라인 */
async function processSignal(signal: Signal, item: WatchlistItem): Promise<void> {
  // 중복 방지 확인
  const canSend = await shouldSendAlert(
    signal.ticker,
    signal.timeframe,
    signal.type,
    signal.candleOpenTime
  );
  if (!canSend) return;

  // KV에 신호 저장
  await kv.set(KV_KEYS.signal(signal.id), signal, { ex: 30 * 86400 }); // 30일 TTL

  // 신호 목록 업데이트 (최신 100개 유지)
  const list = (await kv.get<string[]>(KV_KEYS.signalList())) ?? [];
  list.unshift(signal.id);
  if (list.length > 100) list.splice(100);
  await kv.set(KV_KEYS.signalList(), list);

  // 알림 발송 (설정에 따라)
  const tasks: Promise<void>[] = [];

  if (item.notifyTelegram) {
    tasks.push(sendTelegram(signal).catch((e) => console.error('[Telegram]', e)));
  }
  if (item.notifyPush) {
    tasks.push(sendWebPush(signal).catch((e) => console.error('[WebPush]', e)));
  }
  if (item.notifyEmail) {
    tasks.push(sendEmail(signal).catch((e) => console.error('[Email]', e)));
  }

  await Promise.allSettled(tasks);
}

/** 전체 위시리스트 병렬 스캔 */
export async function runScan(): Promise<{ processed: number; signals: number; errors: string[] }> {
  const watchlist = (await kv.get<WatchlistItem[]>(KV_KEYS.watchlist())) ?? [];

  if (watchlist.length === 0) {
    return { processed: 0, signals: 0, errors: [] };
  }

  // 배치 분할 로직 (20종목 초과 시)
  const BATCH_SIZE = 20;
  let batch = watchlist;

  if (watchlist.length > BATCH_SIZE) {
    const batchIdx = (await kv.get<number>(KV_KEYS.batchIndex())) ?? 0;
    const totalBatches = Math.ceil(watchlist.length / BATCH_SIZE);
    const start = batchIdx * BATCH_SIZE;
    batch = watchlist.slice(start, start + BATCH_SIZE);
    await kv.set(KV_KEYS.batchIndex(), (batchIdx + 1) % totalBatches);
  }

  const errors: string[] = [];
  let signalCount = 0;

  // Promise.all 병렬 처리
  const scanTasks = batch.flatMap((item) =>
    item.timeframes.map(async (tf) => {
      try {
        const signals = await scanOne(item, tf);
        for (const signal of signals) {
          await processSignal(signal, item);
          signalCount++;
        }
      } catch (e) {
        const msg = `[${item.ticker}/${tf}] ${e instanceof Error ? e.message : e}`;
        errors.push(msg);
        console.error(msg);
      }
    })
  );

  await Promise.allSettled(scanTasks);

  return { processed: batch.length, signals: signalCount, errors };
}
