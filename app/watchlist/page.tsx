'use client';

import { useState, useEffect } from 'react';
import type { WatchlistItem, Market, Timeframe } from '@/types';

const TF_OPTIONS: Timeframe[] = ['5m', '15m', '1h', '1d'];

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    market: 'US' as Market,
    timeframes: ['15m'] as Timeframe[],
    notifyTelegram: true,
    notifyPush: true,
    notifyEmail: false,
  });

  const load = async () => {
    const res = await fetch('/api/watchlist');
    const data = await res.json();
    setItems(data.items ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ticker.trim()) return;
    setAdding(true);

    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setForm({ ticker: '', name: '', market: 'US', timeframes: ['15m'], notifyTelegram: true, notifyPush: true, notifyEmail: false });
      await load();
    } else {
      const err = await res.json();
      alert(err.error ?? '추가 실패');
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
    await load();
  };

  const toggleTimeframe = (tf: Timeframe) => {
    setForm((f) => ({
      ...f,
      timeframes: f.timeframes.includes(tf)
        ? f.timeframes.filter((t) => t !== tf)
        : [...f.timeframes, tf],
    }));
  };

  const handleToggleNotify = async (id: string, field: keyof Pick<WatchlistItem, 'notifyTelegram' | 'notifyPush' | 'notifyEmail'>) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    await fetch('/api/watchlist', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: !item[field] }),
    });
    await load();
  };

  return (
    <div className="grid-bg min-h-screen p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">모니터링 관리</div>
        <h1 className="text-2xl font-bold text-white">종목 위시리스트</h1>
      </div>

      {/* 종목 추가 폼 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">종목 추가</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="티커 (예: AAPL, 005930)"
              value={form.ticker}
              onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
              className="col-span-2 sm:col-span-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="종목명 (선택)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <select
              value={form.market}
              onChange={(e) => setForm((f) => ({ ...f, market: e.target.value as Market }))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500">
              <option value="US">🇺🇸 미국주식</option>
              <option value="KR">🇰🇷 한국주식</option>
            </select>
            <button
              type="submit"
              disabled={adding || !form.ticker}
              className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
              {adding ? '추가 중...' : '+ 추가'}
            </button>
          </div>

          {/* 타임프레임 선택 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500">타임프레임:</span>
            {TF_OPTIONS.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => toggleTimeframe(tf)}
                className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                  form.timeframes.includes(tf)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}>
                {tf}
              </button>
            ))}
          </div>

          {/* 알림 채널 */}
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-slate-500">알림:</span>
            {(['notifyTelegram', 'notifyPush', 'notifyEmail'] as const).map((field) => {
              const labels = { notifyTelegram: '텔레그램', notifyPush: 'Web Push', notifyEmail: '이메일' };
              return (
                <label key={field} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[field]}
                    onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.checked }))}
                    className="accent-emerald-400"
                  />
                  <span className="text-xs text-slate-400">{labels[field]}</span>
                </label>
              );
            })}
          </div>
        </form>
      </div>

      {/* 종목 목록 */}
      <div className="space-y-3">
        <div className="text-sm text-slate-500 font-mono">{items.length}개 종목 모니터링 중</div>

        {loading ? (
          <div className="text-center py-10 text-slate-600 font-mono text-sm">로딩 중...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-600 border border-slate-800 rounded-xl bg-slate-900/50">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-sm font-mono">등록된 종목 없음</div>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-lg font-bold text-white">
                  {item.market === 'KR' ? '🇰🇷' : '🇺🇸'}
                </div>
                <div>
                  <div className="text-white font-bold">{item.ticker}</div>
                  <div className="text-xs text-slate-500">{item.name}</div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {item.timeframes.map((tf) => (
                    <span key={tf} className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                      {tf}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* 알림 토글 */}
                {(['notifyTelegram', 'notifyPush', 'notifyEmail'] as const).map((field) => {
                  const labels = { notifyTelegram: '✈️', notifyPush: '🔔', notifyEmail: '📧' };
                  return (
                    <button
                      key={field}
                      onClick={() => handleToggleNotify(item.id, field)}
                      title={field}
                      className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                        item[field] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'
                      }`}>
                      {labels[field]}
                    </button>
                  );
                })}
                <button
                  onClick={() => handleDelete(item.id)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm">
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
