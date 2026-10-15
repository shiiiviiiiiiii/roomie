const express = require('express');
const store = require('../store');
const { authRequired, adminRequired } = require('../middleware/auth');
const { validate, idParam, z } = require('../middleware/validate');

const router = express.Router();
router.use(authRequired, adminRequired);

// GET /api/admin/reports — open reports with listing info
router.get('/reports', async (req, res, next) => {
  try {
    const status = req.query.status || 'open';
    const reports = await store.listReports(status);
    res.json({ reports });
  } catch (e) { next(e); }
});

// PATCH /api/admin/reports/:id — resolve or dismiss
router.patch('/reports/:id', validate({ params: idParam, body: z.object({
  status: z.enum(['resolved', 'dismissed'], { message: 'status must be resolved or dismissed' }),
}) }), async (req, res, next) => {
  try {
    const { status } = req.body;
    const report = await store.getReport(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    await store.setReportStatus(report.id, status);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PATCH /api/admin/listings/:id/status — hide / restore a listing
router.patch('/listings/:id/status', validate({ params: idParam, body: z.object({
  status: z.enum(['active', 'hidden', 'removed'], { message: 'status must be active, hidden or removed' }),
}) }), async (req, res, next) => {
  try {
    const { status } = req.body;
    const listing = await store.getListing(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    await store.updateListing(listing.id, { status });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/admin/stats — simple moderation overview
router.get('/stats', async (req, res, next) => {
  try {
    const [open_reports, total_users, total_listings] = await Promise.all([
      store.countOpenReports(),
      store.countUsers(),
      store.countListings(),
    ]);
    res.json({ open_reports, total_users, total_listings });
  } catch (e) { next(e); }
});

module.exports = router;
