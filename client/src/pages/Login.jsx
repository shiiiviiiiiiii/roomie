import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const afterAuth = (profile) => {
    navigate(profile && profile.profile_completed === false ? '/welcome' : '/');
  };

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { afterAuth(await login(email, password)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const google = async () => {
    setError(''); setBusy(true);
    try { afterAuth(await loginWithGoogle()); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="container">
      <div className="auth-wrap">
        <h1>Welcome back</h1>
        <p className="sub">Log in to manage your listings, chats and visits.</p>
        {error && <div className="alert error">{error}</div>}
        <button className="btn btn-outline" style={{ width: '100%', marginBottom: 16 }} type="button" onClick={google} disabled={busy}>
          Continue with Google
        </button>
        <div className="or-divider"><span>or</span></div>
        <form onSubmit={submit}>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn" style={{ width: '100%', marginTop: 18 }} type="submit" disabled={busy}>Log in</button>
        </form>
        <div className="stub-note">
          Phone (OTP) sign-in is stubbed in this build — it needs an SMS provider to be enabled (see README).
        </div>
        <p style={{ marginTop: 16, fontSize: 14 }}>New to Roomie? <Link to="/signup" style={{ color: 'var(--brand)', fontWeight: 600 }}>Create an account</Link></p>
      </div>
    </div>
  );
}
