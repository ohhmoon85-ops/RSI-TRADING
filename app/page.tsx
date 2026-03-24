'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Signal } from '@/types';
import SignalCard from '@/components/SignalCard';
import StatCard from '@/components/StatCard';

export default function DashboardPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'BUY_A' | 'BUY_B' | 'SELL'>('ALL');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string>('');

  const loadSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/signals?limit=50');
      const data = await res.json();
      setSignals(data.signals ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignals();
    const interval = setInterval(loadSignals, 60_000);
    return () => clearInterval(interval);
  }, [loadSignals]);

  const handleManualScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scan');
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setLastScan(`❌ 오류: ${data.error ?? '알 수 없는 오류'}`);
      } else {
        const errCount = data.errors?.length ?? 0;
        const firstErr = errCount > 0 ? ` — ${data.errors[0]}` : '';
        const errSummary = errCount > 0 ? ` (실패 ${errCount}건${firstErr})` : '';
        setLastScan(`✓ ${data.processed}종목 스캔 · ${data.signals}개 신호${errSummary} · ${data.durationMs}ms`);
      }
      await loadSignals();
    } catch (e) {
      setLastScan(`❌ 네트워크 오류: ${e}`);
    } finally {
      setScanning(false);
    }
  };

  const handleResultUpdate = async (id: string, result: 'WIN' | 'LOSS' | 'HOLD') => {
    await fetch('/api/signals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, result }),
    });
    await loadSignals();
  };

  const filtered = filter === 'ALL' ? signals : signals.filter((s) => s.type === filter);
  const buyCount = signals.filter((s) => s.type !== 'SELL').length;
  const sellCount = signals.filter((s) => s.type === 'SELL').length;
  const activeCount = signals.filter((s) => s.status === 'ACTIVE').length;

  const winRate = (() => {
    const decided = signals.filter((s) => s.result === 'WIN' || s.result === 'LOSS');
    if (decided.length === 0) return '—';
    const wins = decided.filter((s) => s.result === 'WIN').length;
    return `${((wins / decided.length) * 100).toFixed(0)}%`;
  })();

  return (
    <div className="grid-bg min-h-screen">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">실시간 모니터링</div>
            <h1 className="text-xl md:text-2xl font-bold text-white">신호 대시보드</h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {lastScan && (
              <span className="text-xs text-slate-500 font-mono text-right">{lastScan}</span>
            )}
            <button
              onClick={handleManualScan}
              disabled={scanning}
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50 whitespace-nowrap">
              {scanning ? (
                <span className="animate-spin">⟳</span>
              ) : '⚡'}
              <span className="hidden sm:inline">{scanning ? '스캔 중...' : '수동 스캔'}</span>
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="전체 신호" value={signals.length} sub="최근 저장분" />
          <StatCard label="매수 신호" value={buyCount} color="green" sub="BUY A + B" />
          <StatCard label="매도 신호" value={sellCount} color="red" sub="SELL" />
          <StatCard label="활성 신호" value={activeCount} color="blue" sub={`승률 ${winRate}`} />
        </div>

        {/* 필터 탭 (가로 스크롤) */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['ALL', 'BUY_A', 'BUY_B', 'SELL'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}>
              {f === 'ALL' ? '전체' : f === 'BUY_A' ? '매수 A' : f === 'BUY_B' ? '매수 B' : '매도'}
              {f !== 'ALL' && (
                <span className="ml-1.5 text-xs opacity-70">
                  {signals.filter((s) => s.type === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 신호 목록 */}
        {loading ? (
          <div className="text-center py-20 text-slate-600">
            <div className="text-4xl mb-4 animate-pulse">⚡</div>
            <div className="font-mono text-sm">데이터 로딩 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-600 border border-slate-800 rounded-xl bg-slate-900/50">
            <div className="text-4xl mb-4">📡</div>
            <div className="font-mono text-sm mb-2">감지된 신호 없음</div>
            <div className="text-xs text-slate-700">위시리스트에 종목을 추가하거나 수동 스캔을 실행하세요.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                onResultUpdate={handleResultUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
