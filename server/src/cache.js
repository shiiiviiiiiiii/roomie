// HTTP response caching (#2 Caching, #48 CDN, #49 Edge Caching).
//
// The API runs as a Netlify Function in Ohio while the database is in
// Mumbai — every request pays ~300ms+ of travel time. These headers let
// browsers (and any CDN in front) reuse recent responses instead of
// paying that cost on every navigation.
//
// Rules:
// - Public, slowly-changing data (listing lists, single listings):
//   cache briefly, serve stale while revalidating in background.
// - Personal or fast-changing data (chats, notifications, saves):
//   never cache.
function cache(seconds, { staleWhileRevalidate = 120 } = {}) {
  return (_req, res, next) => {
    res.set(
      'Cache-Control',
      `public, max-age=${seconds}, stale-while-revalidate=${staleWhileRevalidate}`
    );
    next();
  };
}

function noCache() {
  return (_req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    next();
  };
}

module.exports = { cache, noCache };
