/**
 * Vercel KV (Redis) 래퍼
 * 로컬 개발 시에는 인메모리 Map으로 폴백합니다.
 */

interface KVStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options?: { ex?: number }): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

// 로컬 개발용 인메모리 스토어
class MemoryKV implements KVStore {
  private store = new Map<string, { value: unknown; expiresAt?: number }>();

  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, options?: { ex?: number }): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: options?.ex ? Date.now() + options.ex * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return Array.from(this.store.keys()).filter((k) => regex.test(k));
  }
}

let kvInstance: KVStore;

function getKV(): KVStore {
  if (kvInstance) return kvInstance;

  // Vercel KV 또는 Upstash 환경변수 통합 지원
  const restUrl =
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL;
  const restToken =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (restUrl && restToken) {
    try {
      // @vercel/kv는 KV_REST_API_URL/TOKEN 환경변수를 직접 읽음
      // Upstash 변수를 사용할 경우 임시로 process.env에 주입
      if (!process.env.KV_REST_API_URL) process.env.KV_REST_API_URL = restUrl;
      if (!process.env.KV_REST_API_TOKEN) process.env.KV_REST_API_TOKEN = restToken;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { kv } = require('@vercel/kv');
      kvInstance = kv;
      return kvInstance;
    } catch {
      // 패키지 없으면 fallback
    }
  }

  kvInstance = new MemoryKV();
  return kvInstance;
}

export const kv = {
  get: <T = unknown>(key: string) => getKV().get<T>(key),
  set: (key: string, value: unknown, options?: { ex?: number }) =>
    getKV().set(key, value, options),
  del: (key: string) => getKV().del(key),
  keys: (pattern: string) => getKV().keys(pattern),
};

// KV 키 네임스페이스
export const KV_KEYS = {
  signal: (id: string) => `signal:${id}`,
  alertLock: (ticker: string, tf: string, strategy: string) =>
    `alert:${ticker}:${tf}:${strategy}`,
  batchIndex: () => 'cron:batch_index',
  watchlist: () => 'watchlist:items',
  settings: () => 'app:settings',
  signalList: () => 'signal:list',
  /** 유니버스 스캔 결과 (타임프레임별) */
  scanResults: (timeframe: string) => `scan:results:${timeframe}`,
};

// 타임프레임별 TTL (초)
export const TF_TTL: Record<string, number> = {
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '1d': 86400,
};
