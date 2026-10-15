import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { CITIES, BHK_OPTIONS, ROOM_TYPE_LABELS, FURNISHING_LABELS, TENANT_LABELS, inrShort } from '../format';
import ListingCard from '../components/ListingCard';
import ListingsMap from '../components/ListingsMap';
import PlaceSearch from '../components/PlaceSearch';
import { useAuth } from '../App';

// Free geocoding (OpenStreetMap Nominatim) — turns "near my office/college"
// into coordinates the API can filter by.
async function geocode(text) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(text)}`, {
    headers: { Accept: 'application/json' },
  });
  const arr = await res.json();
  if (!arr.length) throw new Error('Could not find that place — try a nearby landmark.');
  return { lat: Number(arr[0].lat), lng: Number(arr[0].lon), name: arr[0].display_name.split(',').slice(0, 2).join(',') };
}

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [nearText, setNearText] = useState(params.get('near_label') || '');
  const [nearLabel, setNearLabel] = useState(params.get('near_label') || '');
  const [geoError, setGeoError] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'
  const [activePin, setActivePin] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    api(`/api/listings?${params.toString()}`).then((d) => {
      setListings(d.listings || []); setTotal(d.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [params]);

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next);
  };

  const clearFilters = () => {
    setParams(new URLSearchParams());
    setNearText(''); setNearLabel('');
  };

  const applyNearPlace = (g) => {
    setGeoError('');
    const next = new URLSearchParams(params);
    next.set('near_lat', g.lat.toFixed(4));
    next.set('near_lng', g.lng.toFixed(4));
    next.set('near_km', '8');
    next.set('near_label', g.name);
    setParams(next);
    setNearLabel(g.name);
  };

  const applyNear = async (e) => {
    e.preventDefault();
    setGeoError('');
    const t = nearText.trim();
    if (!t) return;
    try {
      const g = await geocode(t);
      applyNearPlace(g);
    } catch (err) { setGeoError(err.message); }
  };

  const clearNear = () => {
    const next = new URLSearchParams(params);
    ['near_lat', 'near_lng', 'near_km', 'near_label'].forEach((k) => next.delete(k));
    setParams(next);
    setNearText(''); setNearLabel('');
  };

  const useMyLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Geolocation is not supported on this device.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = new URLSearchParams(params);
        next.set('near_lat', pos.coords.latitude.toFixed(4));
        next.set('near_lng', pos.coords.longitude.toFixed(4));
        next.set('near_km', '8');
        next.set('near_label', 'your location');
        setParams(next);
        setNearLabel('your location');
      },
      () => setGeoError('Could not get your location — check browser permissions.'),
      { timeout: 10000 }
    );
  };

  const toggleSave = async (listing) => {
    if (!user) { navigate('/login'); return; }
    try {
      const { saved } = await api(`/api/listings/${listing.id}/save`, { method: 'POST' });
      setListings((xs) => xs.map((x) => (x.id === listing.id ? { ...x, is_saved: saved } : x)));
    } catch (e) { alert(e.message); }
  };

  const f = {
    q: params.get('q') || '',
    city: params.get('city') || '',
    max_rent: params.get('max_rent') || '',
    sort: params.get('sort') || 'newest',
  };
  const activeFilterCount = ['city', 'min_rent', 'max_rent', 'bhk', 'room_type', 'furnishing', 'tenant_preference']
    .filter((k) => params.get(k)).length + (params.get('near_lat') ? 1 : 0);

  return (
    <div className="container">
      <span className="eyebrow" style={{ marginTop: 26 }}>Find a room</span>
      <h1 className="page-title" style={{ marginTop: 0 }}>
        {nearLabel ? <>Near <span style={{ color: 'var(--brand-dark)' }}>{nearLabel}</span></> : 'Every home, on one map.'}
      </h1>
      <p className="page-sub">{total} {total === 1 ? 'home' : 'homes'} available{nearLabel ? ' within 8 km' : ''}</p>

      <form className="browse-search" onSubmit={applyNear}>
        <div className="bs-field">
          <input placeholder="Search area, keyword…" value={f.q} onChange={(e) => set('q', e.target.value)} aria-label="Keyword" />
        </div>
        <div className="bs-field">
          <PlaceSearch
            value={nearText}
            onChange={setNearText}
            onSelect={applyNearPlace}
            placeholder="Near office / college…"
          />
        </div>
        <div className="bs-field narrow">
          <select value={f.max_rent} onChange={(e) => set('max_rent', e.target.value)} aria-label="Max budget">
            <option value="">Any budget</option>
            {[10000, 15000, 20000, 30000, 50000].map((v) => <option key={v} value={v}>Under {inrShort(v)}</option>)}
          </select>
        </div>
        <button className="btn btn-brand" type="submit">Search</button>
      </form>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        <button type="button" className="fpill" onClick={useMyLocation}>📍 Use my location</button>
        {nearLabel && <button type="button" className="fpill on" onClick={clearNear}>Near: {nearLabel} <span className="x">✕</span></button>}
      </div>
      {geoError && <div className="alert error" style={{ marginTop: 8 }}>{geoError}</div>}

      <div className="filter-pills">
        <span className="fpill" style={{ cursor: 'default', border: 'none', background: 'none', paddingLeft: 0 }}>
          {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}` : 'Filters'}
        </span>
        <label className={`fpill ${f.city ? 'on' : ''}`}>
          <select value={f.city} onChange={(e) => set('city', e.target.value)} aria-label="City">
            <option value="">City</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className={`fpill ${params.get('bhk') ? 'on' : ''}`}>
          <select value={params.get('bhk') || ''} onChange={(e) => set('bhk', e.target.value)} aria-label="Size">
            <option value="">Size</option>
            {BHK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label className={`fpill ${params.get('room_type') ? 'on' : ''}`}>
          <select value={params.get('room_type') || ''} onChange={(e) => set('room_type', e.target.value)} aria-label="Room type">
            <option value="">Room type</option>
            {Object.entries(ROOM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className={`fpill ${params.get('furnishing') ? 'on' : ''}`}>
          <select value={params.get('furnishing') || ''} onChange={(e) => set('furnishing', e.target.value)} aria-label="Furnishing">
            <option value="">Furnishing</option>
            {Object.entries(FURNISHING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className={`fpill ${params.get('tenant_preference') ? 'on' : ''}`}>
          <select value={params.get('tenant_preference') || ''} onChange={(e) => set('tenant_preference', e.target.value)} aria-label="Looking for">
            <option value="">Looking for</option>
            {Object.entries(TENANT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className={`fpill ${f.sort !== 'newest' ? 'on' : ''}`}>
          <select value={f.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
            <option value="newest">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
        </label>
        {activeFilterCount > 0 && <button type="button" className="fpill" onClick={clearFilters}>Clear all ✕</button>}
      </div>

      <div className="view-toggle">
        <button type="button" className={`fpill ${mobileView === 'list' ? 'on' : ''}`} onClick={() => setMobileView('list')}>☰ List</button>
        <button type="button" className={`fpill ${mobileView === 'map' ? 'on' : ''}`} onClick={() => setMobileView('map')}>🗺 Map</button>
      </div>

      {loading ? <div className="empty">Searching…</div> : (
        listings.length === 0
          ? <div className="empty"><h3>No homes match</h3><p>Try widening the budget{nearLabel ? ', searching a different landmark,' : ''} or clearing a filter.</p></div>
          : (
            <div className={`browse-split ${mobileView === 'map' ? 'show-map' : 'show-list'}`} style={{ marginBottom: 56 }}>
              <div className="browse-list">
                <div className="grid">
                  {listings.map((l) => (
                    <div key={l.id} onMouseEnter={() => setActivePin(l.id)} onMouseLeave={() => setActivePin(null)}>
                      <ListingCard listing={l} onToggleSave={toggleSave} compact />
                    </div>
                  ))}
                </div>
              </div>
              <div className="browse-map">
                <ListingsMap listings={listings} activeId={activePin} onPinClick={(id) => navigate(`/listing/${id}`)} />
              </div>
            </div>
          )
      )}
    </div>
  );
}
