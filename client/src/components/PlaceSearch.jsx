import { useEffect, useRef, useState } from 'react';

// Free place autocomplete (OpenStreetMap Nominatim). Type to get suggestions,
// pick one to get { lat, lng, name }. Biased to India; no API key needed.
export async function searchPlaces(query, limit = 5) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&countrycodes=in&q=${encodeURIComponent(query)}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error('Place search failed — try again');
  const arr = await res.json();
  return arr.map((p) => ({
    lat: Number(p.lat),
    lng: Number(p.lon),
    name: p.display_name.split(',').slice(0, 3).join(','),
    full: p.display_name,
  }));
}

export default function PlaceSearch({ value, onChange, onSelect, placeholder, autoFocus }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const boxRef = useRef(null);
  const timerRef = useRef(null);

  // Debounced search as the user types (Nominatim asks for ≤1 req/sec).
  useEffect(() => {
    clearTimeout(timerRef.current);
    const q = (value || '').trim();
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchPlaces(q);
        setResults(r);
        setOpen(true);
        setHighlight(-1);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 450);
    return () => clearTimeout(timerRef.current);
  }, [value]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (p) => {
    setOpen(false);
    setResults([]);
    onChange(p.name);
    onSelect(p);
  };

  const onKey = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h - 1 + results.length) % results.length); }
    else if (e.key === 'Enter' && highlight >= 0) { e.preventDefault(); pick(results[highlight]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div className="place-search" ref={boxRef}>
      <input
        className="input"
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder || 'Search for an area…'}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true); }}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="place-results" role="listbox">
          {results.map((p, i) => (
            <li
              key={`${p.lat},${p.lng},${i}`}
              role="option"
              aria-selected={i === highlight}
              className={i === highlight ? 'hl' : ''}
              onMouseDown={(e) => { e.preventDefault(); pick(p); }}
              onMouseEnter={() => setHighlight(i)}
              title={p.full}
            >
              <span className="pin">📍</span>
              <span>{p.name}</span>
            </li>
          ))}
        </ul>
      )}
      {loading && <span className="place-loading">…</span>}
    </div>
  );
}
