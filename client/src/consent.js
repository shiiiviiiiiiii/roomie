// Tiny cookie-consent store. Persists the visitor's choice to localStorage so
// the banner is only shown once, and the footer "Cookie settings" link can
// reopen the preferences modal at any time.
//
// Stored shape: { version, timestamp, necessary, preferences, analytics, marketing }
// Categories: necessary (always on), preferences, analytics, marketing.

export const CONSENT_KEY = 'roomie_cookie_consent';
export const CONSENT_VERSION = 1;

// Custom window event fired to reopen the preferences modal (dispatched by
// the footer's "Cookie settings" link, listened to by <CookieConsent />).
export const OPEN_COOKIE_SETTINGS_EVENT = 'roomie:open-cookie-settings';

const CATEGORIES = ['necessary', 'preferences', 'analytics', 'marketing'];

function readRaw() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Returns the stored consent object, or null if the visitor hasn't chosen yet. */
export function loadConsent() {
  const raw = readRaw();
  if (!raw) return null;
  return {
    version: raw.version,
    timestamp: raw.timestamp || null,
    necessary: true,
    preferences: !!raw.preferences,
    analytics: !!raw.analytics,
    marketing: !!raw.marketing,
  };
}

/**
 * Saves the visitor's choice. Accepts a partial object such as
 * { preferences: true, analytics: false, marketing: true } — `necessary` is
 * always forced on and a fresh timestamp is recorded.
 */
export function saveConsent(choices = {}) {
  const consent = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    necessary: true,
    preferences: !!choices.preferences,
    analytics: !!choices.analytics,
    marketing: !!choices.marketing,
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Storage may be unavailable (private mode, disabled cookies); the
    // banner will simply show again next visit.
  }
  return consent;
}

/** True when the visitor has consented to the given category. `necessary` is always true. */
export function hasConsent(category) {
  if (category === 'necessary') return true;
  if (!CATEGORIES.includes(category)) return false;
  const consent = loadConsent();
  return consent ? !!consent[category] : false;
}

/** Ask the <CookieConsent /> modal to open (used by the footer link). */
export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
