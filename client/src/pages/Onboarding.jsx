import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';
import ProfilePhotoPicker from '../components/ProfilePhotoPicker';

// First-run profile completion for new accounts. The profile photo is
// mandatory — owners respond faster to profiles with a photo.
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
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || null);
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
    if (!avatarUrl) {
      setError('Please add a profile photo — upload one or take a selfie.');
      return;
    }
    finish({
      name: form.name.trim() || undefined,
      phone: form.phone.trim() || null,
      occupation: form.occupation.trim() || null,
      bio: form.bio.trim() || null,
      gender: form.gender || null,
      avatar_url: avatarUrl,
    });
  };

  return (
    <div className="container">
      <div className="auth-wrap" style={{ maxWidth: 520 }}>
        <span className="eyebrow">Welcome to Roomie</span>
        <h1>Tell us about you</h1>
        <p className="sub">A profile photo is required — owners respond faster to real faces. The rest is optional.</p>
        {error && <div className="alert error">{error}</div>}
        <label className="label">Profile photo *</label>
        <ProfilePhotoPicker currentUrl={avatarUrl} onSave={setAvatarUrl} />
        <form onSubmit={save} style={{ marginTop: 18 }}>
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
          </div>
        </form>
      </div>
    </div>
  );
}
