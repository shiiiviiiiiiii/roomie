const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');
const { optionalViewerUid } = require('../middleware/optionalAuth');
const { notify } = require('../utils/notify');
const { validate, idParam, z } = require('../middleware/validate');

const router = express.Router();

const ALERT_RADIUS_KM = 10;

// Fan out a "new listing near you" notification to every user whose alert
// area is within ALERT_RADIUS_KM of the new listing (excluding the owner).
async function notifyNearbySubscribers(listing, lat, lng) {
  const subs = await store.listAlertSubscribers(listing.user_id);
  const nearby = subs.filter((u) => {
    const d = store.haversineKm(lat, lng, Number(u.alert_lat), Number(u.alert_lng));
    return d <= ALERT_RADIUS_KM;
  });
  await Promise.all(nearby.map((u) => notify(u.id, {
    type: 'listing_alert',
    title: `New room near ${u.alert_area || 'your alert area'}`,
    body: `${listing.title} — ₹${Number(listing.rent).toLocaleString('en-IN')}/month`,
    link: `/listing/${listing.id}`,
  })));
}

// GET /api/listings — browse with filters
router.get('/', async (req, res, next) => {
  try {
    const {
      city, q, min_rent, max_rent, bhk, room_type, furnishing, tenant_preference,
      near_lat, near_lng, near_km,
      sort = 'newest', limit = 24, offset = 0, mine,
    } = req.query;

    const vid = await optionalViewerUid(req);
    const result = await store.queryListings({
      city, q, min_rent, max_rent, bhk, room_type, furnishing, tenant_preference,
      near_lat, near_lng, near_km,
      mineUid: mine && vid ? vid : null,
      sort, limit, offset, viewerUid: vid,
    });
    res.json(result);
  } catch (e) { next(e); }
});

// GET /api/listings/saved/mine — my saved homes (must be before /:id)
router.get('/saved/mine', authRequired, async (req, res, next) => {
  try {
    const listings = await store.getSavedListings(req.user.id);
    res.json({ listings });
  } catch (e) { next(e); }
});

// GET /api/listings/:id
router.get('/:id', validate({ params: idParam }), async (req, res, next) => {
  try {
    const vid = await optionalViewerUid(req);
    const listing = await store.getListing(req.params.id, vid);
    if (!listing || listing.status === 'removed') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({ listing });
  } catch (e) { next(e); }
});

const urlString = z.string().trim().max(500);
const listingFields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(5000).nullable().optional(),
  city: z.string().trim().min(1).max(80),
  area: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300).nullable().optional(),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lng: z.coerce.number().min(-180).max(180).nullable().optional(),
  rent: z.coerce.number().int('rent must be a whole number').positive('rent must be positive').max(100000000),
  deposit: z.coerce.number().int().min(0).max(100000000).nullable().optional(),
  bhk: z.string().trim().max(20).nullable().optional(),
  room_type: z.string().trim().min(1).max(50),
  furnishing: z.string().trim().min(1).max(50),
  tenant_preference: z.string().trim().max(50).optional(),
  available_from: z.string().trim().max(30).nullable().optional(),
  images: z.array(urlString).min(1, 'At least one photo is required').max(8),
  amenities: z.array(z.string().trim().max(60)).max(30).optional(),
};

const createListingSchema = z.object(listingFields);
const updateListingSchema = z.object(
  Object.fromEntries(Object.entries(listingFields).map(([k, v]) => [k, v.optional()]))
).refine((o) => Object.keys(o).length > 0, { message: 'At least one field must be provided' });

// POST /api/listings — create
router.post('/', authRequired, validate(createListingSchema), async (req, res, next) => {
  try {
    const {
      title, description, city, area, address, lat, lng, rent, deposit,
      bhk, room_type, furnishing, tenant_preference, available_from, images, amenities,
    } = req.body;
    const listing = await store.createListing({
      user_id: req.user.id,
      title, description, city, area, address, lat, lng, rent, deposit,
      bhk, room_type, furnishing, tenant_preference, available_from, images, amenities,
    });
    // Notify users whose alert area is within 10km of this listing.
    // Fire-and-forget: a slow or failing fan-out must never block publishing.
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      notifyNearbySubscribers(listing, Number(lat), Number(lng)).catch((e) => {
        console.error('listing alert fan-out failed:', e.message);
      });
    }
    res.status(201).json({ listing });
  } catch (e) { next(e); }
});

// PUT /api/listings/:id — owner edit
router.put('/:id', authRequired, validate({ params: idParam, body: updateListingSchema }), async (req, res, next) => {
  try {
    const existing = await store.getListing(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your listing' });
    }
    const patch = {};
    for (const f of ['title', 'description', 'city', 'area', 'address', 'lat', 'lng', 'rent', 'deposit',
      'bhk', 'room_type', 'furnishing', 'tenant_preference', 'available_from', 'images', 'amenities']) {
      if (req.body[f] !== undefined) patch[f] = req.body[f];
    }
    if (Object.keys(patch).length) await store.updateListing(req.params.id, patch);
    const listing = await store.getListing(req.params.id, req.user.id);
    res.json({ listing });
  } catch (e) { next(e); }
});

// DELETE /api/listings/:id — owner delete
router.delete('/:id', authRequired, validate({ params: idParam }), async (req, res, next) => {
  try {
    const existing = await store.getListing(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Listing not found' });
    if (existing.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your listing' });
    }
    await store.deleteListing(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/listings/:id/save — toggle save
router.post('/:id/save', authRequired, validate({ params: idParam }), async (req, res, next) => {
  try {
    const listing = await store.getListing(req.params.id);
    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    const { saved } = await store.toggleSave(req.user.id, req.params.id);
    res.json({ saved });
  } catch (e) { next(e); }
});

const reportSchema = z.object({
  reason: z.string().trim().min(1, 'a reason is required').max(100),
  details: z.string().trim().max(2000).nullable().optional(),
});

// POST /api/listings/:id/report
router.post('/:id/report', authRequired, validate({ params: idParam, body: reportSchema }), async (req, res, next) => {
  try {
    const { reason, details } = req.body;
    const listing = await store.getListing(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const reportId = await store.createReport({
      listing_id: listing.id, reporter_id: req.user.id, reason, details,
    });
    const adminUids = await store.getAdminUids();
    for (const uid of adminUids) {
      notify(uid, {
        type: 'report', title: 'New listing report',
        body: `Listing "${listing.title}" was reported: ${reason}`,
        link: '/admin',
      });
    }
    res.status(201).json({ report_id: reportId });
  } catch (e) { next(e); }
});

module.exports = router;
