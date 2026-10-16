// Public user profiles.
//
// GET /api/users/:id — anyone can view: safe public fields plus the user's
// active listings. Private fields (email, phone) are never exposed here;
// contact happens through in-app chat.
const express = require('express');
const store = require('../store');
const { validate, idParam } = require('../middleware/validate');
const { optionalViewerUid } = require('../middleware/optionalAuth');
const { cache } = require('../cache');

const router = express.Router();

router.get('/:id', validate({ params: idParam }), cache(60), async (req, res, next) => {
  try {
    const vid = await optionalViewerUid(req);
    const profile = await store.getPublicProfile(req.params.id, vid);
    if (!profile) return res.status(404).json({ error: 'User not found' });
    res.json(profile);
  } catch (e) { next(e); }
});

module.exports = router;
