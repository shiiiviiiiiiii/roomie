// Public user profiles.
//
// GET /api/users/:id — anyone can view: safe public fields plus the user's
// active listings. Private fields (email, phone) are never exposed here;
// contact happens through in-app chat.
const express = require('express');
const store = require('../store');
const { validate, idParam } = require('../middleware/validate');
const { admin } = require('../firebase');

const router = express.Router();

// Optional auth: if a viewer token is present we hydrate is_saved flags.
async function viewerUid(req) {
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

router.get('/:id', validate({ params: idParam }), async (req, res, next) => {
  try {
    const vid = await viewerUid(req);
    const profile = await store.getPublicProfile(req.params.id, vid);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  } catch (e) { next(e); }
});

module.exports = router;
