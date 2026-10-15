import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { timeAgo } from '../format';
import ListingCard from '../components/ListingCard';

// What other users see: public fields only, plus active listings.
// Email/phone are never exposed — contact goes through in-app chat.
export default function PublicProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/users/${id}`).then(setProfile).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="container"><div className="empty"><h3>User not found</h3><Link to="/search" className="btn">Browse rooms</Link></div></div>;
  if (!profile) return <div className="container"><div className="empty">Loading…</div></div>;

  const u = profile.user;
  const initial = (u.name || '?')[0].toUpperCase();

  return (
    <div className="container">
      <div className="profile-head dots-light">
        <div className="avatar lg">{p.avatar_url ? <img src={p.avatar_url} alt={p.name} /> : initial}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1>{u.name}</h1>
          <p className="p-sub">
            {u.occupation ? `💼 ${u.occupation} · ` : ''}{u.created_at ? `on Roomie ${timeAgo(u.created_at)}` : ''}
          </p>
        </div>
        <div className="profile-stats">
          <div className="pstat"><div className="n">{profile.listing_count}</div><div className="l">Listings</div></div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="detail-card">
          <h3>About</h3>
          {u.bio
            ? <p style={{ lineHeight: 1.7, marginTop: 0 }}>{u.bio}</p>
            : <p className="card-meta" style={{ marginTop: 0 }}>This user hasn't written a bio yet.</p>}
          <p className="card-meta">🔒 Contact details stay private — chat with them about a listing to get in touch.</p>
        </div>
        <div className="detail-card">
          <h3>Their listings</h3>
          {profile.listings.length === 0
            ? <p className="card-meta" style={{ marginTop: 0 }}>No active listings right now.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {profile.listings.map((l) => (
                  <Link key={l.id} to={`/listing/${l.id}`} className="notif" style={{ marginBottom: 0 }}>
                    {l.images && l.images[0]
                      ? <img src={l.images[0]} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
                      : <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--bg-deep)', flexShrink: 0 }} />}
                    <div className="body">
                      <div className="title">{l.title}</div>
                      <div className="text">{l.area}, {l.city}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h2>More homes</h2><Link to="/search">View all</Link></div>
        <div className="grid">
          {profile.listings.slice(0, 4).map((l) => <ListingCard key={l.id} listing={l} compact />)}
        </div>
      </div>
    </div>
  );
}
