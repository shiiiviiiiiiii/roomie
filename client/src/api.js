// Thin fetch wrapper. When a Firebase user is signed in, a fresh ID token
// is attached as `Authorization: Bearer <idToken>`; logged-out requests
// simply carry no auth header (anonymous browse still works).
//
// Resilience (#11 Timeouts, #12 Retries, #13 Exponential Backoff):
// the API runs on the other side of the planet, so requests can be slow
// or flaky. GETs time out after 15s and retry up to twice with
// exponential backoff; mutations never retry (avoiding double-posts).
//
// Client cache (#2 Caching): GET responses are kept in memory for 30s,
// so navigating back and forth doesn't refetch (and doesn't pay the
// Ohio→Mumbai round-trip again).
import { auth } from './firebase';

const API_BASE = '';

const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;
const CACHE_TTL_MS = 30_000;

const getCache = new Map(); // key -> { data, expiresAt }

function cacheKey(path, token) {
  // Authenticated responses are personal — never share across users.
  return token ? `${token.slice(0, 12)}:${path}` : `anon:${path}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, options) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function api(path, { method = 'GET', body, formData, noCache = false } = {}) {
  const headers = {};
  let token = null;
  if (auth && auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Token refresh failed (e.g. signed out mid-flight) — proceed
      // anonymously; the API will 401 if the route needs auth.
    }
  }
  let payload;
  if (formData) {
    payload = formData; // browser sets multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const isGet = method.toUpperCase() === 'GET';
  const key = cacheKey(path, token);

  // Serve from memory cache when fresh (unless the caller opts out,
  // e.g. live polling where staleness would be a bug).
  if (isGet && !noCache) {
    const hit = getCache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
  }

  let lastError;
  const attempts = isGet ? MAX_RETRIES + 1 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await fetchWithTimeout(API_BASE + path, {
        method,
        headers,
        body: payload,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      if (isGet && !noCache) {
        getCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
        // Bound memory: drop the oldest entries past 200.
        if (getCache.size > 200) {
          const oldest = getCache.keys().next().value;
          getCache.delete(oldest);
        }
      }
      return data;
    } catch (e) {
      lastError = e;
      // Retry idempotent GETs with exponential backoff (1s, 2s).
      if (isGet && attempt < attempts - 1) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError;
}

// Drop cached GETs — call after any mutation that changes visible data
// (posting, saving, profile edits) so the next read is fresh.
export function bustApiCache() {
  getCache.clear();
}
