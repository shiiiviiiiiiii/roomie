import { useEffect, useState } from 'react';
import {
  loadConsent,
  saveConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
} from '../consent';

const DESCRIPTIONS = {
  necessary: 'Required for the site to work — signing you in, remembering your session and keeping forms secure. Always on.',
  preferences: 'Remembers choices like your city filter and display settings between visits.',
  analytics: 'Helps us understand which pages are used so we can improve Roomie. No advertising use.',
  marketing: 'Used to show you relevant Roomie updates and offers on other sites.',
};

function Toggle({ label, description, checked, disabled, onChange }) {
  return (
    <label className={`cookie-toggle ${disabled ? 'is-disabled' : ''}`}>
      <span className="cookie-toggle-text">
        <span className="cookie-toggle-label">{label}</span>
        <span className="cookie-toggle-desc">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`switch ${checked ? 'on' : ''}`}
      >
        <span className="switch-knob" />
      </button>
    </label>
  );
}

export default function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [prefs, setPrefs] = useState({ preferences: false, analytics: false, marketing: false });

  useEffect(() => {
    // First visit (no stored consent) → show the banner.
    if (!loadConsent()) setShowBanner(true);
    const open = () => {
      const stored = loadConsent();
      if (stored) setPrefs({ preferences: stored.preferences, analytics: stored.analytics, marketing: stored.marketing });
      setShowBanner(false);
      setShowModal(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  const choose = (choices) => {
    saveConsent(choices);
    setShowBanner(false);
    setShowModal(false);
  };

  const acceptAll = () => choose({ preferences: true, analytics: true, marketing: true });
  const rejectNonEssential = () => choose({ preferences: false, analytics: false, marketing: false });
  const saveChoices = () => choose(prefs);

  return (
    <>
      {showBanner && (
        <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Cookie consent">
          <div className="cookie-banner-inner">
            <p className="cookie-banner-text">
              <strong>We use cookies.</strong> Necessary cookies keep Roomie working; with your
              permission we&apos;d also like to use preferences, analytics and marketing cookies.
              Read our <a href="/cookies">Cookie Policy</a>.
            </p>
            <div className="cookie-banner-actions">
              <button className="btn btn-sm" onClick={acceptAll}>Accept all</button>
              <button className="btn btn-ghost btn-sm" onClick={rejectNonEssential}>Reject non-essential</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>Customise</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="cookie-modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="cookie-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Cookie preferences"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Cookie preferences</h2>
            <p className="muted">
              Choose which cookies Roomie may use. You can change your mind at any time
              from the &ldquo;Cookie settings&rdquo; link in the footer.
            </p>

            <Toggle label="Necessary" description={DESCRIPTIONS.necessary} checked disabled onChange={() => {}} />
            <Toggle
              label="Preferences"
              description={DESCRIPTIONS.preferences}
              checked={prefs.preferences}
              onChange={(v) => setPrefs((p) => ({ ...p, preferences: v }))}
            />
            <Toggle
              label="Analytics"
              description={DESCRIPTIONS.analytics}
              checked={prefs.analytics}
              onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))}
            />
            <Toggle
              label="Marketing"
              description={DESCRIPTIONS.marketing}
              checked={prefs.marketing}
              onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))}
            />

            <div className="cookie-modal-actions">
              <button className="btn btn-sm" onClick={saveChoices}>Save choices</button>
              <button className="btn btn-ghost btn-sm" onClick={acceptAll}>Accept all</button>
              <button className="btn btn-ghost btn-sm" onClick={rejectNonEssential}>Reject non-essential</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
