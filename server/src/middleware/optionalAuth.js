// Optional auth helper.
//
// Resolves the caller's Firebase UID from an Authorization: Bearer <idToken>
// header when one is present, and returns null for anonymous requests. Routes
// that are public but want to personalise the response (e.g. hydrating the
// is_saved flag) use this instead of the authRequired middleware.
const { admin } = require('../firebase');

async function optionalViewerUid(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

module.exports = { optionalViewerUid };
