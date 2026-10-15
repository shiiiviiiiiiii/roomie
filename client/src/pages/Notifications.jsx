import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { timeAgo } from '../format';

export default function Notifications() {
  const [notifs, setNotifs] = useState([]);

  const load = () => api('/api/notifications').then((d) => setNotifs(d.notifications)).catch(() => {});
  useEffect(load, []);

  const markAll = async () => {
    await api('/api/notifications/read-all', { method: 'POST' });
    load();
  };

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="section-head" style={{ marginTop: 28 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Alerts</h1>
        {notifs.some((n) => !n.is_read) && <button className="btn btn-ghost btn-sm" onClick={markAll}>Mark all read</button>}
      </div>
      {notifs.length === 0 && <div className="empty"><h3>All caught up</h3><p>Messages, visit updates and moderation alerts will appear here.</p></div>}
      {notifs.map((n) => (
        <Link key={n.id} to={n.link || '/notifications'} className={`notif ${n.is_read ? '' : 'unread'}`}
          onClick={() => !n.is_read && api(`/api/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {})}>
          <div className="body">
            <div className="title">{n.title}</div>
            {n.body && <div className="text">{n.body}</div>}
            <div className="text" style={{ fontSize: 12 }}>{timeAgo(n.created_at)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
