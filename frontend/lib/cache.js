/**
 * PromptHub Fast Client Cache
 * Provides instant in-memory and persistent localStorage caching for true 0ms screen switching.
 * Stale-while-revalidate pattern: renders cached data immediately, fetches real-time updates in background.
 */

const memoryCache = new Map();

export function getCachedData(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  
  // 1. In-memory Map (0.01ms lookup)
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // 2. LocalStorage (persists across reloads, tabs, browser restarts)
  try {
    const rawLocal = localStorage.getItem(`ph_cache_${key}`);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      memoryCache.set(key, parsed);
      return parsed;
    }
  } catch (e) {
    // LocalStorage read failed or corrupted
  }

  // 3. SessionStorage fallback
  try {
    const rawSession = sessionStorage.getItem(`ph_cache_${key}`);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
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
    const serialized = JSON.stringify(data);
    try {
      localStorage.setItem(`ph_cache_${key}`, serialized);
    } catch (e) {
      // LocalStorage quota or blocked
    }
    try {
      sessionStorage.setItem(`ph_cache_${key}`, serialized);
    } catch (e) {
      // SessionStorage quota or blocked
    }
  } catch (e) {
    // Serialization error
  }
}

export function invalidateCache(keyPrefix) {
  if (typeof window === 'undefined') return;
  
  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) memoryCache.delete(k);
  }

  try {
    const keysToRemoveLocal = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`ph_cache_${keyPrefix}`)) {
        keysToRemoveLocal.push(k);
      }
    }
    keysToRemoveLocal.forEach(k => localStorage.removeItem(k));
  } catch (e) {}

  try {
    const keysToRemoveSession = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(`ph_cache_${keyPrefix}`)) {
        keysToRemoveSession.push(k);
      }
    }
    keysToRemoveSession.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {}
}
