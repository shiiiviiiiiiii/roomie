const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');
const { notify } = require('../utils/notify');
const { validate, idParam, z } = require('../middleware/validate');

const router = express.Router();

const createVisitSchema = z.object({
  listing_id: z.string().trim().min(1, 'listing_id is required').max(128),
  scheduled_at: z.string().trim().min(1, 'scheduled_at is required').max(50)
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: 'scheduled_at must be a valid date/time' }),
  note: z.string().trim().max(1000).nullable().optional(),
});

// POST /api/visits — request a visit
router.post('/', authRequired, validate(createVisitSchema), async (req, res, next) => {
  try {
    const { listing_id, scheduled_at, note } = req.body;
    const listing = await store.getListing(listing_id);
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    if (listing.user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot request a visit to your own listing' });
    }
    const visit = await store.createVisit({
      listing_id, requester_id: req.user.id, owner_id: listing.user_id,
      scheduled_at, note: note || null,
    });
    notify(listing.user_id, {
      type: 'visit', title: `Visit requested: ${listing.title}`,
      body: `${req.user.name} wants to visit on ${scheduled_at}`,
      link: '/dashboard',
    });
    res.status(201).json({ visit });
  } catch (e) { next(e); }
});

// GET /api/visits — visits I'm involved in
router.get('/', authRequired, async (req, res, next) => {
  try {
    const visits = await store.listVisits(req.user.id);
    res.json({ visits });
  } catch (e) { next(e); }
});

const updateVisitSchema = z.object({
  status: z.enum(['confirmed', 'declined', 'cancelled'], {
    message: 'status must be confirmed, declined or cancelled',
  }),
});

// PATCH /api/visits/:id — owner confirms / declines / cancels
router.patch('/:id', authRequired, validate({ params: idParam, body: updateVisitSchema }), async (req, res, next) => {
  try {
    const { status } = req.body;
    const visit = await store.getVisit(req.params.id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    const isOwner = visit.owner_id === req.user.id;
    const isRequester = visit.requester_id === req.user.id;
    if (!isOwner && !isRequester) return res.status(403).json({ error: 'Not your visit' });
    if (status === 'cancelled' && !isRequester) {
      return res.status(403).json({ error: 'Only the requester can cancel' });
    }
    if ((status === 'confirmed' || status === 'declined') && !isOwner) {
      return res.status(403).json({ error: 'Only the listing owner can confirm or decline' });
    }
    const updated = await store.setVisitStatus(visit.id, status);
    const listing = await store.getListing(visit.listing_id);
    const other = isOwner ? visit.requester_id : visit.owner_id;
    notify(other, {
      type: 'visit',
      title: `Visit ${status}: ${listing ? listing.title : ''}`,
      body: status === 'confirmed' ? 'Your visit was confirmed.' : `Your visit was ${status}.`,
      link: '/dashboard',
    });
    res.json({ visit: updated });
  } catch (e) { next(e); }
});

module.exports = router;
