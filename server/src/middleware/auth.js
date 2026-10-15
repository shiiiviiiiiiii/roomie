// Firebase Auth middleware.
//
// The client signs in directly with Firebase Auth (email/password or Google)
// and sends the Firebase ID token as `Authorization: Bearer <idToken>`.
// We verify it with the Admin SDK, then load (or provision on first sight)
// the matching users/{uid} profile document.
const { admin } = require('../firebase');
const store = require('../store');

async function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    let user = await store.getUser(decoded.uid);
    if (!user) {
      // First verified call provisions the profile from the token's claims.
      const email = decoded.email || null;
      const name = decoded.name || (email ? email.split('@')[0] : 'Roomie user');
      const role = decoded.admin === true ? 'admin' : 'user';
      user = await store.provisionUser(decoded.uid, { email, name, role });
    }
    req.user = store.publicUser(user);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

module.exports = { authRequired, adminRequired };
