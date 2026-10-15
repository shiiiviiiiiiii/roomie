import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

// Profile photo picker: upload from device OR take a selfie with the camera.
// Calls onSave(url) with the uploaded photo URL.
export default function ProfilePhotoPicker({ currentUrl, onSave }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  // Attach the camera stream to the video element once it's mounted.
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraOn]);

  // Always release the camera when the picker unmounts.
  useEffect(() => () => stopCamera(), []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (e) {
      setError('Could not access the camera. Check the browser permission, or upload a photo instead.');
    }
  };

  const uploadBlob = async (blob, filename) => {
    setBusy(true); setError('');
    try {
      const fd = new FormData();
      fd.append('images', new File([blob], filename, { type: blob.type || 'image/jpeg' }));
      const { urls } = await api('/api/upload', { method: 'POST', formData: fd });
      if (!urls || !urls[0]) throw new Error('Upload failed — please try again');
      setPreview(urls[0]);
      onSave(urls[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (!/^image\//.test(f.type)) { setError('Please choose an image file.'); return; }
    await uploadBlob(f, f.name);
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setError('Camera not ready yet — try again.'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    stopCamera();
    if (!blob) { setError('Could not capture the photo — try again.'); return; }
    await uploadBlob(blob, 'selfie.jpg');
  };

  return (
    <div className="photo-picker">
      {error && <div className="alert error">{error}</div>}
      <div className="photo-picker-row">
        <div className="avatar xl">{preview ? <img src={preview} alt="Profile photo" /> : <span>{'?'}</span>}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => fileRef.current && fileRef.current.click()}>
            {busy ? 'Uploading…' : 'Upload from device'}
          </button>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={startCamera}>
            Take a selfie
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
      </div>
      {cameraOn && (
        <div className="camera-wrap">
          <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="button" className="btn btn-brand btn-sm" onClick={capture} disabled={busy}>Capture</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={stopCamera}>Cancel</button>
          </div>
        </div>
      )}
      {busy && <p className="card-meta">Uploading photo…</p>}
    </div>
  );
}
