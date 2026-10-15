import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../App';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name, phone: user.phone || '', occupation: user.occupation || '',
    bio: user.bio || '', gender: user.gender || '',
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setError(''); setSaved(false);
    try {
      const { user: u } = await api('/api/auth/me', { method: 'PATCH', body: form });
      setUser(u); setSaved(true);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <h1 className="page-title">Your profile</h1>
      <p className="page-sub">This is what owners and flatmates see about you.</p>
      {error && <div className="alert error">{error}</div>}
      {saved && <div className="alert ok">Profile updated.</div>}
      <div className="detail-card">
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
          <button className="btn" style={{ marginTop: 16 }} type="submit">Save profile</button>
        </form>
      </div>
    </div>
  );
}
