// Thin fetch wrapper. When a Firebase user is signed in, a fresh ID token
// is attached as `Authorization: Bearer <idToken>`; logged-out requests
// simply carry no auth header (anonymous browse still works).
import { auth } from './firebase';

const API_BASE = '';

export async function api(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  if (auth && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Token refresh failed (e.g. signed out mid-flight) — proceed
      // anonymously; the API will 401 if the route needs auth.
    }
  }
  let payload;
  if (formData) {
    payload = formData; // browser sets multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(API_BASE + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
