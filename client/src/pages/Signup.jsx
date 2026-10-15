import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', occupation: '', gender: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await signup(form); navigate('/'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const google = async () => {
    setError(''); setBusy(true);
    try { await loginWithGoogle(); navigate('/'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="container">
      <div className="auth-wrap">
        <h1>Create your account</h1>
        <p className="sub">Free forever. Post rooms, chat and book visits.</p>
        {error && <div className="alert error">{error}</div>}
        <button className="btn btn-outline" style={{ width: '100%', marginBottom: 16 }} type="button" onClick={google} disabled={busy}>
          Continue with Google
        </button>
        <div className="or-divider"><span>or</span></div>
        <form onSubmit={submit}>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
          <label className="label">Password (min 6 characters)</label>
          <input className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
          <div className="form-row">
            <div><label className="label">Phone (optional)</label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 …" /></div>
            <div><label className="label">Occupation (optional)</label>
              <input className="input" value={form.occupation} onChange={(e) => set('occupation', e.target.value)} /></div>
          </div>
          <button className="btn" style={{ width: '100%', marginTop: 18 }} type="submit" disabled={busy}>Create account</button>
        </form>
        <p style={{ marginTop: 16, fontSize: 14 }}>Already have an account? <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600 }}>Log in</Link></p>
      </div>
    </div>
  );
}
