/**
 * 중복 알림 방지 — 캔들 잠금 메커니즘
 * KV에 마지막 알림 캔들 오픈 타임 저장
 * 동일 캔들 내 재발화 차단
 */

import { kv, KV_KEYS, TF_TTL } from '@/lib/kv';

/**
 * 알림 발송 가능 여부 확인
 * @returns true = 발송 가능, false = 중복 차단
 */
export async function shouldSendAlert(
  ticker: string,
  timeframe: string,
  strategy: string,
  candleOpenTime: number
): Promise<boolean> {
  const key = KV_KEYS.alertLock(ticker, timeframe, strategy);
  const lastSent = await kv.get<number>(key);

  // 동일 캔들의 오픈 타임이면 차단
  if (lastSent === candleOpenTime) return false;

  // 새 캔들 → TTL과 함께 저장
  const ttl = TF_TTL[timeframe] ?? 900;
  await kv.set(key, candleOpenTime, { ex: ttl });
  return true;
}

/**
 * 알림 잠금 강제 초기화 (테스트용)
 */
export async function clearAlertLock(
  ticker: string,
  timeframe: string,
  strategy: string
): Promise<void> {
  const key = KV_KEYS.alertLock(ticker, timeframe, strategy);
  await kv.del(key);
}
