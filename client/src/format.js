// Indian currency + label helpers (en-GB copy).

export function inr(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Number(n));
}

export function inrShort(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(v % 10000000 ? 1 : 0)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(v % 100000 ? 1 : 0)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k`;
  return inr(v);
}

export const ROOM_TYPE_LABELS = {
  private_room: 'Private room',
  shared_room: 'Shared room',
  entire_place: 'Entire place',
};

export const FURNISHING_LABELS = {
  furnished: 'Furnished',
  semi_furnished: 'Semi-furnished',
  unfurnished: 'Unfurnished',
};

export const TENANT_LABELS = {
  any: 'Anyone welcome',
  male: 'Men only',
  female: 'Women only',
  family: 'Family preferred',
};

export const CITIES = ['Mumbai', 'Hyderabad', 'Bangalore', 'Pune', 'Delhi NCR'];
export const BHK_OPTIONS = ['1RK', '1BHK', '2BHK', '3BHK'];
export const AMENITY_OPTIONS = [
  'Wi-Fi', 'Power backup', 'Parking', 'Housekeeping', 'Washing machine',
  'Fridge', 'TV', 'Gym', 'Swimming pool', 'Balcony', 'Modular kitchen', 'CCTV',
];

export function timeAgo(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const d = new Date(iso.endsWith('Z') ? iso : iso + 'Z');
  if (Number.isNaN(d.getTime())) return '';
  const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Formats a YYYY-MM-DD or ISO date string as a human-readable date,
// e.g. "1 Nov 2026". Returns the original string if it can't be parsed.
export function formatDate(str) {
  if (!str) return '';
  // Treat YYYY-MM-DD strings as local dates (no UTC shift)
  const d = /^\d{4}-\d{2}-\d{2}$/.test(str)
    ? new Date(`${str}T00:00:00`)
    : new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
