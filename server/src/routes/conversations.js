const express = require('express');
const store = require('../store');
const { authRequired } = require('../middleware/auth');
const { notify } = require('../utils/notify');
const { validate, idParam, z } = require('../middleware/validate');

const router = express.Router();

// GET /api/conversations — my chats
router.get('/', authRequired, async (req, res, next) => {
  try {
    const conversations = await store.listConversations(req.user.id);
    res.json({ conversations });
  } catch (e) { next(e); }
});

const startConversationSchema = z.object({
  listing_id: z.string().trim().min(1, 'listing_id is required').max(128),
});

// POST /api/conversations — start (or fetch existing) a chat about a listing
router.post('/', authRequired, validate(startConversationSchema), async (req, res, next) => {
  try {
    const { listing_id } = req.body;
    const listing = await store.getListing(listing_id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.user_id === req.user.id) {
      return res.status(400).json({ error: 'You cannot chat with yourself about your own listing' });
    }
    const conv = await store.findOrCreateConversation(listing_id, req.user.id, listing.user_id);
    res.status(201).json({ conversation: await store.conversationView(conv) });
  } catch (e) { next(e); }
});

// GET /api/conversations/:id/messages
router.get('/:id/messages', authRequired, validate({ params: idParam }), async (req, res, next) => {
  try {
    const conv = await store.getConversation(req.params.id);
    if (!conv || !store.isParticipant(conv, req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const messages = await store.listMessages(conv.id);
    res.json({ conversation: await store.conversationView(conv), messages });
  } catch (e) { next(e); }
});

const messageSchema = z.object({
  body: z.string().trim().min(1, 'message body is required').max(2000),
});

// POST /api/conversations/:id/messages
router.post('/:id/messages', authRequired, validate({ params: idParam, body: messageSchema }), async (req, res, next) => {
  try {
    const { body } = req.body;
    const conv = await store.getConversation(req.params.id);
    if (!conv || !store.isParticipant(conv, req.user.id)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const message = await store.addMessage(conv.id, req.user.id, body);
    const recipient = conv.user_a === req.user.id ? conv.user_b : conv.user_a;
    const listing = await store.getListing(conv.listing_id);
    notify(recipient, {
      type: 'message', title: `New message from ${req.user.name}`,
      body: String(body).trim().slice(0, 120),
      link: `/chats/${conv.id}`,
    });
    res.status(201).json({ message, listing_title: listing ? listing.title : null });
  } catch (e) { next(e); }
});

module.exports = router;
