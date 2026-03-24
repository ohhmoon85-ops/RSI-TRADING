'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WatchlistItem, Timeframe, ScanResult } from '@/types';
import { KOREA_UNIVERSE } from '@/lib/universe';

const TF_OPTIONS: Timeframe[] = ['5m', '15m', '1h', '1d'];
const SCAN_TF_OPTIONS = ['15m', '1h'] as const;
type ScanTf = typeof SCAN_TF_OPTIONS[number];

type Tab = 'scan' | 'watchlist';

function RsiBadge({ rsi }: { rsi: number }) {
  const color =
    rsi <= 30 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    rsi >= 70 ? 'text-red-400 bg-red-500/10 border-red-500/30' :
    'text-slate-400 bg-slate-800 border-slate-700';
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${color}`}>
      RSI {rsi.toFixed(1)}
    </span>
  );
}

function SignalBadge({ signal }: { signal: ScanResult['signal'] }) {
  if (!signal) return null;
  const map = {
    BUY_A:  { label: '매수A', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    BUY_B:  { label: '매수B', cls: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
    SELL:   { label: '매도',  cls: 'text-red-400 bg-red-500/10 border-red-500/30' },
  };
  const { label, cls } = map[signal];
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function WatchlistPage() {
  const [tab, setTab] = useState<Tab>('scan');

  // ── 스캔 결과 탭 ──────────────────────────────────────────
  const [scanTf, setScanTf] = useState<ScanTf>('15m');
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [scanLoading, setScanLoading] = useState(true);
  const [scanMeta, setScanMeta] = useState({ total: KOREA_UNIVERSE.length, scanned: 0 });
  const [signalFilter, setSignalFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'OVERSOLD' | 'OVERBOUGHT'>('ALL');

  const loadScanResults = useCallback(async (tf: ScanTf) => {
    setScanLoading(true);
    const res = await fetch(`/api/scan-results?tf=${tf}`);
    const data = await res.json();
    setScanResults(data.results ?? []);
    setScanMeta({ total: data.total ?? KOREA_UNIVERSE.length, scanned: data.scanned ?? 0 });
    setScanLoading(false);
  }, []);

  useEffect(() => { loadScanResults(scanTf); }, [scanTf, loadScanResults]);

  const filteredScan = scanResults.filter((r) => {
    if (signalFilter === 'ALL') return true;
    if (signalFilter === 'BUY') return r.signal === 'BUY_A' || r.signal === 'BUY_B';
    if (signalFilter === 'SELL') return r.signal === 'SELL';
    if (signalFilter === 'OVERSOLD') return r.rsi <= 30;
    if (signalFilter === 'OVERBOUGHT') return r.rsi >= 70;
    return true;
  });

  // ── 위시리스트 탭 ─────────────────────────────────────────
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [wlLoading, setWlLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    ticker: '',
    name: '',
    timeframes: ['15m'] as Timeframe[],
    notifyTelegram: true,
    notifyPush: true,
    notifyEmail: false,
  });

  const loadWatchlist = async () => {
    const res = await fetch('/api/watchlist');
    const data = await res.json();
    setItems(data.items ?? []);
    setWlLoading(false);
  };

  useEffect(() => { loadWatchlist(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ticker.trim()) return;
    setAdding(true);
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, market: 'KR' }),
    });
    if (res.ok) {
      setForm({ ticker: '', name: '', timeframes: ['15m'], notifyTelegram: true, notifyPush: true, notifyEmail: false });
      await loadWatchlist();
    } else {
      const err = await res.json();
      alert(err.error ?? '추가 실패');
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
    await loadWatchlist();
  };

  const toggleTimeframe = (tf: Timeframe) => {
    setForm((f) => ({
      ...f,
      timeframes: f.timeframes.includes(tf) ? f.timeframes.filter((t) => t !== tf) : [...f.timeframes, tf],
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
    await loadWatchlist();
  };

  // 스캔 결과에서 위시리스트에 바로 추가
  const handleAddFromScan = async (result: ScanResult) => {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: result.ticker,
        name: result.name,
        market: 'KR',
        timeframes: ['15m', '1h'],
        notifyTelegram: true,
        notifyPush: true,
        notifyEmail: false,
      }),
    });
    if (res.ok) {
      await loadWatchlist();
      alert(`${result.name} 위시리스트에 추가됨`);
    } else {
      const err = await res.json();
      alert(err.error ?? '추가 실패');
    }
  };

  const watchlistTickers = new Set(items.map((i) => i.ticker));

  return (
    <div className="grid-bg min-h-screen p-4 md:p-6 space-y-4 md:space-y-6">
      {/* 헤더 */}
      <div>
        <div className="text-xs font-mono text-emerald-400 uppercase tracking-widest mb-1">모니터링 관리</div>
        <h1 className="text-xl md:text-2xl font-bold text-white">종목 관리</h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('scan')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'scan'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}>
          전체 스캔 결과
          <span className="ml-1.5 text-xs opacity-70">{scanMeta.scanned}/{scanMeta.total}</span>
        </button>
        <button
          onClick={() => setTab('watchlist')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'watchlist'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
          }`}>
          내 위시리스트
          <span className="ml-1.5 text-xs opacity-70">{items.length}</span>
        </button>
      </div>

      {/* ── 전체 스캔 결과 탭 ── */}
      {tab === 'scan' && (
        <div className="space-y-4">
          {/* 컨트롤 바 */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 타임프레임 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">타임프레임:</span>
              {SCAN_TF_OPTIONS.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setScanTf(tf)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                    scanTf === tf
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}>
                  {tf}
                </button>
              ))}
            </div>

            {/* 신호 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">필터:</span>
              {([
                ['ALL', '전체'],
                ['BUY', '매수신호'],
                ['SELL', '매도신호'],
                ['OVERSOLD', 'RSI≤30'],
                ['OVERBOUGHT', 'RSI≥70'],
              ] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSignalFilter(val)}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                    signalFilter === val
                      ? 'bg-slate-600 text-white border border-slate-500'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadScanResults(scanTf)}
              className="ml-auto px-3 py-1.5 text-xs bg-slate-800 text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors">
              새로고침
            </button>
          </div>

          {/* 안내 */}
          <div className="text-xs text-slate-600 font-mono">
            5분 Cron 실행마다 15개씩 순환 스캔 · 전체 완료 약 {Math.ceil(scanMeta.total / 15) * 5}분
          </div>

          {/* 스캔 결과 테이블 (데스크톱) */}
          {scanLoading ? (
            <div className="text-center py-16 text-slate-600 font-mono text-sm">스캔 결과 로딩 중...</div>
          ) : filteredScan.length === 0 ? (
            <div className="text-center py-16 text-slate-600 border border-slate-800 rounded-xl bg-slate-900/50">
              <div className="text-3xl mb-3">📡</div>
              <div className="text-sm font-mono">아직 스캔 결과 없음</div>
              <div className="text-xs text-slate-700 mt-1">대시보드에서 수동 스캔을 실행하거나 Cron이 실행될 때까지 기다리세요</div>
            </div>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-4 py-3 text-left text-xs font-mono text-slate-500">종목</th>
                      <th className="px-4 py-3 text-left text-xs font-mono text-slate-500">섹터</th>
                      <th className="px-4 py-3 text-left text-xs font-mono text-slate-500">RSI</th>
                      <th className="px-4 py-3 text-left text-xs font-mono text-slate-500">BB</th>
                      <th className="px-4 py-3 text-left text-xs font-mono text-slate-500">MACD</th>
                      <th className="px-4 py-3 text-right text-xs font-mono text-slate-500">현재가</th>
                      <th className="px-4 py-3 text-left text-xs font-mono text-slate-500">신호</th>
                      <th className="px-4 py-3 text-center text-xs font-mono text-slate-500">추가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScan.map((r) => (
                      <tr key={`${r.ticker}-${r.timeframe}`} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-white font-bold font-mono">{r.ticker}</span>
                          <span className="ml-2 text-xs text-slate-500">{r.name}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{r.sector}</td>
                        <td className="px-4 py-3">
                          <RsiBadge rsi={r.rsi} />
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-400">
                          {r.bbPosition === 'BELOW_LOWER' ? (
                            <span className="text-emerald-400">하단 아래</span>
                          ) : r.bbPosition === 'ABOVE_UPPER' ? (
                            <span className="text-red-400">상단 위</span>
                          ) : (
                            <span className="text-slate-600">밴드 내</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {r.macdCross === 'GOLDEN' ? (
                            <span className="text-emerald-400">골든크로스</span>
                          ) : r.macdCross === 'DEAD' ? (
                            <span className="text-red-400">데드크로스</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-white">
                          {r.price.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <SignalBadge signal={r.signal} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          {watchlistTickers.has(r.ticker) ? (
                            <span className="text-xs text-slate-600 font-mono">등록됨</span>
                          ) : (
                            <button
                              onClick={() => handleAddFromScan(r)}
                              className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                              + 추가
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 모바일 카드 */}
              <div className="md:hidden space-y-2">
                {filteredScan.map((r) => (
                  <div key={`${r.ticker}-${r.timeframe}`} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-bold font-mono">{r.ticker}</span>
                        <span className="ml-2 text-xs text-slate-500">{r.name}</span>
                        <span className="ml-2 text-xs text-slate-700">{r.sector}</span>
                      </div>
                      <span className="text-sm font-mono text-white">{r.price.toLocaleString()}원</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <RsiBadge rsi={r.rsi} />
                      <SignalBadge signal={r.signal} />
                      {r.bbPosition === 'BELOW_LOWER' && <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">BB하단</span>}
                      {r.bbPosition === 'ABOVE_UPPER' && <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">BB상단</span>}
                      {r.macdCross === 'GOLDEN' && <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">골든크로스</span>}
                      <div className="ml-auto">
                        {watchlistTickers.has(r.ticker) ? (
                          <span className="text-xs text-slate-600">등록됨</span>
                        ) : (
                          <button
                            onClick={() => handleAddFromScan(r)}
                            className="text-xs px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                            + 위시리스트
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 내 위시리스트 탭 ── */}
      {tab === 'watchlist' && (
        <div className="space-y-4">
          {/* 종목 추가 폼 */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6">
            <h2 className="text-sm font-semibold text-white mb-4">🇰🇷 한국주식 종목 추가</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="종목코드 (예: 005930)"
                  value={form.ticker}
                  onChange={(e) => setForm((f) => ({ ...f, ticker: e.target.value.replace(/\D/g, '') }))}
                  maxLength={6}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <input
                  type="text"
                  placeholder="종목명 (예: 삼성전자)"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={adding || !form.ticker}
                  className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50">
                  {adding ? '추가 중...' : '+ 추가'}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-500 shrink-0">타임프레임:</span>
                {TF_OPTIONS.map((tf) => (
                  <button key={tf} type="button" onClick={() => toggleTimeframe(tf)}
                    className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                      form.timeframes.includes(tf)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}>
                    {tf}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-xs text-slate-500 shrink-0">알림:</span>
                {(['notifyTelegram', 'notifyPush', 'notifyEmail'] as const).map((field) => {
                  const labels = { notifyTelegram: '텔레그램', notifyPush: 'Web Push', notifyEmail: '이메일' };
                  return (
                    <label key={field} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={form[field]} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.checked }))} className="accent-emerald-400" />
                      <span className="text-xs text-slate-400">{labels[field]}</span>
                    </label>
                  );
                })}
              </div>
            </form>
          </div>

          {/* 위시리스트 목록 */}
          <div className="space-y-3">
            <div className="text-sm text-slate-500 font-mono">{items.length}개 종목 알림 설정 중</div>
            {wlLoading ? (
              <div className="text-center py-10 text-slate-600 font-mono text-sm">로딩 중...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-slate-600 border border-slate-800 rounded-xl bg-slate-900/50">
                <div className="text-3xl mb-3">📋</div>
                <div className="text-sm font-mono">등록된 종목 없음</div>
                <div className="text-xs text-slate-700 mt-1">스캔 결과 탭에서 종목을 추가하거나 직접 입력하세요</div>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-base shrink-0">🇰🇷</div>
                      <div className="min-w-0">
                        <div className="text-white font-bold font-mono">{item.ticker}</div>
                        <div className="text-xs text-slate-500 truncate">{item.name}</div>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(item.id)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-base shrink-0 flex items-center justify-center">
                      ×
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex gap-1.5 flex-wrap">
                      {item.timeframes.map((tf) => (
                        <span key={tf} className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded">{tf}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      {(['notifyTelegram', 'notifyPush', 'notifyEmail'] as const).map((field) => {
                        const labels = { notifyTelegram: '✈️', notifyPush: '🔔', notifyEmail: '📧' };
                        return (
                          <button key={field} onClick={() => handleToggleNotify(item.id, field)} title={field}
                            className={`w-8 h-8 rounded-lg text-sm transition-colors ${item[field] ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'}`}>
                            {labels[field]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
