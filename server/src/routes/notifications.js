const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');
const { validate, idParam, z } = require('../middleware/validate');

const router = express.Router();

// GET /api/notifications — mine, newest first
router.get('/', authRequired, async (req, res, next) => {
  try {
    const { notifications, unread_count } = await store.listNotifications(req.user.id);
    res.json({ notifications, unread_count });
  } catch (e) { next(e); }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authRequired, validate({ params: idParam }), async (req, res, next) => {
  try {
    const ok = await store.markNotificationRead(req.params.id, req.user.id);
    if (!ok) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/notifications/read-all — takes no input; the empty schema rejects junk bodies
router.post('/read-all', authRequired, validate(z.object({})), async (req, res, next) => {
  try {
    await store.markAllNotificationsRead(req.user.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
