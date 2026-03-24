'use client';

import { useState } from 'react';

interface SettingsForm {
  rsiBuyThreshold: number;
  rsiSellThreshold: number;
  rsiDeadZoneLow: number;
  rsiDeadZoneHigh: number;
  bbPeriod: number;
  bbStdDev: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  defaultRR: number;
  telegramBotToken: string;
  telegramChatId: string;
  resendApiKey: string;
  alertEmail: string;
}

const DEFAULT: SettingsForm = {
  rsiBuyThreshold: 30,
  rsiSellThreshold: 70,
  rsiDeadZoneLow: 40,
  rsiDeadZoneHigh: 60,
  bbPeriod: 20,
  bbStdDev: 2,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
  defaultRR: 2,
  telegramBotToken: '',
  telegramChatId: '',
  resendApiKey: '',
  alertEmail: '',
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const set = (key: keyof SettingsForm, value: string | number) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestTelegram = async () => {
    setTestResult('전송 중...');
    try {
      const res = await fetch(`https://api.telegram.org/bot${form.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: form.telegramChatId, text: '✅ RSI Alert Pro 텔레그램 연동 테스트 성공!' }),
      });
      const data = await res.json();
      setTestResult(data.ok ? '✅ 전송 성공!' : `❌ 실패: ${data.description}`);
    } catch (e) {
      setTestResult(`❌ 오류: ${e}`);
    }
  };

  const InputNumber = ({ label, field, min, max, step = 1 }: { label: string; field: keyof SettingsForm; min?: number; max?: number; step?: number }) => (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <input
        type="number"
        min={min} max={max} step={step}
        value={form[field] as number}
        onChange={(e) => set(field, parseFloat(e.target.value))}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
      />
    </div>
  );

  const InputText = ({ label, field, placeholder, type = 'text' }: { label: string; field: keyof SettingsForm; placeholder?: string; type?: string }) => (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <input
        type={type}
        value={form[field] as string}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 placeholder-slate-700"
      />
    </div>
  );

  return (
    <div className="grid-bg min-h-screen p-4 md:p-6 space-y-4 md:space-y-6 max-w-3xl">
      <div>
        <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">구성 관리</div>
        <h1 className="text-xl md:text-2xl font-bold text-white">설정</h1>
      </div>

      {/* RSI 임계값 */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-emerald-400">📊</span> RSI 임계값
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InputNumber label="매수 임계값 (기본: 30)" field="rsiBuyThreshold" min={1} max={50} />
          <InputNumber label="매도 임계값 (기본: 70)" field="rsiSellThreshold" min={50} max={99} />
          <InputNumber label="횡보 구간 하한 (기본: 40)" field="rsiDeadZoneLow" min={30} max={60} />
          <InputNumber label="횡보 구간 상한 (기본: 60)" field="rsiDeadZoneHigh" min={40} max={70} />
        </div>
        <div className="text-xs text-slate-600 font-mono bg-slate-950 rounded p-2">
          RSI {form.rsiDeadZoneLow}~{form.rsiDeadZoneHigh} 구간에서는 신호 발생 안 함
        </div>
      </section>

      {/* 볼린저 밴드 + MACD */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-sky-400">📈</span> 지표 파라미터
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <InputNumber label="BB 기간 (기본: 20)" field="bbPeriod" min={5} max={50} />
          <InputNumber label="BB 표준편차 (기본: 2)" field="bbStdDev" min={1} max={3} step={0.1} />
          <InputNumber label="MACD Fast (기본: 12)" field="macdFast" min={5} max={20} />
          <InputNumber label="MACD Slow (기본: 26)" field="macdSlow" min={20} max={40} />
          <InputNumber label="MACD Signal (기본: 9)" field="macdSignal" min={3} max={15} />
          <InputNumber label="기본 손익비 (기본: 2)" field="defaultRR" min={1} max={5} step={0.5} />
        </div>
      </section>

      {/* 텔레그램 */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-sky-400">✈️</span> 텔레그램 봇 설정
        </h2>
        <div className="space-y-3">
          <InputText label="Bot Token" field="telegramBotToken" placeholder="1234567890:ABCdef..." type="password" />
          <InputText label="Chat ID" field="telegramChatId" placeholder="-100123456789" />
        </div>
        <button
          onClick={handleTestTelegram}
          disabled={!form.telegramBotToken || !form.telegramChatId}
          className="px-4 py-2 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-sm hover:bg-sky-500/30 transition-colors disabled:opacity-40">
          테스트 메시지 전송
        </button>
        {testResult && <div className="text-xs font-mono text-slate-400">{testResult}</div>}
        <p className="text-xs text-slate-600">
          @BotFather에서 봇 생성 후 Token을 발급받으세요. Chat ID는 @userinfobot에서 확인 가능합니다.
        </p>
      </section>

      {/* 이메일 */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>📧</span> 이메일 설정 (Resend)
        </h2>
        <div className="space-y-3">
          <InputText label="Resend API Key" field="resendApiKey" placeholder="re_..." type="password" />
          <InputText label="수신 이메일" field="alertEmail" placeholder="you@example.com" type="email" />
        </div>
        <p className="text-xs text-slate-600">
          Resend 무료 플랜은 100 이메일/일. 일간 요약 리포트 발송에 사용됩니다.
        </p>
      </section>

      {/* 저장 버튼 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-500/30 transition-colors">
          {saved ? '✓ 저장됨' : '설정 저장'}
        </button>
        <button
          onClick={() => setForm(DEFAULT)}
          className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 text-slate-400 rounded-lg text-sm hover:bg-slate-700 transition-colors">
          초기화
        </button>
      </div>

      {/* 환경변수 안내 */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-5">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">Vercel 환경변수 (.env.local)</h3>
        <pre className="text-xs font-mono text-slate-500 leading-relaxed overflow-x-auto">
{`ALPHA_VANTAGE_KEY=your_key
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
RESEND_API_KEY=re_...
ALERT_EMAIL=you@example.com
KIS_APP_KEY=your_kis_key
KIS_APP_SECRET=your_kis_secret
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
CRON_SECRET=your_secret`}
        </pre>
      </section>
    </div>
  );
}
