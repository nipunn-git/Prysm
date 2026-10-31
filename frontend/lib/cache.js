/**
 * Prysm Fast Client Cache
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

// User Global Cache Registry for 0ms profile transitions & 0ms instant search
export function cacheUser(user) {
  if (!user || typeof window === 'undefined') return;
  const username = (user.username || '').toLowerCase().trim();
  const userId = user.id || '';

  if (username) {
    setCachedData(`public_profile_${username}`, user);
  }
  if (userId) {
    setCachedData(`public_profile_${userId}`, user);
  }

  // Update known users list
  const known = getCachedData('ph_known_users_map', {}) || {};
  let changed = false;
  if (username && !known[username]) {
    known[username] = user;
    changed = true;
  } else if (username && known[username]) {
    known[username] = { ...known[username], ...user };
    changed = true;
  }
  if (userId && !known[userId]) {
    known[userId] = user;
    changed = true;
  }
  if (changed) {
    setCachedData('ph_known_users_map', known);
  }
}

export function cacheUsers(users) {
  if (!Array.isArray(users) || typeof window === 'undefined') return;
  users.forEach(u => cacheUser(u));
}

export function findUserInCache(usernameOrId) {
  if (!usernameOrId || typeof window === 'undefined') return null;
  const key = String(usernameOrId).toLowerCase().trim().replace(/^@/, '');
  
  // 1. Direct public profile cache
  let user = getCachedData(`public_profile_${key}`, null);
  if (user) return user;

  // 2. Known users map
  const known = getCachedData('ph_known_users_map', {}) || {};
  if (known[key]) return known[key];

  // 3. Search in suggested creators
  const suggested = getCachedData('explore_suggested_users', []) || [];
  user = suggested.find(u => 
    (u.username && u.username.toLowerCase() === key) ||
    (u.id && u.id.toLowerCase() === key)
  );
  if (user) return user;

  // 4. Search in explore repos owners
  const exploreRepos = getCachedData('explore_all_repos', []) || [];
  for (const r of exploreRepos) {
    if (r.owner) {
      if (
        (r.owner.username && r.owner.username.toLowerCase() === key) ||
        (r.owner.id && r.owner.id.toLowerCase() === key)
      ) {
        return r.owner;
      }
    }
  }

  return null;
}

export function searchCachedUsers(query) {
  if (!query || typeof window === 'undefined') return [];
  const q = query.toLowerCase().trim().replace(/^@/, '');
  if (!q) return [];

  const results = new Map();

  // Check known users map
  const known = getCachedData('ph_known_users_map', {}) || {};
  Object.values(known).forEach(u => {
    if (!u) return;
    const uname = (u.username || '').toLowerCase();
    const name = (u.name || '').toLowerCase();
    if (uname.includes(q) || name.includes(q)) {
      results.set(u.username || u.id, u);
    }
  });

  // Check suggested creators
  const suggested = getCachedData('explore_suggested_users', []) || [];
  suggested.forEach(u => {
    if (!u) return;
    const uname = (u.username || '').toLowerCase();
    const name = (u.name || '').toLowerCase();
    if (uname.includes(q) || name.includes(q)) {
      results.set(u.username || u.id, u);
    }
  });

  // Check repo owners
  const exploreRepos = getCachedData('explore_all_repos', []) || [];
  exploreRepos.forEach(r => {
    if (r.owner) {
      const uname = (r.owner.username || '').toLowerCase();
      const name = (r.owner.name || '').toLowerCase();
      if (uname.includes(q) || name.includes(q)) {
        results.set(r.owner.username || r.owner.id, r.owner);
      }
    }
  });

  return Array.from(results.values()).slice(0, 8);
}

