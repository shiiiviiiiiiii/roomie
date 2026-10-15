import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { CITIES, BHK_OPTIONS, ROOM_TYPE_LABELS, FURNISHING_LABELS, TENANT_LABELS, inrShort } from '../format';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../App';

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const f = {
    city: params.get('city') || '',
    q: params.get('q') || '',
    min_rent: params.get('min_rent') || '',
    max_rent: params.get('max_rent') || '',
    bhk: params.get('bhk') || '',
    room_type: params.get('room_type') || '',
    furnishing: params.get('furnishing') || '',
    tenant_preference: params.get('tenant_preference') || '',
    sort: params.get('sort') || 'newest',
  };

  useEffect(() => {
    setLoading(true);
    api(`/api/listings?${params.toString()}`).then((d) => {
      setListings(d.listings); setTotal(d.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [params]);

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next);
  };

  const toggleSave = async (listing) => {
    if (!user) { navigate('/login'); return; }
    try {
      const { saved } = await api(`/api/listings/${listing.id}/save`, { method: 'POST' });
      setListings((xs) => xs.map((x) => (x.id === listing.id ? { ...x, is_saved: saved } : x)));
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="container">
      <h1 className="page-title">Find a room</h1>
      <p className="page-sub">{total} {total === 1 ? 'home' : 'homes'} available</p>

      <div className="filters">
        <div className="field">
          <label>Keyword</label>
          <input className="input" placeholder="Area, title…" value={f.q} onChange={(e) => set('q', e.target.value)} />
        </div>
        <div className="field">
          <label>City</label>
          <select className="select" value={f.city} onChange={(e) => set('city', e.target.value)}>
            <option value="">All cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Min rent</label>
          <select className="select" value={f.min_rent} onChange={(e) => set('min_rent', e.target.value)}>
            <option value="">No min</option>
            {[5000, 10000, 15000, 20000, 30000].map((v) => <option key={v} value={v}>{inrShort(v)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Max rent</label>
          <select className="select" value={f.max_rent} onChange={(e) => set('max_rent', e.target.value)}>
            <option value="">No max</option>
            {[10000, 15000, 20000, 30000, 50000].map((v) => <option key={v} value={v}>{inrShort(v)}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Size</label>
          <select className="select" value={f.bhk} onChange={(e) => set('bhk', e.target.value)}>
            <option value="">Any</option>
            {BHK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Room type</label>
          <select className="select" value={f.room_type} onChange={(e) => set('room_type', e.target.value)}>
            <option value="">Any</option>
            {Object.entries(ROOM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Furnishing</label>
          <select className="select" value={f.furnishing} onChange={(e) => set('furnishing', e.target.value)}>
            <option value="">Any</option>
            {Object.entries(FURNISHING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Looking for</label>
          <select className="select" value={f.tenant_preference} onChange={(e) => set('tenant_preference', e.target.value)}>
            <option value="">Any</option>
            {Object.entries(TENANT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Sort by</label>
          <select className="select" value={f.sort} onChange={(e) => set('sort', e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </div>
      </div>

      {loading ? <div className="empty">Searching…</div> : (
        listings.length === 0
          ? <div className="empty"><h3>No homes match those filters</h3><p>Try widening the budget or clearing a filter.</p></div>
          : <div className="grid" style={{ marginBottom: 48 }}>{listings.map((l) => <ListingCard key={l.id} listing={l} onToggleSave={toggleSave} />)}</div>
      )}
    </div>
  );
}
