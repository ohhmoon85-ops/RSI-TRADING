/**
 * 텔레그램 봇 알림
 */

import type { Signal } from '@/types';

function formatPrice(price: number, market: string): string {
  if (market === 'KR') return `₩${price.toLocaleString('ko-KR')}`;
  return `$${price.toFixed(2)}`;
}

function formatSignalMessage(signal: Signal): string {
  const emoji = signal.type === 'SELL' ? '🔴' : '🟢';
  const typeLabel = signal.type === 'SELL' ? '매도 신호' : '매수 신호';
  const entry = formatPrice(signal.entryPrice, signal.market);
  const sl = formatPrice(signal.stopLoss, signal.market);
  const tp = formatPrice(signal.takeProfit, signal.market);
  const time = new Date(signal.createdAt).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return [
    `${emoji} [${typeLabel}] ${signal.ticker} — ${signal.strategy}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📌 타임프레임: ${signal.timeframe}`,
    `💰 진입가: ${entry}`,
    `🛑 손절가: ${sl}`,
    `🎯 익절가: ${tp} (1:${signal.riskRewardRatio})`,
    `📊 RSI: ${signal.rsi.toFixed(1)} | BB위치: ${signal.bbPosition === 'BELOW_LOWER' ? '하단 이탈' : signal.bbPosition === 'ABOVE_UPPER' ? '상단 이탈' : '내부'}`,
    `⏰ 발생시각: ${time} KST`,
  ].join('\n');
}

export async function sendTelegram(signal: Signal): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] 설정 미완료 (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)');
    return;
  }

  const text = formatSignalMessage(signal);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram 발송 실패: ${err}`);
  }
}

/** 텍스트 메시지 직접 발송 */
export async function sendTelegramText(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
}
