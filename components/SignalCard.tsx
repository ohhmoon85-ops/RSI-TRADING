'use client';

import type { Signal } from '@/types';
import { formatPrice, formatTimeAgo, getBBPositionLabel, getSignalBgColor, getSignalTypeLabel } from '@/lib/utils';
import StepProgress from './StepProgress';

interface Props {
  signal: Signal;
  onResultUpdate?: (id: string, result: 'WIN' | 'LOSS' | 'HOLD') => void;
}

export default function SignalCard({ signal, onResultUpdate }: Props) {
  const isBuy = signal.type !== 'SELL';
  const risk = Math.abs(signal.entryPrice - signal.stopLoss);
  const riskPct = ((risk / signal.entryPrice) * 100).toFixed(2);

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${getSignalBgColor(signal.type)}`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
            ${isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {isBuy ? '↑' : '↓'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg">{signal.ticker}</span>
              <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                {signal.timeframe}
              </span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded font-semibold
                ${isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {getSignalTypeLabel(signal.type)}
              </span>
            </div>
            <div className="text-slate-500 text-xs mt-0.5">{signal.strategy}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">{formatTimeAgo(signal.createdAt)}</div>
          {signal.result && (
            <span className={`text-xs font-mono font-semibold mt-1 block
              ${signal.result === 'WIN' ? 'text-emerald-400' : signal.result === 'LOSS' ? 'text-red-400' : 'text-slate-400'}`}>
              {signal.result === 'WIN' ? '✓ 수익' : signal.result === 'LOSS' ? '✗ 손실' : '— 보류'}
            </span>
          )}
        </div>
      </div>

      {/* 단계 진행 */}
      <StepProgress step={signal.step} type={signal.type} />

      {/* 가격 정보 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-900/60 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">진입가</div>
          <div className="text-white font-mono font-semibold text-sm">
            {formatPrice(signal.entryPrice)}
          </div>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">손절가</div>
          <div className="text-red-400 font-mono font-semibold text-sm">
            {formatPrice(signal.stopLoss)}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">-{riskPct}%</div>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-3">
          <div className="text-xs text-slate-500 mb-1">익절가</div>
          <div className="text-sky-400 font-mono font-semibold text-sm">
            {formatPrice(signal.takeProfit)}
          </div>
          <div className="text-xs text-slate-600 mt-0.5">1:{signal.riskRewardRatio}</div>
        </div>
      </div>

      {/* 지표 정보 */}
      <div className="flex flex-wrap gap-2">
        <span className={`text-xs font-mono px-2.5 py-1 rounded-full border
          ${signal.rsi <= 30 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            signal.rsi >= 70 ? 'bg-red-500/10 border-red-500/30 text-red-400' :
            'bg-slate-800 border-slate-700 text-slate-400'}`}>
          RSI {signal.rsi.toFixed(1)}
        </span>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full border bg-slate-800 border-slate-700 text-slate-400">
          BB {getBBPositionLabel(signal.bbPosition)}
        </span>
        {signal.macdCross !== 'NONE' && (
          <span className={`text-xs font-mono px-2.5 py-1 rounded-full border
            ${signal.macdCross === 'GOLDEN' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
              'bg-purple-500/10 border-purple-500/30 text-purple-400'}`}>
            MACD {signal.macdCross === 'GOLDEN' ? '골든크로스' : '데드크로스'}
          </span>
        )}
        <span className="text-xs font-mono px-2.5 py-1 rounded-full border bg-slate-800 border-slate-700 text-slate-400">
          🇰🇷 한국주식
        </span>
      </div>

      {/* 결과 입력 버튼 */}
      {onResultUpdate && !signal.result && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onResultUpdate(signal.id, 'WIN')}
            className="flex-1 text-xs py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors font-medium">
            ✓ 수익
          </button>
          <button
            onClick={() => onResultUpdate(signal.id, 'LOSS')}
            className="flex-1 text-xs py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors font-medium">
            ✗ 손실
          </button>
          <button
            onClick={() => onResultUpdate(signal.id, 'HOLD')}
            className="flex-1 text-xs py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors font-medium">
            보류
          </button>
        </div>
      )}
    </div>
  );
}
