import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { CITIES, inrShort } from '../format';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../App';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [city, setCity] = useState('');
  const [q, setQ] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    api('/api/listings?limit=8').then((d) => setFeatured(d.listings)).catch(() => {});
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
      <div className="hero">
        <h1>Find your room. Find your people.</h1>
        <p>Rooms, flatmates and flatshares across Mumbai, Hyderabad, Bangalore, Pune and Delhi NCR — posted by real people, not brokers.</p>
        <form className="searchbar" onSubmit={submit}>
          <input className="input" placeholder="Search area, keyword…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="select" value={maxRent} onChange={(e) => setMaxRent(e.target.value)}>
            <option value="">Any budget</option>
            <option value="10000">Under {inrShort(10000)}</option>
            <option value="15000">Under {inrShort(15000)}</option>
            <option value="20000">Under {inrShort(20000)}</option>
            <option value="30000">Under {inrShort(30000)}</option>
          </select>
          <button className="btn" type="submit">Search</button>
        </form>
      </div>

      <div className="section">
        <div className="section-head">
          <h2>Browse by city</h2>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {CITIES.map((c) => (
            <Link key={c} to={`/search?city=${encodeURIComponent(c)}`} className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{c}</div>
              <div className="card-meta" style={{ marginTop: 4 }}>Rooms & flatmates →</div>
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
        <div className="card" style={{ padding: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 6px' }}>Have a spare room?</h2>
            <p className="card-meta" style={{ margin: 0 }}>List it in under two minutes and meet your next flatmate.</p>
          </div>
          <Link to={user ? '/post' : '/signup'} className="btn">Post a room — it's free</Link>
        </div>
      </div>
    </div>
  );
}
