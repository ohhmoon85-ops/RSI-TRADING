/**
 * Resend 이메일 알림
 */

import type { Signal } from '@/types';

export async function sendEmail(signal: Signal): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ALERT_EMAIL;

  if (!apiKey || !toEmail) {
    console.warn('[Email] RESEND_API_KEY 또는 ALERT_EMAIL 미설정');
    return;
  }

  const typeLabel = signal.type === 'SELL' ? '매도' : '매수';
  const subject = `[RSI Alert] ${signal.ticker} ${typeLabel} 신호 — ${signal.timeframe}`;

  const html = `
    <div style="font-family: monospace; max-width: 600px; margin: 0 auto; background: #0d1421; color: #e2e8f0; padding: 24px; border-radius: 12px;">
      <h2 style="color: ${signal.type === 'SELL' ? '#ff4d6d' : '#00d4aa'}; margin-bottom: 16px;">
        ${signal.type === 'SELL' ? '🔴' : '🟢'} ${typeLabel} 신호: ${signal.ticker}
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px; color: #64748b;">전략</td><td style="padding: 8px;">${signal.strategy}</td></tr>
        <tr><td style="padding: 8px; color: #64748b;">타임프레임</td><td style="padding: 8px;">${signal.timeframe}</td></tr>
        <tr><td style="padding: 8px; color: #64748b;">진입가</td><td style="padding: 8px; color: #00d4aa;">${signal.entryPrice.toFixed(2)}</td></tr>
        <tr><td style="padding: 8px; color: #64748b;">손절가</td><td style="padding: 8px; color: #ff4d6d;">${signal.stopLoss.toFixed(2)}</td></tr>
        <tr><td style="padding: 8px; color: #64748b;">익절가</td><td style="padding: 8px; color: #0095ff;">${signal.takeProfit.toFixed(2)}</td></tr>
        <tr><td style="padding: 8px; color: #64748b;">RSI</td><td style="padding: 8px;">${signal.rsi.toFixed(1)}</td></tr>
        <tr><td style="padding: 8px; color: #64748b;">손익비</td><td style="padding: 8px;">1:${signal.riskRewardRatio}</td></tr>
        <tr><td style="padding: 8px; color: #64748b;">발생시각</td><td style="padding: 8px;">${new Date(signal.createdAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td></tr>
      </table>
      <p style="color: #64748b; font-size: 12px; margin-top: 24px;">본 신호는 참고용이며 투자 결정의 책임은 사용자에게 있습니다.</p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'RSI Alert Pro <alerts@resend.dev>',
      to: [toEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend 발송 실패: ${err}`);
  }
}

/** 일간 요약 이메일 발송 */
export async function sendDailySummary(signals: Signal[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ALERT_EMAIL;
  if (!apiKey || !toEmail || signals.length === 0) return;

  const rows = signals
    .map(
      (s) =>
        `<tr>
          <td style="padding:6px;">${s.ticker}</td>
          <td style="padding:6px;">${s.type}</td>
          <td style="padding:6px;">${s.strategy}</td>
          <td style="padding:6px;">${s.entryPrice.toFixed(2)}</td>
          <td style="padding:6px; color:${s.type === 'SELL' ? '#ff4d6d' : '#00d4aa'};">${s.stopLoss.toFixed(2)}</td>
          <td style="padding:6px; color:#0095ff;">${s.takeProfit.toFixed(2)}</td>
        </tr>`
    )
    .join('');

  const html = `
    <div style="font-family: monospace; max-width: 700px; background: #0d1421; color: #e2e8f0; padding: 24px; border-radius: 12px;">
      <h2 style="color: #00d4aa;">📊 RSI Alert Pro — 일간 신호 요약</h2>
      <p style="color: #64748b;">${new Date().toLocaleDateString('ko-KR')} 기준 발생 신호 ${signals.length}건</p>
      <table style="width:100%; border-collapse:collapse; margin-top:16px;">
        <thead>
          <tr style="background:#1e2d42; color:#64748b; font-size:12px;">
            <th style="padding:8px;">종목</th><th style="padding:8px;">유형</th><th style="padding:8px;">전략</th>
            <th style="padding:8px;">진입</th><th style="padding:8px;">손절</th><th style="padding:8px;">익절</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'RSI Alert Pro <alerts@resend.dev>',
      to: [toEmail],
      subject: `[RSI Alert] 일간 요약 — ${signals.length}건 신호`,
      html,
    }),
  });
}
