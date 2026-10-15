import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { timeAgo } from '../format';
import { useAuth } from '../App';

export default function ChatThread() {
  const { id } = useParams();
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();
  const bottomRef = useRef(null);

  const load = () => {
    api(`/api/conversations/${id}/messages`).then((d) => {
      setConv(d.conversation); setMessages(d.messages);
    }).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 8000); // light polling for new messages
    return () => clearInterval(t);
  }, [id]);

  useEffect(() => { bottomRef.current && bottomRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      const { message } = await api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body } });
      setMessages((ms) => [...ms, message]);
    } catch (err) { alert(err.message); }
  };

  if (error) return <div className="container"><div className="empty"><h3>Chat not found</h3><Link to="/chats" className="btn">Back to chats</Link></div></div>;
  if (!conv) return <div className="container"><div className="empty">Loading…</div></div>;

  const other = conv.user_a.id === user.id ? conv.user_b : conv.user_a;

  return (
    <div className="container">
      <div className="chat-layout">
        <div className="chat-main" style={{ gridColumn: '1 / -1' }}>
          <div className="chat-head">
            <Link to="/chats" style={{ marginRight: 12 }}>←</Link>
            {other.name} <span className="card-meta">· <Link to={`/listing/${conv.listing_id}`} style={{ color: 'var(--brand)' }}>{conv.listing_title}</Link></span>
          </div>
          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.sender_id === user.id ? 'mine' : 'theirs'}`}>
                {m.body}
                <span className="t">{timeAgo(m.created_at)}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="chat-input" onSubmit={send}>
            <input className="input" placeholder="Write a message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <button className="btn" type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
