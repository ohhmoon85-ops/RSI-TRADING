import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `₩${price.toLocaleString('ko-KR')}`;
}

export function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (mins > 0) return `${mins}분 전`;
  return '방금';
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getBBPositionLabel(pos: string): string {
  switch (pos) {
    case 'ABOVE_UPPER': return '상단 이탈';
    case 'BELOW_LOWER': return '하단 이탈';
    default: return '내부';
  }
}

export function getSignalTypeLabel(type: string): string {
  switch (type) {
    case 'BUY_A': return '매수 A';
    case 'BUY_B': return '매수 B';
    case 'SELL': return '매도';
    default: return type;
  }
}

export function getSignalColor(type: string): string {
  if (type === 'SELL') return 'text-red-400';
  return 'text-emerald-400';
}

export function getSignalBgColor(type: string): string {
  if (type === 'SELL') return 'bg-red-500/10 border-red-500/30';
  return 'bg-emerald-500/10 border-emerald-500/30';
}
