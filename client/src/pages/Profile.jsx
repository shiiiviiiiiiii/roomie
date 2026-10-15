import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import { timeAgo } from '../format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user.name, phone: user.phone || '', occupation: user.occupation || '',
    bio: user.bio || '', gender: user.gender || '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ listings: null, saved: null, chats: null });

  useEffect(() => {
    Promise.allSettled([
      api('/api/listings?mine=1&limit=1'),
      api('/api/listings/saved/mine'),
      api('/api/conversations'),
    ]).then(([a, b, c]) => setStats({
      listings: a.status === 'fulfilled' ? a.value.total : 0,
      saved: b.status === 'fulfilled' ? b.value.listings.length : 0,
      chats: c.status === 'fulfilled' ? c.value.conversations.length : 0,
    }));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setError(''); setSaved(false);
    try {
      const { user: u } = await api('/api/auth/me', { method: 'PATCH', body: form });
      setUser(u); setSaved(true); setEditing(false);
    } catch (err) { setError(err.message); }
  };

  const initial = (user.name || '?')[0].toUpperCase();

  return (
    <div className="container">
      <div className="profile-head dots-light">
        <div className="avatar lg">{initial}</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1>{user.name}</h1>
          <p className="p-sub">{user.email}{user.created_at ? ` · joined ${timeAgo(user.created_at)}` : ''}</p>
          {user.occupation && <p className="p-sub" style={{ marginTop: 2 }}>💼 {user.occupation}</p>}
        </div>
        <button className="btn btn-light btn-sm" type="button" onClick={() => { setEditing((v) => !v); setSaved(false); }}>
          {editing ? '✕ Cancel' : '✎ Edit profile'}
        </button>
        <div className="profile-stats">
          <div className="pstat"><div className="n">{stats.listings ?? '–'}</div><div className="l">Listings</div></div>
          <div className="pstat"><div className="n">{stats.saved ?? '–'}</div><div className="l">Saved</div></div>
          <div className="pstat"><div className="n">{stats.chats ?? '–'}</div><div className="l">Chats</div></div>
        </div>
      </div>

      {!editing ? (
        <div className="profile-grid">
          <div className="detail-card">
            <h3>About</h3>
            {user.bio
              ? <p style={{ lineHeight: 1.7, marginTop: 0 }}>{user.bio}</p>
              : <p className="card-meta" style={{ marginTop: 0 }}>No bio yet — tap “Edit profile” to tell people about yourself.</p>}
            <table className="spec-table"><tbody>
              {user.phone && <tr><td>Phone</td><td><b>{user.phone}</b></td></tr>}
              {user.occupation && <tr><td>Occupation</td><td><b>{user.occupation}</b></td></tr>}
              <tr><td>Email</td><td><b>{user.email}</b></td></tr>
            </tbody></table>
            <p className="card-meta">🔒 Only your name, occupation and bio are visible to other users. Email and phone stay private — contact happens through in-app chat.</p>
          </div>
          <div>
            <div className="detail-card" style={{ marginBottom: 22 }}>
              <h3>Quick links</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/dashboard" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>📋 My dashboard</Link>
                <Link to="/search" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>🔍 Find a room</Link>
                <Link to="/chats" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>💬 My chats</Link>
                <Link to="/post" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>＋ Post a room</Link>
              </div>
            </div>
            <div className="detail-card">
              <h3>Trust & safety</h3>
              <p className="card-meta" style={{ marginTop: 0, lineHeight: 1.6 }}>
                Roomie never shows your exact address publicly — listings display an
                approximate location until you share details over chat. Never pay
                in advance before a visit.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="detail-card" style={{ maxWidth: 640, margin: '26px 0 56px' }}>
          <h3>Edit profile</h3>
          {error && <div className="alert error">{error}</div>}
          {saved && <div className="alert ok">Profile updated.</div>}
          <form onSubmit={submit}>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <div className="form-row">
              <div><label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
              <div><label className="label">Occupation</label>
                <input className="input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} /></div>
            </div>
            <label className="label">About you</label>
            <textarea className="textarea" value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Work hours, habits, what you're looking for…" />
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button className="btn" type="submit">Save profile</button>
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
