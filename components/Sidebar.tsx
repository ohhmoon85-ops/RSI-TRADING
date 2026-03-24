'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: '⚡' },
  { href: '/watchlist', label: '종목 관리', icon: '📋' },
  { href: '/history', label: '히스토리', icon: '📊' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar (md 이상) */}
      <aside className="hidden md:flex w-56 shrink-0 border-r border-slate-800 bg-slate-950 flex-col min-h-screen">
        {/* 로고 */}
        <div className="px-5 py-6 border-b border-slate-800">
          <div className="text-xs font-mono text-emerald-400 tracking-widest uppercase mb-1">RSI Alert Pro</div>
          <div className="text-white font-bold text-lg leading-tight">매매 알림<br />대시보드</div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  active
                    ? 'bg-emerald-500/15 text-emerald-400 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 하단 */}
        <div className="px-5 py-4 border-t border-slate-800">
          <div className="text-xs text-slate-600 font-mono">v1.1 · Ross Cameron</div>
          <div className="text-xs text-slate-700 mt-0.5">RSI Method</div>
        </div>
      </aside>

      {/* Mobile Bottom Tab Nav (md 미만) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950 border-t border-slate-800 flex safe-area-pb">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors',
                active ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              )}>
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
