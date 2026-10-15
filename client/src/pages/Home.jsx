import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { CITIES, inrShort } from '../format';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../App';
import { COFFEE_URL, COFFEE_LABEL } from '../config';

const FEATURES = [
  { icon: '🤝', lead: 'No brokers', rest: ' — talk to real owners' },
  { icon: '💬', lead: 'Chat directly', rest: ' — no middlemen' },
  { icon: '📅', lead: 'Book visits', rest: ' — pick a slot, show up' },
];

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    api('/api/listings?limit=8').then((d) => setFeatured(d.listings || [])).catch(() => {});
  }, []);

  const toggleSave = async (listing) => {
    if (!user) { navigate('/login'); return; }
    try {
      const { saved } = await api(`/api/listings/${listing.id}/save`, { method: 'POST' });
      setFeatured((xs) => xs.map((x) => (x.id === listing.id ? { ...x, is_saved: saved } : x)));
    } catch (e) { alert(e.message); }
  };

  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (city) p.set('city', city);
    if (q) p.set('q', q);
    if (maxRent) p.set('max_rent', maxRent);
    navigate(`/search?${p.toString()}`);
  };

  return (
    <div className="container">
      <div className="hero dots">
        <div className="hero-inner">
          <span className="eyebrow">Rooms & flatmates across India</span>
          <h1 className="hero-h">
            Find your <span className="dim">room.</span>
            <br />
            Find your <span className="dim">people.</span>
          </h1>
          <p className="hero-sub">
            Rooms, flatmates and flatshares across Mumbai, Hyderabad, Bangalore,
            Pune and Delhi NCR — posted by real people, not brokers.
          </p>
          <form className="hero-search" onSubmit={submit}>
            <div className="hs-field">
              <input placeholder="Search area, keyword…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search area or keyword" />
            </div>
            <div className="hs-field">
              <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="hs-field">
              <select value={maxRent} onChange={(e) => setMaxRent(e.target.value)} aria-label="Budget">
                <option value="">Any budget</option>
                <option value="10000">Under {inrShort(10000)}</option>
                <option value="15000">Under {inrShort(15000)}</option>
                <option value="20000">Under {inrShort(20000)}</option>
                <option value="30000">Under {inrShort(30000)}</option>
              </select>
            </div>
            <button className="btn btn-brand" type="submit">Search</button>
          </form>
          <div className="feature-strip">
            {FEATURES.map((f) => (
              <div className="feat" key={f.lead}>
                <span className="feat-ico">{f.icon}</span>
                <span><b>{f.lead}</b>{f.rest}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Browse by city</h2>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {CITIES.map((c) => (
            <Link key={c} to={`/search?city=${encodeURIComponent(c)}`} className="city-card">
              <div className="city-name">{c}</div>
              <div className="city-go">Rooms & flatmates <b>→</b></div>
            </Link>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Fresh listings</h2>
          <Link to="/search">View all</Link>
        </div>
        <div className="grid">
          {featured.map((l) => <ListingCard key={l.id} listing={l} onToggleSave={toggleSave} />)}
        </div>
        {featured.length === 0 && <div className="empty"><h3>No listings yet</h3><p>Be the first to post a room.</p></div>}
      </div>

      <div className="section">
        <div className="cta-band dots-light">
          <div>
            <h2>Have a spare room?</h2>
            <p>List it in under two minutes and meet your next flatmate. Photos required — listings with photos get far more responses.</p>
          </div>
          <Link to={user ? '/post' : '/signup'} className="btn btn-light btn-lg">Post a room — it's free</Link>
        </div>
      </div>

      {COFFEE_URL && (
        <div className="section">
          <div className="detail-card dots" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18, padding: '30px 32px' }}>
            <div>
              <h3 className="serif" style={{ margin: '0 0 6px', fontSize: 22 }}>Roomie is free, forever.</h3>
              <p className="card-meta" style={{ margin: 0, maxWidth: 520 }}>No commissions, no broker fees. If Roomie helped you find your room or your flatmate, you can support the running costs.</p>
            </div>
            <a className="btn btn-brand" href={COFFEE_URL} target="_blank" rel="noopener noreferrer">☕ {COFFEE_LABEL}</a>
          </div>
        </div>
      )}
    </div>
  );
}
