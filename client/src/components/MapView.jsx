import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Approximate location map: renders a radius circle instead of an exact pin,
// so the precise address stays private until the owner shares it.
export default function MapView({ lat, lng, label }) {
  const ref = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!ref.current || lat == null || lng == null) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    const map = L.map(ref.current, { scrollWheelZoom: false }).setView([lat, lng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);
    L.circle([lat, lng], {
      radius: 600, color: '#e4572e', fillColor: '#e4572e', fillOpacity: 0.18, weight: 2,
    }).addTo(map);
    mapRef.current = map;
    const onFocus = () => map.scrollWheelZoom.enable();
    const onBlur = () => map.scrollWheelZoom.disable();
    map.on('focus', onFocus);
    map.on('blur', onBlur);
    return () => { map.remove(); mapRef.current = null; };
  }, [lat, lng]);

  if (lat == null || lng == null) {
    return <div className="map-note">Location map not available for this listing.</div>;
  }
  return (
    <>
      <div ref={ref} style={{ height: 280, width: '100%', borderRadius: 12 }} />
      <div className="map-note">
        Approximate location{label ? ` — ${label}` : ''}. The exact address is shared by the owner over chat.
      </div>
    </>
  );
}
