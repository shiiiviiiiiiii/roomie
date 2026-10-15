import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { inr, timeAgo } from '../format';
import ListingCard from '../components/ListingCard';
import { useAuth } from '../App';

export default function Dashboard() {
  const [tab, setTab] = useState('listings');
  const [mine, setMine] = useState([]);
  const [saved, setSaved] = useState([]);
  const [visits, setVisits] = useState([]);
  const { user } = useAuth();

  const load = () => {
    api('/api/listings?mine=1&limit=100').then((d) => setMine(d.listings)).catch(() => {});
    api('/api/listings/saved/mine').then((d) => setSaved(d.listings)).catch(() => {});
    api('/api/visits').then((d) => setVisits(d.visits)).catch(() => {});
  };
  useEffect(load, []);

  const toggleSave = async (listing) => {
    const { saved: s } = await api(`/api/listings/${listing.id}/save`, { method: 'POST' });
    if (!s) setSaved((xs) => xs.filter((x) => x.id !== listing.id));
  };

  const del = async (id) => {
    if (!confirm('Delete this listing permanently?')) return;
    await api(`/api/listings/${id}`, { method: 'DELETE' });
    load();
  };

  const setVisitStatus = async (id, status) => {
    try {
      await api(`/api/visits/${id}`, { method: 'PATCH', body: { status } });
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="container">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Welcome back, {user.name}.</p>

      <div className="tabs">
        {['listings', 'saved', 'visits'].map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'listings' ? 'My listings' : t === 'saved' ? 'Saved homes' : 'Visits'}
          </button>
        ))}
      </div>

      {tab === 'listings' && (
        mine.length === 0
          ? <div className="empty"><h3>No listings yet</h3><p>Post your first room to get started.</p><Link to="/post" className="btn">Post a room</Link></div>
          : <div>
              {mine.map((l) => (
                <div key={l.id} className="notif">
                  <div className="body">
                    <Link to={`/listing/${l.id}`} className="title">{l.title}</Link>
                    <div className="text">{l.area}, {l.city} · {inr(l.rent)}/month · {timeAgo(l.created_at)}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => del(l.id)}>Delete</button>
                </div>
              ))}
            </div>
      )}

      {tab === 'saved' && (
        saved.length === 0
          ? <div className="empty"><h3>No saved homes</h3><p>Tap the heart on any listing to save it here.</p><Link to="/search" className="btn">Browse rooms</Link></div>
          : <div className="grid" style={{ marginBottom: 40 }}>{saved.map((l) => <ListingCard key={l.id} listing={l} onToggleSave={toggleSave} />)}</div>
      )}

      {tab === 'visits' && (
        visits.length === 0
          ? <div className="empty"><h3>No visits scheduled</h3><p>Request a visit from any listing page.</p></div>
          : <table className="table">
              <thead><tr><th>Listing</th><th>When</th><th>With</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {visits.map((v) => {
                  const iAmOwner = v.owner_id === user.id;
                  return (
                    <tr key={v.id}>
                      <td><Link to={`/listing/${v.listing_id}`} style={{ fontWeight: 600 }}>{v.listing_title}</Link><br /><span className="card-meta">{v.listing_city}</span></td>
                      <td>{new Date(v.scheduled_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>{iAmOwner ? v.requester_name : v.owner_name}</td>
                      <td><span className={`pill ${v.status}`}>{v.status}</span></td>
                      <td>
                        {v.status === 'pending' && iAmOwner && (
                          <span style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm" onClick={() => setVisitStatus(v.id, 'confirmed')}>Confirm</button>
                            <button className="btn btn-outline btn-sm" onClick={() => setVisitStatus(v.id, 'declined')}>Decline</button>
                          </span>
                        )}
                        {v.status === 'pending' && !iAmOwner && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setVisitStatus(v.id, 'cancelled')}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
      )}
    </div>
  );
}
