import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { inr, ROOM_TYPE_LABELS, FURNISHING_LABELS, TENANT_LABELS, timeAgo } from '../format';
import MapView from '../components/MapView';
import { useAuth } from '../App';

const REPORT_REASONS = ['Spam or scam', 'Wrong details', 'Already rented', 'Inappropriate content', 'Other'];

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [photo, setPhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitNote, setVisitNote] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [notice, setNotice] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api(`/api/listings/${id}`).then((d) => setListing(d.listing)).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container"><div className="empty">Loading…</div></div>;
  if (error) return <div className="container"><div className="empty"><h3>Listing not found</h3><p>{error}</p><Link to="/search" className="btn">Back to search</Link></div></div>;

  const l = listing;
  const isOwner = user && (user.id === l.user_id || user.role === 'admin');

  const needAuth = () => { if (!user) { navigate('/login'); return true; } return false; };

  const toggleSave = async () => {
    if (needAuth()) return;
    try {
      const { saved } = await api(`/api/listings/${l.id}/save`, { method: 'POST' });
      setListing({ ...l, is_saved: saved });
    } catch (e) { alert(e.message); }
  };

  const startChat = async () => {
    if (needAuth()) return;
    try {
      const { conversation } = await api('/api/conversations', { method: 'POST', body: { listing_id: l.id } });
      navigate(`/chats/${conversation.id}`);
    } catch (e) { alert(e.message); }
  };

  const requestVisit = async () => {
    if (needAuth()) return;
    if (!visitDate) { alert('Pick a date and time for the visit.'); return; }
    try {
      await api('/api/visits', { method: 'POST', body: { listing_id: l.id, scheduled_at: visitDate, note: visitNote } });
      setNotice('Visit requested! The owner has been notified and can confirm it.');
      setVisitDate(''); setVisitNote('');
    } catch (e) { alert(e.message); }
  };

  const submitReport = async () => {
    if (needAuth()) return;
    try {
      await api(`/api/listings/${l.id}/report`, { method: 'POST', body: { reason: reportReason, details: reportDetails } });
      setShowReport(false); setReportDetails('');
      setNotice('Thanks — our moderators will review this listing.');
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="container">
      <div className="detail">
        <div>
          {l.images && l.images.length > 0 ? (
            <>
              <img className="gallery-main" src={l.images[photo]} alt={l.title} />
              {l.images.length > 1 && (
                <div className="gallery-thumbs">
                  {l.images.map((src, i) => (
                    <img key={i} src={src} alt="" className={i === photo ? 'active' : ''} onClick={() => setPhoto(i)} />
                  ))}
                </div>
              )}
            </>
          ) : <div className="gallery-main" />}

          <h1 className="page-title">{l.title}</h1>
          <p className="page-sub">{l.area}, {l.city} · listed {timeAgo(l.created_at)}</p>
          {l.description && <p style={{ lineHeight: 1.65 }}>{l.description}</p>}

          {l.amenities && l.amenities.length > 0 && (
            <>
              <h3>Amenities</h3>
              <div className="amenity-chips">{l.amenities.map((a) => <span key={a} className="amenity-chip">{a}</span>)}</div>
            </>
          )}

          <h3>Location</h3>
          <div className="map-wrap"><MapView lat={l.lat} lng={l.lng} label={`${l.area}, ${l.city}`} /></div>
        </div>

        <div>
          <div className="detail-card">
            <div className="detail-price">{inr(l.rent)}<small>/month</small></div>
            {l.deposit ? <div className="card-meta">Deposit: {inr(l.deposit)}</div> : null}
            <table className="spec-table"><tbody>
              <tr><td>Room type</td><td><b>{ROOM_TYPE_LABELS[l.room_type]}</b></td></tr>
              {l.bhk && <tr><td>Size</td><td><b>{l.bhk}</b></td></tr>}
              <tr><td>Furnishing</td><td><b>{FURNISHING_LABELS[l.furnishing]}</b></td></tr>
              <tr><td>Looking for</td><td><b>{TENANT_LABELS[l.tenant_preference]}</b></td></tr>
              {l.available_from && <tr><td>Available from</td><td><b>{l.available_from}</b></td></tr>}
            </tbody></table>

            <div className="owner-box">
              <div className="avatar">{(l.owner_name || '?')[0].toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 700 }}>{l.owner_name}</div>
                <div className="card-meta">Listing owner</div>
              </div>
            </div>

            {!isOwner && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn" onClick={startChat}>Chat with owner</button>
                <button className="btn btn-outline" onClick={toggleSave}>{l.is_saved ? '♥ Saved' : '♡ Save'}</button>
              </div>
            )}

            {notice && <div className="alert ok" style={{ marginTop: 14 }}>{notice}</div>}

            {!isOwner && (
              <>
                <h4 style={{ margin: '20px 0 6px' }}>Request a visit</h4>
                <label className="label">Preferred date & time</label>
                <input className="input" type="datetime-local" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                <label className="label">Note for the owner (optional)</label>
                <input className="input" placeholder="e.g. weekday evenings work best" value={visitNote} onChange={(e) => setVisitNote(e.target.value)} />
                <button className="btn btn-outline" style={{ marginTop: 10, width: '100%' }} onClick={requestVisit}>Request visit</button>

                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => setShowReport(!showReport)}>
                  Report this listing
                </button>
                {showReport && (
                  <div style={{ marginTop: 8 }}>
                    <select className="select" value={reportReason} onChange={(e) => setReportReason(e.target.value)}>
                      {REPORT_REASONS.map((r) => <option key={r}>{r}</option>)}
                    </select>
                    <textarea className="textarea" style={{ marginTop: 8 }} placeholder="Anything we should know?" value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} />
                    <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={submitReport}>Submit report</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
