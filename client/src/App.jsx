import { createContext, useCallback, useContext, useEffect, useRef, useState, Component } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import PublicProfile from './pages/PublicProfile';
import Onboarding from './pages/Onboarding';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Cookies from './pages/Cookies';
import ConsentBanner from './components/ConsentBanner';
import { openCookieSettings } from './consent';
import { COFFEE_URL, COFFEE_LABEL } from './config';
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
      return await refreshProfile();
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
      return profile;
    } catch (e) { throw new Error(friendlyAuthError(e)); }
  };

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Google sign-in is not configured yet');
    try {
      await signInWithPopup(auth, googleProvider);
      return await refreshProfile();
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
  const location = useLocation();
  const { pushToast } = useToast() || {};
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const seenRef = useRef(null); // null until the first poll seeds it

  useEffect(() => {
    if (!user) { setUnread(0); seenRef.current = null; return; }
    const load = () => api('/api/notifications', { noCache: true }).then((d) => {
      setUnread(d.unread_count);
      const list = d.notifications || [];
      if (seenRef.current === null) {
        // First poll seeds the seen set — no toasts for old alerts.
        seenRef.current = new Set(list.map((n) => n.id));
        return;
      }
      const fresh = list.filter((n) => !seenRef.current.has(n.id));
      fresh.forEach((n) => seenRef.current.add(n.id));
      // Oldest first so the newest toast ends up on top.
      fresh.reverse().forEach((n) => {
        // Don't pop a toast for the page the user is already looking at.
        if (pushToast && n.link && n.link !== location.pathname) {
          pushToast({ title: n.title || 'New alert', body: n.body, link: n.link });
        }
      });
    }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user, pushToast, location.pathname]);

  const go = (to) => { setMenuOpen(false); navigate(to); };

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
              <Link to="/post" className="btn btn-sm hide-mobile">+ Post a room</Link>
              <Link to="/profile" className="btn btn-ghost btn-sm hide-mobile">{(user.name || 'Profile').split(' ')[0]}</Link>
              <button className="btn btn-ghost btn-sm hide-mobile" onClick={async () => { await logout(); navigate('/'); }}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm hide-mobile">Log in</Link>
              <Link to="/signup" className="btn btn-sm hide-mobile">Sign up</Link>
            </>
          )}
        </div>
        <button className="nav-toggle" type="button" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      <div className={`nav-menu-mobile ${menuOpen ? 'open' : ''}`}>
        <Link to="/search" onClick={() => setMenuOpen(false)}>Find a room</Link>
        {user && <Link to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>}
        {user && <Link to="/chats" onClick={() => setMenuOpen(false)}>Chats</Link>}
        {user && <Link to="/notifications" onClick={() => setMenuOpen(false)}>Alerts{unread > 0 ? ` (${unread})` : ''}</Link>}
        {user && <Link to="/post" onClick={() => setMenuOpen(false)}>+ Post a room</Link>}
        {user && <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>}
        {user && user.role === 'admin' && <Link to="/admin" onClick={() => setMenuOpen(false)}>Moderation</Link>}
        {user
          ? <a href="#" onClick={(e) => { e.preventDefault(); logout().then(() => go('/')); }}>Log out</a>
          : <><Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link><Link to="/signup" onClick={() => setMenuOpen(false)}>Sign up</Link></>}
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

// Reddit-style popup toasts for incoming alerts (new messages, visit
// updates…). Blocking `alert()` dialogs are never used for these.
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((t) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((ts) => [...ts.slice(-2), { ...t, id }]); // keep max 3 stacked
    setTimeout(() => {
      setToasts((ts) => ts.filter((x) => x.id !== id));
    }, 6000);
  }, []);

  const open = (t) => {
    dismiss(t.id);
    if (t.link) navigate(t.link);
  };

  return (
    <ToastCtx.Provider value={{ pushToast, dismiss }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" role="button" tabIndex={0}
            onClick={() => open(t)}
            onKeyDown={(e) => { if (e.key === 'Enter') open(t); }}>
            <div className="toast-title">{t.title}</div>
            {t.body && <div className="toast-body">{t.body}</div>}
            <button type="button" aria-label="Dismiss" className="toast-x"
              onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}>✕</button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// Catches render crashes anywhere below and offers a retry instead of a
// blank page. Shows the technical error in a collapsed panel so it can be
// reported, and resets itself whenever the route changes.
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('[roomie] render crash:', error, info);
    this.setState({ info });
  }
  componentDidUpdate(prevProps) {
    if (this.props.routeKey !== prevProps.routeKey && this.state.error) {
      this.setState({ error: null, info: null });
    }
  }
  render() {
    if (!this.state.error) return this.props.children;
    const msg = String((this.state.error && this.state.error.message) || this.state.error);
    const stack = this.state.info && this.state.info.componentStack;
    return (
      <div className="container">
        <div className="empty">
          <h3>Something went wrong</h3>
          <p>The page hit an unexpected error. Your data is safe.</p>
          <button className="btn" type="button" onClick={() => { this.setState({ error: null, info: null }); window.location.reload(); }}>Reload the page</button>
          {import.meta.env.DEV && (
            <details style={{ marginTop: 18, textAlign: 'left', fontSize: 12.5, color: 'var(--muted)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Technical details (for bug reports)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'var(--bg-deep)', padding: 12, borderRadius: 8, marginTop: 8 }}>{msg}{stack ? `\n${stack}` : ''}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

// Inner shell (inside the Router) so we can key the error boundary on the
// current route — a crash on one page clears itself when you navigate away.
function Shell() {
  const location = useLocation();
  return (
    <>
      <Navbar />
      <ErrorBoundary routeKey={location.pathname}>
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
          <Route path="/u/:id" element={<PublicProfile />} />
          <Route path="/welcome" element={<RequireAuth><Onboarding /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookies" element={<Cookies />} />
        </Routes>
      </ErrorBoundary>
      <footer className="footer">
        <div className="container">
          <span className="footer-brand">Roomie<span>.</span></span>
          <span className="footer-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/cookies">Cookies</Link>
            <button type="button" className="link-btn" onClick={openCookieSettings}>Cookie settings</button>
            {COFFEE_URL && <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, color: 'var(--brand-dark)' }}>☕ {COFFEE_LABEL}</a>}
          </span>
          <span>Find rooms & flatmates across India.</span>
        </div>
      </footer>
      <ConsentBanner />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
