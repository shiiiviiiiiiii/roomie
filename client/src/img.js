// Cloudinary image resizing via URL transformations.
//
// Uploaded photos are stored as full-resolution Cloudinary `secure_url`s
// (often several MB). Rendering those directly in cards, avatars and
// galleries is the single biggest cause of the site feeling slow.
// This helper rewrites a Cloudinary URL to request a resized,
// auto-optimized version instead — e.g. a 600px card image instead of
// a 4000px original. Non-Cloudinary URLs (seed placeholders etc.)
// are returned untouched.
export function thumb(url, w = 800) {
  if (!url || typeof url !== 'string') return url;
  const marker = '/image/upload/';
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const rest = url.slice(i + marker.length);
  // Already carries a transformation — leave it alone.
  if (/^(w_|h_|c_|q_|f_|e_)/.test(rest)) return url;
  return url.slice(0, i + marker.length) + `w_${w},q_auto,f_auto/` + rest;
}
