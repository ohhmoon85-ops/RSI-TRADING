'use client';

import { useState, useEffect } from 'react';
import type { Signal } from '@/types';
import { formatDateTime, formatPrice, getSignalTypeLabel } from '@/lib/utils';

export default function HistoryPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const res = await fetch('/api/signals?limit=100');
    const data = await res.json();
    setSignals(data.signals ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleResult = async (id: string, result: 'WIN' | 'LOSS' | 'HOLD') => {
    await fetch('/api/signals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, result }),
    });
    await load();
  };

  const decided = signals.filter((s) => s.result === 'WIN' || s.result === 'LOSS');
  const wins = decided.filter((s) => s.result === 'WIN').length;
  const losses = decided.filter((s) => s.result === 'LOSS').length;
  const winRate = decided.length > 0 ? ((wins / decided.length) * 100).toFixed(1) : '—';

  const stratStats = ['BUY_A', 'BUY_B', 'SELL'].map((type) => {
    const group = decided.filter((s) => s.type === type);
    const w = group.filter((s) => s.result === 'WIN').length;
    return { type, total: group.length, wins: w, rate: group.length > 0 ? ((w / group.length) * 100).toFixed(0) : '—' };
  });

  return (
    <div className="grid-bg min-h-screen p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">성과 분석</div>
        <h1 className="text-xl md:text-2xl font-bold text-white">신호 히스토리</h1>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-xs font-mono text-slate-500 uppercase mb-1">전체 신호</div>
          <div className="text-2xl font-bold text-white font-mono">{signals.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-xs font-mono text-slate-500 uppercase mb-1">전체 승률</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{winRate}{winRate !== '—' ? '%' : ''}</div>
          <div className="text-xs text-slate-600">{wins}승 {losses}패</div>
        </div>
        {stratStats.map((s) => (
          <div key={s.type} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-xs font-mono text-slate-500 uppercase mb-1">{getSignalTypeLabel(s.type)}</div>
            <div className="text-2xl font-bold text-white font-mono">{s.rate}{s.rate !== '—' ? '%' : ''}</div>
            <div className="text-xs text-slate-600">{s.total}건</div>
          </div>
        ))}
      </div>

      {/* 데스크톱 테이블 (md 이상) */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase">시각</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase">종목</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase">유형</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase">전략</th>
                <th className="px-4 py-3 text-right text-xs font-mono text-slate-500 uppercase">진입</th>
                <th className="px-4 py-3 text-right text-xs font-mono text-slate-500 uppercase">손절</th>
                <th className="px-4 py-3 text-right text-xs font-mono text-slate-500 uppercase">익절</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase">RSI</th>
                <th className="px-4 py-3 text-left text-xs font-mono text-slate-500 uppercase">결과</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-600 font-mono text-sm">로딩 중...</td></tr>
              ) : signals.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-slate-600 font-mono text-sm">데이터 없음</td></tr>
              ) : (
                signals.map((s) => (
                  <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-semibold">{s.ticker}</span>
                      <span className="ml-1.5 text-xs text-slate-600 font-mono">{s.timeframe}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-semibold ${s.type === 'SELL' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {getSignalTypeLabel(s.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{s.strategy}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-white">{formatPrice(s.entryPrice)}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-red-400">{formatPrice(s.stopLoss)}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono text-sky-400">{formatPrice(s.takeProfit)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{s.rsi.toFixed(1)}</td>
                    <td className="px-4 py-3">
                      {s.result ? (
                        <span className={`text-xs font-mono font-semibold ${
                          s.result === 'WIN' ? 'text-emerald-400' : s.result === 'LOSS' ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {s.result === 'WIN' ? '✓ 수익' : s.result === 'LOSS' ? '✗ 손실' : '— 보류'}
                        </span>
                      ) : (
                        <div className="flex gap-1">
                          {(['WIN', 'LOSS', 'HOLD'] as const).map((r) => (
                            <button
                              key={r}
                              onClick={() => handleResult(s.id, r)}
                              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                                r === 'WIN' ? 'text-emerald-400 hover:bg-emerald-500/20' :
                                r === 'LOSS' ? 'text-red-400 hover:bg-red-500/20' :
                                'text-slate-400 hover:bg-slate-700'
                              }`}>
                              {r === 'WIN' ? '✓' : r === 'LOSS' ? '✗' : '—'}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 모바일 카드 리스트 (md 미만) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 text-slate-600 font-mono text-sm">로딩 중...</div>
        ) : signals.length === 0 ? (
          <div className="text-center py-16 text-slate-600 border border-slate-800 rounded-xl bg-slate-900/50">
            <div className="text-3xl mb-3">📊</div>
            <div className="text-sm font-mono">데이터 없음</div>
          </div>
        ) : (
          signals.map((s) => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              {/* 카드 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{s.ticker}</span>
                  <span className="text-xs font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{s.timeframe}</span>
                  <span className={`text-xs font-mono font-semibold ${s.type === 'SELL' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {getSignalTypeLabel(s.type)}
                  </span>
                </div>
                <span className="text-xs text-slate-600 font-mono">{formatDateTime(s.createdAt)}</span>
              </div>

              {/* 전략 */}
              <div className="text-xs text-slate-500 truncate">{s.strategy}</div>

              {/* 가격 3열 */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950 rounded-lg p-2 text-center">
                  <div className="text-xs text-slate-500 mb-0.5">진입</div>
                  <div className="text-xs font-mono text-white font-semibold">{formatPrice(s.entryPrice)}</div>
                </div>
                <div className="bg-slate-950 rounded-lg p-2 text-center">
                  <div className="text-xs text-slate-500 mb-0.5">손절</div>
                  <div className="text-xs font-mono text-red-400 font-semibold">{formatPrice(s.stopLoss)}</div>
                </div>
                <div className="bg-slate-950 rounded-lg p-2 text-center">
                  <div className="text-xs text-slate-500 mb-0.5">익절</div>
                  <div className="text-xs font-mono text-sky-400 font-semibold">{formatPrice(s.takeProfit)}</div>
                </div>
              </div>

              {/* RSI + 결과 */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">RSI {s.rsi.toFixed(1)}</span>
                {s.result ? (
                  <span className={`text-xs font-mono font-semibold ${
                    s.result === 'WIN' ? 'text-emerald-400' : s.result === 'LOSS' ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {s.result === 'WIN' ? '✓ 수익' : s.result === 'LOSS' ? '✗ 손실' : '— 보류'}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    {(['WIN', 'LOSS', 'HOLD'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleResult(s.id, r)}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          r === 'WIN' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
                          r === 'LOSS' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
                          'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}>
                        {r === 'WIN' ? '✓ 수익' : r === 'LOSS' ? '✗ 손실' : '보류'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
