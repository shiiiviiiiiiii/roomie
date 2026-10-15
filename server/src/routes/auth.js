// Auth profile endpoints.
//
// Sign-in/sign-up happen client-side against Firebase Auth directly (email +
// password, or Google). The server never sees passwords: it verifies the
// Firebase ID token (see middleware/auth.js) and provisions the users/{uid}
// profile document on first sight. Phone/OTP sign-in remains a stub (see
// README).
const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');
const { validate, z } = require('../middleware/validate');

const router = express.Router();

// GET /api/auth/me — the caller's profile (provisions the users/{uid} doc
// on first verified call via the auth middleware).
router.get('/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

const updateMeSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  gender: z.string().trim().max(30).nullable().optional(),
  occupation: z.string().trim().max(100).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  avatar_url: z.string().trim().max(500).nullable().optional(),
  profile_completed: z.boolean().optional(),
  // Listing alert preferences: get notified about new rooms within 10km.
  alert_lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  alert_lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  alert_area: z.string().trim().max(120).nullable().optional(),
  alerts_enabled: z.boolean().optional(),
}).refine((o) => Object.keys(o).length > 0, { message: 'At least one field must be provided' });

async function updateMe(req, res) {
  const patch = {};
  for (const f of ['name', 'phone', 'gender', 'occupation', 'bio', 'avatar_url', 'profile_completed',
    'alert_lat', 'alert_lng', 'alert_area', 'alerts_enabled']) {
    if (req.body[f] !== undefined) patch[f] = req.body[f];
  }
  const user = await store.updateUser(req.user.id, patch);
  res.json({ user: store.publicUser(user) });
}

// PATCH is the documented verb; PUT is kept as an alias.
router.patch('/me', authRequired, validate(updateMeSchema), (req, res, next) => {
  updateMe(req, res).catch(next);
});
router.put('/me', authRequired, validate(updateMeSchema), (req, res, next) => {
  updateMe(req, res).catch(next);
});

module.exports = router;
