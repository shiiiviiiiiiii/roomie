import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { timeAgo } from '../format';
import { useAuth } from '../App';

export default function Chats() {
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    api('/api/conversations').then((d) => setConvs(d.conversations)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const other = (c) => (c.user_a.id === user.id ? c.user_b : c.user_a);

  return (
    <div className="container">
      <h1 className="page-title">Chats</h1>
      <p className="page-sub">Conversations with owners and interested flatmates.</p>
      {loading ? <div className="empty">Loading…</div>
        : convs.length === 0 ? <div className="empty"><h3>No chats yet</h3><p>Open a listing and tap “Chat with owner” to start one.</p><Link to="/search" className="btn">Browse rooms</Link></div>
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
