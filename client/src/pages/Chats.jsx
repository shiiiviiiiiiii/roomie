import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { timeAgo } from '../format';
import { useAuth } from '../App';

export default function Chats() {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    api('/api/conversations').then((d) => setConvs(d.conversations || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (authLoading || loading) return <div className="container"><div className="empty">Loading…</div></div>;
  if (!user) return <Navigate to="/login" replace />;

  const other = (c) => {
    const a = c.user_a || {};
    const b = c.user_b || {};
    return a.id === user.id ? b : a;
  };

  return (
    <div className="container">
      <h1 className="page-title">Chats</h1>
      <p className="page-sub">Conversations with owners and interested flatmates.</p>
      {convs.length === 0 ? <div className="empty"><h3>No chats yet</h3><p>Open a listing and tap “Chat with owner” to start one.</p><Link to="/search" className="btn">Browse rooms</Link></div>
        : convs.map((c) => {
            const o = other(c);
            return (
              <Link key={c.id} to={`/chats/${c.id}`} className="notif">
                <div className="avatar">{(o.name || '?')[0].toUpperCase()}</div>
                <div className="body">
                  <div className="title">{o.name} <span className="card-meta">· {c.listing_title}</span></div>
                  <div className="text">{c.last_message ? c.last_message.body : 'No messages yet'}</div>
                </div>
                {c.last_message && <span className="card-meta">{timeAgo(c.last_message.created_at)}</span>}
              </Link>
            );
          })}
    </div>
  );
}
