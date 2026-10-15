import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { inrShort } from '../format';

// Browse map: price pins for every listing with coordinates. Clicking a pin
// opens a mini card linking to the listing. Locations stay approximate.
export default function ListingsMap({ listings, activeId, onPinClick }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!ref.current) return;
    if (!mapRef.current) {
      const map = L.map(ref.current, { scrollWheelZoom: false }).setView([19.08, 72.88], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      const onFocus = () => map.scrollWheelZoom.enable();
      const onBlur = () => map.scrollWheelZoom.disable();
      map.on('focus', onFocus);
      map.on('blur', onBlur);
      mapRef.current = map;
    }
    const map = mapRef.current;

    // Clear old pins
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const pts = listings.filter((l) => l.lat != null && l.lng != null);
    pts.forEach((l) => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="price-pin${l.id === activeId ? ' active' : ''}">${inrShort(l.rent)}</div>`,
        iconSize: null,
      });
      const marker = L.marker([l.lat, l.lng], { icon }).addTo(map);
      marker.on('click', () => onPinClick && onPinClick(l.id));
      const img = l.images && l.images[0]
        ? `<img src="${l.images[0]}" alt="" style="width:100%;height:110px;object-fit:cover;border-radius:10px 10px 0 0;" />`
        : '';
      marker.bindPopup(
        `<div style="width:210px;font-family:Inter,sans-serif;">${img}` +
        `<div style="padding:10px 12px 12px;"><div style="font-weight:800;">${inrShort(l.rent)}<span style="font-weight:500;color:#8b7a67;font-size:12px;">/month</span></div>` +
        `<div style="font-size:13.5px;font-weight:600;margin:2px 0;">${String(l.title).slice(0, 42)}</div>` +
        `<div style="font-size:12px;color:#8b7a67;">${l.area}, ${l.city}</div>` +
        `<a href="/listing/${l.id}" style="display:inline-block;margin-top:8px;font-size:13px;font-weight:700;color:#973a1c;">View listing →</a></div></div>`,
        { closeButton: false }
      );
      markersRef.current.push(marker);
    });

    if (pts.length) {
      const bounds = L.latLngBounds(pts.map((l) => [l.lat, l.lng]));
      map.fitBounds(bounds.pad(0.25), { animate: true });
    }
  }, [listings, activeId]);

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } }, []);

  return <div ref={ref} style={{ height: '100%', width: '100%', minHeight: 380 }} />;
}
