/**
 * PromptHub Fast Client Cache
 * Provides instant in-memory and sessionStorage caching for 0ms screen switching.
 * Stale-while-revalidate pattern: renders cached data immediately, fetches real-time in background.
 */

const memoryCache = new Map();

export function getCachedData(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  try {
    const raw = sessionStorage.getItem(`ph_cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch (e) {
    // SessionStorage read failed
  }
  return fallback;
}

export function setCachedData(key, data) {
  if (typeof window === 'undefined' || data === undefined) return;
  memoryCache.set(key, data);
  try {
    sessionStorage.setItem(`ph_cache_${key}`, JSON.stringify(data));
  } catch (e) {
    // SessionStorage quota exceeded or disabled
  }
}

export function invalidateCache(keyPrefix) {
  if (typeof window === 'undefined') return;
  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) memoryCache.delete(k);
  }
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(`ph_cache_${keyPrefix}`)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {}
}
