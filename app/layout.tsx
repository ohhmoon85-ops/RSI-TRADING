import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RSI Alert Pro — 매매 알림 대시보드',
  description: '로스 카메론 RSI 매매법 기반 실시간 주식 매매 알림 시스템',
};

export const viewport: Viewport = {
  themeColor: '#080c14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto min-w-0">
            {/* Mobile Header (md 미만에서만 표시) */}
            <header className="md:hidden sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono text-xs tracking-widest uppercase">⚡ RSI Alert Pro</span>
              </div>
              <div className="text-xs text-slate-600 font-mono">v1.1</div>
            </header>
            {/* pb-16: 모바일 하단 탭바 높이만큼 여백 */}
            <div className="pb-16 md:pb-0">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
