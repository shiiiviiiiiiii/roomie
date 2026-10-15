import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

// First-run profile completion for new accounts. Skippable — nothing here
// is required to use Roomie, but a filled profile gets more responses.
export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    occupation: user.occupation || '',
    bio: user.bio || '',
    gender: user.gender || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const finish = async (patch) => {
    setSaving(true); setError('');
    try {
      const { user: u } = await api('/api/auth/me', { method: 'PATCH', body: { ...patch, profile_completed: true } });
      setUser(u);
      navigate('/');
    } catch (e) { setError(e.message); setSaving(false); }
  };

  const save = (e) => {
    e.preventDefault();
    finish({
      name: form.name.trim() || undefined,
      phone: form.phone.trim() || null,
      occupation: form.occupation.trim() || null,
      bio: form.bio.trim() || null,
      gender: form.gender || null,
    });
  };

  const skip = () => finish({});

  return (
    <div className="container">
      <div className="auth-wrap" style={{ maxWidth: 520 }}>
        <span className="eyebrow">Welcome to Roomie</span>
        <h1>Tell us about you</h1>
        <p className="sub">Owners respond faster to complete profiles. You can skip this and fill it in later.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={save}>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" />
          <div className="form-row">
            <div><label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 …" /></div>
            <div><label className="label">Occupation</label>
              <input className="input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="e.g. Software engineer" /></div>
          </div>
          <label className="label">About you</label>
          <textarea className="textarea" value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Work hours, habits, what you're looking for…" />
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-brand" style={{ flex: 1 }} type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save & continue'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={skip} disabled={saving}>Skip</button>
          </div>
        </form>
      </div>
    </div>
  );
}
