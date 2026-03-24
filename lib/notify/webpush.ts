/**
 * Web Push 알림 (PWA)
 * web-push 패키지 사용
 */

import type { Signal } from '@/types';
import { kv } from '@/lib/kv';

const SUBSCRIPTION_KEY = 'webpush:subscriptions';

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** 구독 정보 저장 */
export async function savePushSubscription(sub: PushSubscriptionData): Promise<void> {
  const subs = (await kv.get<PushSubscriptionData[]>(SUBSCRIPTION_KEY)) ?? [];
  const exists = subs.some((s) => s.endpoint === sub.endpoint);
  if (!exists) {
    subs.push(sub);
    await kv.set(SUBSCRIPTION_KEY, subs);
  }
}

/** 구독 정보 삭제 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const subs = (await kv.get<PushSubscriptionData[]>(SUBSCRIPTION_KEY)) ?? [];
  const updated = subs.filter((s) => s.endpoint !== endpoint);
  await kv.set(SUBSCRIPTION_KEY, updated);
}

/** 모든 구독자에게 푸시 발송 */
export async function sendWebPush(signal: Signal): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    console.warn('[WebPush] VAPID 키 미설정');
    return;
  }

  const subs = (await kv.get<PushSubscriptionData[]>(SUBSCRIPTION_KEY)) ?? [];
  if (subs.length === 0) return;

  // web-push는 Node.js 전용 — dynamic import
  const webpush = await import('web-push');
  webpush.setVapidDetails(vapidEmail, publicKey, privateKey);

  const payload = JSON.stringify({
    title: `${signal.type === 'SELL' ? '🔴 매도' : '🟢 매수'} — ${signal.ticker}`,
    body: `${signal.strategy} | 진입가: ${signal.entryPrice.toFixed(2)} | RSI: ${signal.rsi.toFixed(1)}`,
    data: { signalId: signal.id },
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      ).catch(async (err) => {
        // 410 Gone = 구독 만료 → 삭제
        if (err.statusCode === 410) {
          await removePushSubscription(sub.endpoint);
        }
      })
    )
  );
}
