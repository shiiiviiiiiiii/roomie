import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { timeAgo } from '../format';
import { useAuth } from '../App';

export default function Admin() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    api('/api/admin/reports').then((d) => setReports(d.reports)).catch((e) => {
      if (e.message.includes('Admin')) navigate('/');
      else setError(e.message);
    });
    api('/api/admin/stats').then(setStats).catch(() => {});
  };
  useEffect(load, []);

  const resolve = async (id, status) => {
    await api(`/api/admin/reports/${id}`, { method: 'PATCH', body: { status } });
    load();
  };
  const setListingStatus = async (listingId, status) => {
    if (!confirm(`Set listing status to "${status}"?`)) return;
    await api(`/api/admin/listings/${listingId}/status`, { method: 'PATCH', body: { status } });
    load();
  };

  if (user.role !== 'admin') return <div className="container"><div className="empty"><h3>Admins only</h3></div></div>;

  return (
    <div className="container">
      <h1 className="page-title">Moderation</h1>
      <p className="page-sub">Review reported listings and take action.</p>
      {error && <div className="alert error">{error}</div>}
      {stats && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 24 }}>
          <div className="card" style={{ padding: 18 }}><div style={{ fontSize: 26, fontWeight: 800 }}>{stats.open_reports}</div><div className="card-meta">Open reports</div></div>
          <div className="card" style={{ padding: 18 }}><div style={{ fontSize: 26, fontWeight: 800 }}>{stats.total_listings}</div><div className="card-meta">Listings</div></div>
          <div className="card" style={{ padding: 18 }}><div style={{ fontSize: 26, fontWeight: 800 }}>{stats.total_users}</div><div className="card-meta">Users</div></div>
        </div>
      )}
      {reports.length === 0
        ? <div className="empty"><h3>No open reports</h3><p>Nothing needs your attention right now.</p></div>
        : <div className="table-wrap"><table className="table">
            <thead><tr><th>Listing</th><th>Reason</th><th>Reporter</th><th>When</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/listing/${r.listing_id}`} style={{ fontWeight: 600 }}>{r.listing_title}</Link><br /><span className="card-meta">{r.listing_city} · listing {r.listing_status}</span></td>
                  <td><b>{r.reason}</b>{r.details && <><br /><span className="card-meta">{r.details}</span></>}</td>
                  <td>{r.reporter_name}</td>
                  <td>{timeAgo(r.created_at)}</td>
                  <td><span className={`pill ${r.status}`}>{r.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn btn-sm btn-outline" onClick={() => resolve(r.id, 'dismissed')}>Dismiss</button>
                      <button className="btn btn-sm" onClick={() => resolve(r.id, 'resolved')}>Resolve</button>
                      {r.listing_status === 'active'
                        ? <button className="btn btn-sm btn-danger" onClick={() => setListingStatus(r.listing_id, 'hidden')}>Hide listing</button>
                        : <button className="btn btn-sm btn-outline" onClick={() => setListingStatus(r.listing_id, 'active')}>Restore</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>}
    </div>
  );
}
