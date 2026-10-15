import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { timeAgo } from '../format';
import { useAuth, useToast } from '../App';

export default function ChatThread() {
  const { id } = useParams();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherProfile, setOtherProfile] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();
  const { pushToast } = useToast() || {};
  const bottomRef = useRef(null);

  const load = useCallback(() => {
    api(`/api/conversations/${id}/messages`).then((d) => {
      setError(''); // clear any previous error on a successful load
      setConv(d.conversation || null);
      setMessages(d.messages || []);
    }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000); // light polling for new messages
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { bottomRef.current && bottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Fetch the other person's public profile for the side panel.
  useEffect(() => {
    if (!conv || !user) return;
    const a = conv.user_a || {};
    const b = conv.user_b || {};
    const other = a.id === user.id ? b : a;
    if (other && other.id) {
      api(`/api/users/${other.id}`).then(setOtherProfile).catch(() => {});
    }
  }, [conv, user]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setDraft('');
    try {
      const { message } = await api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body } });
      setMessages((ms) => [...ms, message]);
    } catch (err) {
      if (pushToast) pushToast({ title: 'Message not sent', body: err.message });
      else alert(err.message);
      // Restore the draft so the user doesn't lose their message
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  if (authLoading) return <div className="container"><div className="empty">Loading…</div></div>;
  if (!user) return <div className="container"><div className="empty"><h3>Please log in</h3><Link to="/login" className="btn">Log in</Link></div></div>;
  if (error) return <div className="container"><div className="empty"><h3>Chat not found</h3><Link to="/chats" className="btn">Back to chats</Link></div></div>;
  if (!conv) return <div className="container"><div className="empty">Loading…</div></div>;

  const a = conv.user_a || {};
  const b = conv.user_b || {};
  const other = a.id === user.id ? b : a;
  const op = (otherProfile && otherProfile.user) || {};
  const initial = (other.name || '?')[0].toUpperCase();

  return (
    <div className="container">
      <div className="chat-split">
        <aside className="frost-card chat-peer">
          <Link to="/chats" className="chat-back">← All chats</Link>
          <div className="avatar lg" style={{ margin: '14px auto 10px' }}>{other.avatar_url ? <img src={other.avatar_url} alt={other.name} /> : initial}</div>
          <h3 className="serif" style={{ textAlign: 'center', margin: '0 0 2px', fontSize: 22 }}>
            {other.id ? <Link to={`/u/${other.id}`}>{other.name || 'Roomie user'}</Link> : (other.name || 'Roomie user')}
          </h3>
          <p className="card-meta" style={{ textAlign: 'center', margin: '0 0 10px' }}>
            {op.occupation ? `💼 ${op.occupation}` : 'Flatmate chat'}
          </p>
          {op.bio && <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink-soft)' }}>{op.bio}</p>}
          <div className="chat-about-listing">
            <div className="card-meta" style={{ marginBottom: 4 }}>About this listing</div>
            <Link to={`/listing/${conv.listing_id}`} style={{ fontWeight: 700, color: 'var(--brand-dark)', fontSize: 14.5 }}>
              {conv.listing_title || 'View listing'} →
            </Link>
          </div>
          {other.id && <Link to={`/u/${other.id}`} className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: 14 }}>View full profile</Link>}
          <p className="card-meta" style={{ marginTop: 14, fontSize: 12.5, lineHeight: 1.6 }}>
            🔒 Stay safe: keep chatting here until you've met. Never pay in advance.
          </p>
        </aside>

        <div className="chat-layout chat-thread-card">
          <div className="chat-main">
            <div className="chat-head">
              {other.name || 'Chat'}
            </div>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="empty" style={{ padding: '40px 16px' }}>
                  <h3>Say hello 👋</h3>
                  <p>Introduce yourself — where you work, when you want to move in.</p>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.sender_id === user.id ? 'mine' : 'theirs'}`}>
                  {m.body}
                  <span className="t">{timeAgo(m.created_at)}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form className="chat-input" onSubmit={send}>
              <input className="input" placeholder="Write a message…" value={draft} onChange={(e) => setDraft(e.target.value)} disabled={sending} />
              <button className="btn btn-brand" type="submit" disabled={sending}>{sending ? '…' : 'Send'}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
