import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Tap-to-place pin picker for the Post-a-room flow.
// The pin is draggable; only an approximate location is ever shown publicly
// (the detail page renders a radius circle, not the exact pin).
const CITY_CENTERS = {
    Mumbai: [19.076, 72.8777],
    Hyderabad: [17.385, 78.4867],
    Bangalore: [12.9716, 77.5946],
    Pune: [18.5204, 73.8567],
    'Delhi NCR': [28.6139, 77.209],
};
const INDIA = [20.5937, 78.9629];

function pinIcon() {
    return L.divIcon({
        className: 'picker-pin',
        html: '<div class="picker-pin-dot"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

export default function LocationPicker({ city, lat, lng, onPick, initialCenter }) {
    const ref = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const onPickRef = useRef(onPick);
    onPickRef.current = onPick;

    // Create the map once.
    useEffect(() => {
        if (!ref.current || mapRef.current) return;
        // Prefer an explicit center, then an existing pin, then the city.
        const center = initialCenter || (lat != null && lng != null ? [lat, lng] : null)
            || CITY_CENTERS[city] || INDIA;
        const map = L.map(ref.current).setView(center, 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);
        map.on('click', (e) => {
            const p = e.latlng;
            onPickRef.current(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
        });
        mapRef.current = map;
        return () => { map.remove(); mapRef.current = null; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Recenter when the city changes.
    useEffect(() => {
        const center = CITY_CENTERS[city];
        if (mapRef.current && center) mapRef.current.setView(center, 12);
    }, [city]);

    // Keep the marker in sync with the picked position.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;
        if (lat == null || lng == null) {
            if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
            return;
        }
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            const marker = L.marker([lat, lng], { icon: pinIcon(), draggable: true }).addTo(map);
            marker.on('dragend', () => {
                const p = marker.getLatLng();
                onPickRef.current(Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6)));
            });
            markerRef.current = marker;
        }
    }, [lat, lng]);

    return (
        <>
            <div ref={ref} className="location-picker-map" />
            <p className="map-note">
                {lat != null
                    ? 'Pin placed — tap elsewhere on the map or drag the pin to move it.'
                    : 'Tap the map to drop a pin where your place is.'}{' '}
                Only an approximate location is shown publicly.
            </p>
        </>
    );
}
