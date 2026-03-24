'use client';

const BUY_STEPS = [
  'RSI 과매도',
  'BB 하단 이탈',
  '반전 캔들',
  '쌍바닥 확인',
];

const SELL_STEPS = [
  'RSI 과매수',
  'BB 상단 이탈',
  '쌍봉 확인',
  '하락 장악형',
];

interface Props {
  step: number;    // 1~4
  type: string;
}

export default function StepProgress({ step, type }: Props) {
  const steps = type === 'SELL' ? SELL_STEPS : BUY_STEPS;
  const isBuy = type !== 'SELL';

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-slate-500 font-mono">조건 달성 {step}/{steps.length}</div>
      <div className="flex gap-1.5">
        {steps.map((label, idx) => {
          const active = idx < step;
          return (
            <div key={idx} className="flex-1">
              <div className={`h-1.5 rounded-full transition-all ${
                active
                  ? isBuy ? 'bg-emerald-500' : 'bg-red-500'
                  : 'bg-slate-700'
              }`} />
              <div className={`text-xs mt-1 truncate leading-tight hidden sm:block ${
                active ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
