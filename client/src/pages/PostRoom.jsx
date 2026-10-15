import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { CITIES, BHK_OPTIONS, ROOM_TYPE_LABELS, FURNISHING_LABELS, TENANT_LABELS, AMENITY_OPTIONS, inr } from '../format';

const STEPS = ['Basics', 'Rent & terms', 'Details', 'Photos', 'Review'];

export default function PostRoom() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', city: CITIES[0], area: '', address: '',
    room_type: 'private_room', bhk: '1BHK',
    rent: '', deposit: '', furnishing: 'furnished',
    tenant_preference: 'any', available_from: '',
    description: '', amenities: [], images: [],
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleAmenity = (a) => setForm((f) => ({
    ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
  }));

  const validStep = () => {
    if (step === 0) return form.title.trim() && form.area.trim() && form.city;
    if (step === 1) return Number(form.rent) > 0;
    if (step === 3) return form.images.length > 0;
    return true;
  };

  const stepError = () => {
    if (step === 3 && form.images.length === 0) return 'Add at least one photo — listings without photos are not published.';
    return 'Please fill the required fields before continuing.';
  };

  const next = () => {
    if (!validStep()) { setError(stepError()); return; }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const uploadPhotos = async (files) => {
    if (!files.length) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      [...files].slice(0, 8).forEach((f) => fd.append('images', f));
      const { urls } = await api('/api/upload', { method: 'POST', formData: fd });
      setForm((f) => ({ ...f, images: [...f.images, ...urls].slice(0, 8) }));
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  const publish = async () => {
    if (form.images.length === 0) { setError('Add at least one photo — listings without photos are not published.'); setStep(3); return; }
    setSaving(true); setError('');
    try {
      const { listing } = await api('/api/listings', {
        method: 'POST',
        body: { ...form, rent: Number(form.rent), deposit: form.deposit ? Number(form.deposit) : null },
      });
      navigate(`/listing/${listing.id}`);
    } catch (e) { setError(e.message); setSaving(false); }
  };

  return (
    <div className="container" style={{ maxWidth: 780 }}>
      <span className="eyebrow" style={{ marginTop: 26 }}>List your space</span>
      <h1 className="page-title" style={{ marginTop: 0 }}>Post a room</h1>
      <p className="page-sub">It takes about two minutes. Your listing goes live immediately.</p>

      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>{i + 1}. {s}</div>
        ))}
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="detail-card">
        {step === 0 && (
          <>
            <label className="label">Listing title *</label>
            <input className="input" placeholder="e.g. Sunny private room in 2BHK, Koramangala" value={form.title} onChange={(e) => set('title', e.target.value)} />
            <div className="form-row">
              <div><label className="label">City *</label>
                <select className="select" value={form.city} onChange={(e) => set('city', e.target.value)}>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div><label className="label">Area / locality *</label>
                <input className="input" placeholder="e.g. Koramangala 5th Block" value={form.area} onChange={(e) => set('area', e.target.value)} /></div>
            </div>
            <label className="label">Street address (optional — only approximate location is shown publicly)</label>
            <input className="input" placeholder="Flat / building / street" value={form.address} onChange={(e) => set('address', e.target.value)} />
            <label className="label">What are you offering? *</label>
            <div className="chip-select">
              {Object.entries(ROOM_TYPE_LABELS).map(([k, v]) => (
                <button key={k} type="button" className={`chip ${form.room_type === k ? 'selected' : ''}`} onClick={() => set('room_type', k)}>{v}</button>
              ))}
            </div>
            <label className="label">Flat size</label>
            <div className="chip-select">
              {BHK_OPTIONS.map((b) => (
                <button key={b} type="button" className={`chip ${form.bhk === b ? 'selected' : ''}`} onClick={() => set('bhk', b)}>{b}</button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="form-row">
              <div><label className="label">Monthly rent (₹) *</label>
                <input className="input" type="number" min="1" placeholder="e.g. 12000" value={form.rent} onChange={(e) => set('rent', e.target.value)} /></div>
              <div><label className="label">Security deposit (₹)</label>
                <input className="input" type="number" min="0" placeholder="Optional" value={form.deposit} onChange={(e) => set('deposit', e.target.value)} /></div>
            </div>
            <label className="label">Furnishing *</label>
            <div className="chip-select">
              {Object.entries(FURNISHING_LABELS).map(([k, v]) => (
                <button key={k} type="button" className={`chip ${form.furnishing === k ? 'selected' : ''}`} onClick={() => set('furnishing', k)}>{v}</button>
              ))}
            </div>
            <label className="label">Looking for</label>
            <div className="chip-select">
              {Object.entries(TENANT_LABELS).map(([k, v]) => (
                <button key={k} type="button" className={`chip ${form.tenant_preference === k ? 'selected' : ''}`} onClick={() => set('tenant_preference', k)}>{v}</button>
              ))}
            </div>
            <label className="label">Available from</label>
            <input className="input" type="date" value={form.available_from} onChange={(e) => set('available_from', e.target.value)} />
          </>
        )}

        {step === 2 && (
          <>
            <label className="label">Description</label>
            <textarea className="textarea" placeholder="Tell flatmates what makes this place good — light, commute, flatmates, house rules…" value={form.description} onChange={(e) => set('description', e.target.value)} />
            <label className="label">Amenities</label>
            <div className="chip-select">
              {AMENITY_OPTIONS.map((a) => (
                <button key={a} type="button" className={`chip ${form.amenities.includes(a) ? 'selected' : ''}`} onClick={() => toggleAmenity(a)}>{a}</button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <label className="label">Photos * <span style={{ fontWeight: 400 }}>(at least one required — up to 8)</span></label>
            <label className="photo-drop">
              <div style={{ fontSize: 30, marginBottom: 6 }}>📸</div>
              <div style={{ fontWeight: 700 }}>Tap to add photos</div>
              <div className="card-meta" style={{ marginTop: 4 }}>Listings with photos get far more responses.</div>
              <input
                type="file" accept="image/*" multiple hidden
                onChange={(e) => { uploadPhotos(e.target.files); e.target.value = ''; }}
              />
            </label>
            {uploading && <p className="card-meta">Uploading…</p>}
            <div className="photo-thumbs">
              {form.images.map((src, i) => (
                <div className="photo-thumb" key={i}>
                  <img src={src} alt={`Listing photo ${i + 1}`} />
                  <button type="button" aria-label="Remove photo" onClick={() => set('images', form.images.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
            {form.images.length === 0 && !uploading && (
              <p className="card-meta" style={{ color: 'var(--brand-dark)', fontWeight: 600 }}>
                You need at least one photo to publish this listing.
              </p>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h3 style={{ marginTop: 0 }}>{form.title || 'Untitled listing'}</h3>
            <table className="spec-table"><tbody>
              <tr><td>Location</td><td><b>{form.area}, {form.city}</b></td></tr>
              <tr><td>Rent</td><td><b>{form.rent ? inr(form.rent) : '—'}/month</b></td></tr>
              <tr><td>Deposit</td><td><b>{form.deposit ? inr(form.deposit) : '—'}</b></td></tr>
              <tr><td>Offering</td><td><b>{ROOM_TYPE_LABELS[form.room_type]} · {form.bhk}</b></td></tr>
              <tr><td>Furnishing</td><td><b>{FURNISHING_LABELS[form.furnishing]}</b></td></tr>
              <tr><td>Looking for</td><td><b>{TENANT_LABELS[form.tenant_preference]}</b></td></tr>
              {form.available_from && <tr><td>Available from</td><td><b>{form.available_from}</b></td></tr>}
              <tr><td>Photos</td><td><b>{form.images.length}</b></td></tr>
              <tr><td>Amenities</td><td><b>{form.amenities.join(', ') || '—'}</b></td></tr>
            </tbody></table>
            {form.description && <p>{form.description}</p>}
          </>
        )}

        <div className="step-nav">
          <button className="btn btn-outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>← Back</button>
          {step < STEPS.length - 1
            ? <button className="btn" onClick={next}>Continue →</button>
            : <button className="btn" disabled={saving} onClick={publish}>{saving ? 'Publishing…' : 'Publish listing'}</button>}
        </div>
      </div>
    </div>
  );
}
