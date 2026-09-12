import { isBlock, type Block } from "./blocks.js";
import type { SitePage } from "./pages.js";
import type { SiteConfig } from "./site.js";

export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CacheBounds = { min?: number; max?: number };

export type CacheConfig = CacheBounds | false;

export type CacheEntry = {
  html: string;
  expiresAt: number;
};

export type CacheAdapter = {
  get(key: string): CacheEntry | undefined | Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): void | Promise<void>;
};

export function createMemoryCache(): CacheAdapter {
  const store = new Map<string, CacheEntry>();
  return {
    get(key) {
      return store.get(key);
    },
    set(key, entry) {
      store.set(key, entry);
    },
  };
}

function isCacheBounds(value: unknown): value is CacheBounds {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    ("min" in value || "max" in value)
  );
}

export function isCacheConfig(value: unknown): value is CacheConfig {
  if (value === false) {
    return true;
  }
  return isCacheBounds(value);
}

function readCacheConfig(value: unknown): CacheConfig | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === false) {
    return false;
  }
  if (isCacheBounds(value)) {
    return value;
  }
  return undefined;
}

export function collectPageCacheConfigs(
  page: SitePage,
  siteConfig: SiteConfig,
): (CacheConfig | undefined)[] {
  const configs: (CacheConfig | undefined)[] = [
    readCacheConfig(page.cache),
    readCacheConfig(siteConfig.config.cache),
  ];

  for (const items of Object.values(page.slots)) {
    if (!items) {
      continue;
    }
    for (const item of items) {
      if (isBlock(item)) {
        configs.push(readCacheConfig(item.cache));
      }
    }
  }

  return configs;
}

export function isPageCacheDisabled(configs: readonly (CacheConfig | undefined)[]): boolean {
  return configs.some((config) => config === false);
}

export function resolvePageCacheTtlMs(
  configs: readonly (CacheConfig | undefined)[],
): number {
  const bounds = configs.filter(isCacheBounds);

  const mins = bounds
    .map((config) => config.min)
    .filter((value): value is number => typeof value === "number" && value >= 0);

  const maxes = bounds
    .map((config) => config.max)
    .filter((value): value is number => typeof value === "number" && value > 0);

  const effectiveMin = mins.length > 0 ? Math.max(...mins) : 0;
  const effectiveMax =
    maxes.length > 0
      ? Math.min(...maxes, MAX_CACHE_TTL_MS)
      : MAX_CACHE_TTL_MS;

  const raw = maxes.length > 0 ? effectiveMax : DEFAULT_CACHE_TTL_MS;
  const ttl = Math.min(Math.max(raw, effectiveMin), effectiveMax);

  return ttl;
}

export function buildPageCacheKey(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function cacheControlFresh(ttlMs: number): string {
  const seconds = Math.max(0, Math.floor(ttlMs / 1000));
  return `public, max-age=${seconds}`;
}

export function cacheControlStale(ttlMs: number): string {
  const seconds = Math.max(0, Math.floor(ttlMs / 1000));
  return `public, max-age=0, stale-while-revalidate=${seconds}`;
}

export function isCacheEntryFresh(entry: CacheEntry, now = Date.now()): boolean {
  return entry.expiresAt > now;
}

const RENDER_ERROR_MARKER = "[Hyperspan] Render Error";

export function isSuccessfulRender(html: string): boolean {
  return !html.includes(RENDER_ERROR_MARKER);
}
