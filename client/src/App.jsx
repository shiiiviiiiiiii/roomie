import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, updateProfile, signOut,
} from 'firebase/auth';
import { api } from './api';
import { auth, googleProvider } from './firebase';
import Home from './pages/Home';
import Browse from './pages/Browse';
import ListingDetail from './pages/ListingDetail';
import PostRoom from './pages/PostRoom';
import Dashboard from './pages/Dashboard';
import Chats from './pages/Chats';
import ChatThread from './pages/ChatThread';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import ConsentBanner from './components/ConsentBanner';
import { openCookieSettings } from './consent';
import './styles.css';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

function friendlyAuthError(err) {
  const code = err && err.code ? err.code : '';
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists';
  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Invalid email or password';
  }
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters';
  if (code === 'auth/invalid-email') return 'Enter a valid email address';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was cancelled';
  }
  if (code === 'auth/network-request-failed') return 'Network error — check your connection and try again';
  return (err && err.message) || 'Something went wrong';
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the server profile (name, role, …) for the signed-in Firebase user.
  // The server provisions the users/{uid} document on the first call.
  const refreshProfile = useCallback(async () => {
    if (!auth || !auth.currentUser) { setUser(null); return null; }
    const { user: profile } = await api('/api/auth/me');
    setUser(profile);
    return profile;
  }, []);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) { setUser(null); setLoading(false); return; }
      refreshProfile().catch(() => setUser(null)).finally(() => setLoading(false));
    });
    return unsub;
  }, [refreshProfile]);

  const login = async (email, password) => {
    if (!auth) throw new Error('Sign-in is not configured yet');
    try {
      await signInWithEmailAndPassword(auth, String(email).trim(), password);
      await refreshProfile();
    } catch (e) { throw new Error(friendlyAuthError(e)); }
  };

  const signup = async ({ name, email, password, phone, occupation, gender }) => {
    if (!auth) throw new Error('Sign-up is not configured yet');
    try {
      const cred = await createUserWithEmailAndPassword(auth, String(email).trim(), password);
      const displayName = String(name || '').trim();
      if (displayName) {
        await updateProfile(cred.user, { displayName });
        // Force a fresh ID token so the displayName claim reaches the server.
        await cred.user.getIdToken(true);
      }
      await refreshProfile(); // provisions the server profile doc
      const { user: profile } = await api('/api/auth/me', {
        method: 'PATCH',
        body: {
          name: displayName || undefined,
          phone: phone ? String(phone).trim() : null,
          occupation: occupation ? String(occupation).trim() : null,
          gender: gender ? String(gender).trim() : null,
        },
      });
      setUser(profile);
    } catch (e) { throw new Error(friendlyAuthError(e)); }
  };

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Google sign-in is not configured yet');
    try {
      await signInWithPopup(auth, googleProvider);
      await refreshProfile();
    } catch (e) { throw new Error(friendlyAuthError(e)); }
  };

  const logout = async () => {
    if (auth) await signOut(auth);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, setUser, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  );
}

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    const load = () => api('/api/notifications').then((d) => setUnread(d.unread_count)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="logo">Roomie<span>.</span></Link>
        <div className="nav-links">
          <NavLink to="/search" className={({ isActive }) => isActive ? 'active' : ''}>Find a room</NavLink>
          {user && <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>}
          {user && <NavLink to="/chats" className={({ isActive }) => isActive ? 'active' : ''}>Chats</NavLink>}
          {user && (
            <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'active badge-dot' : 'badge-dot')}>
              Alerts{unread > 0 && <span className="badge-count">{unread}</span>}
            </NavLink>
          )}
          {user && user.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>Moderation</NavLink>
          )}
        </div>
        <div className="nav-right">
          {user ? (
            <>
              <Link to="/post" className="btn btn-sm">+ Post a room</Link>
              <Link to="/profile" className="btn btn-ghost btn-sm">{user.name.split(' ')[0]}</Link>
              <button className="btn btn-ghost btn-sm" onClick={async () => { await logout(); navigate('/'); }}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/signup" className="btn btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container"><div className="empty">Loading…</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Browse />} />
          <Route path="/listing/:id" element={<ListingDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/post" element={<RequireAuth><PostRoom /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/chats" element={<RequireAuth><Chats /></RequireAuth>} />
          <Route path="/chats/:id" element={<RequireAuth><ChatThread /></RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<Cookies />} />
        </Routes>
        <footer className="footer">
          <div className="container">
            <span>Roomie — find rooms &amp; flatmates across India.</span>
            <span className="footer-links">
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/cookies">Cookies</Link>
              <button type="button" className="link-btn" onClick={openCookieSettings}>Cookie settings</button>
            </span>
            <span>Self-hosted build · demo data is fictional</span>
          </div>
        </footer>
        <ConsentBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
