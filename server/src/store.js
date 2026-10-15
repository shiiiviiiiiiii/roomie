// Firestore data-access layer for the Roomie API.
//
// Collections: users, listings, saves, conversations, messages, visits,
// reports, notifications.
//
// Document IDs:
//   - users/{uid}        — the Firebase Auth UID (string)
//   - saves/{uid}_{listingId} and conversations/{listingId}_{a}_{b}
//     (a/b = the two participant uids, sorted) encode the old SQLite UNIQUE
//     constraints, so toggles and "start or fetch existing chat" stay atomic.
//   - everything else uses Firestore auto-ID strings.
//
// Field conventions (kept identical to the old SQLite API responses):
//   - created_at is an ISO-8601 string
//   - images / amenities are arrays (never JSON strings)
//   - is_saved is a boolean, is_read is 0/1
//
// Simplification vs SQLite: Firestore has no JOINs and limited querying, so
// related names (owner_name, sender_name, …) are hydrated with batched
// document reads, and the listing search applies its filters in JS after a
// single indexed `status == 'active'` query. That keeps every query working
// on the emulator AND in production without composite indexes; at larger
// scale you would add composite indexes (or a search service) and push the
// filters down.
const { db } = require('./firebase');

const nowIso = () => new Date().toISOString();

function docShape(doc) {
  const d = doc.data();
  if (!d) return null;
  return { id: doc.id, ...d };
}

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name ?? null,
    email: u.email ?? null,
    phone: u.phone ?? null,
    role: u.role || 'user',
    gender: u.gender ?? null,
    occupation: u.occupation ?? null,
    bio: u.bio ?? null,
    avatar_url: u.avatar_url ?? null,
    profile_completed: u.profile_completed ?? false,
    alert_lat: u.alert_lat ?? null,
    alert_lng: u.alert_lng ?? null,
    alert_area: u.alert_area ?? null,
    alerts_enabled: u.alerts_enabled ?? false,
    created_at: u.created_at ?? null,
  };
}

async function getUser(uid) {
  const doc = await db.collection('users').doc(String(uid)).get();
  return docShape(doc);
}

// Create the profile doc on first verified call; never overwrites an
// existing doc (so profile edits are never clobbered by a later login).
async function provisionUser(uid, { email, name, role } = {}) {
  const ref = db.collection('users').doc(String(uid));
  const existing = await ref.get();
  if (existing.exists) return docShape(existing);
  const data = {
    name: name || (email ? String(email).split('@')[0] : 'Roomie user'),
    email: email || null,
    phone: null,
    role: role === 'admin' ? 'admin' : 'user',
    gender: null,
    occupation: null,
    bio: null,
    avatar_url: null,
    profile_completed: false,
    created_at: nowIso(),
  };
  await ref.set(data);
  return { id: ref.id, ...data };
}

async function upsertUser(uid, data) {
  const ref = db.collection('users').doc(String(uid));
  const existing = await ref.get();
  if (existing.exists) {
    await ref.set(data, { merge: true });
  } else {
    await ref.set({
      name: null, email: null, phone: null, role: 'user', gender: null,
      occupation: null, bio: null, avatar_url: null,
      created_at: nowIso(), ...data,
    });
  }
  return docShape(await ref.get());
}

async function updateUser(uid, patch) {
  const ref = db.collection('users').doc(String(uid));
  await ref.update(patch);
  return docShape(await ref.get());
}

async function getAdminUids() {
  const snap = await db.collection('users').where('role', '==', 'admin').get();
  return snap.docs.map((d) => d.id);
}

async function countUsers() {
  const snap = await db.collection('users').get();
  return snap.size;
}

async function getUsersByIds(uids) {
  const uniq = [...new Set(uids.filter(Boolean).map(String))];
  if (!uniq.length) return new Map();
  const refs = uniq.map((id) => db.collection('users').doc(id));
  const docs = await db.getAll(...refs);
  const map = new Map();
  for (const d of docs) {
    const s = docShape(d);
    if (s) map.set(s.id, s);
  }
  return map;
}

// ---------------------------------------------------------------------------
// listings
// ---------------------------------------------------------------------------

function listingShape(l, { owner, isSaved, includeAddress = false } = {}) {
  if (!l) return null;
  return {
    id: l.id,
    user_id: l.user_id ?? null,
    title: l.title ?? null,
    description: l.description ?? null,
    city: l.city ?? null,
    area: l.area ?? null,
    // Exact address is private — only returned to the listing owner.
    // Other users must ask via in-app chat.
    ...(includeAddress ? { address: l.address ?? null } : {}),
    lat: l.lat ?? null,
    lng: l.lng ?? null,
    rent: l.rent ?? null,
    deposit: l.deposit ?? null,
    bhk: l.bhk ?? null,
    room_type: l.room_type ?? null,
    furnishing: l.furnishing ?? null,
    tenant_preference: l.tenant_preference ?? 'any',
    available_from: l.available_from ?? null,
    images: Array.isArray(l.images) ? l.images : [],
    amenities: Array.isArray(l.amenities) ? l.amenities : [],
    status: l.status || 'active',
    created_at: l.created_at ?? null,
    owner_name: owner ? owner.name ?? null : null,
    owner_avatar: owner ? owner.avatar_url ?? null : null,
    is_saved: !!isSaved,
  };
}

async function hydrateListings(docs, viewerUid) {
  const listings = docs.map(docShape).filter(Boolean);
  const owners = await getUsersByIds(listings.map((l) => l.user_id));
  let savedSet = new Set();
  if (viewerUid) {
    const snap = await db.collection('saves').where('user_id', '==', String(viewerUid)).get();
    savedSet = new Set(snap.docs.map((d) => d.data().listing_id));
  }
  return listings.map((l) =>
    listingShape(l, {
      owner: owners.get(String(l.user_id)),
      isSaved: savedSet.has(l.id),
      // Only the owner of a listing receives their own exact address.
      includeAddress: viewerUid != null && String(l.user_id) === String(viewerUid),
    })
  );
}

async function createListing(data) {
  const ref = await db.collection('listings').add({
    title: data.title,
    description: data.description ?? null,
    city: data.city,
    area: data.area,
    address: data.address ?? null,
    lat: data.lat ?? null,
    lng: data.lng ?? null,
    rent: data.rent,
    deposit: data.deposit ?? null,
    bhk: data.bhk ?? null,
    room_type: data.room_type,
    furnishing: data.furnishing,
    tenant_preference: data.tenant_preference || 'any',
    available_from: data.available_from ?? null,
    images: Array.isArray(data.images) ? data.images : [],
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    user_id: String(data.user_id),
    status: 'active',
    created_at: nowIso(),
  });
  return getListing(ref.id, String(data.user_id));
}

async function getListing(id, viewerUid) {
  const doc = await db.collection('listings').doc(String(id)).get();
  const shaped = docShape(doc);
  if (!shaped) return null;
  const [hydrated] = await hydrateListings([doc], viewerUid);
  return hydrated;
}

async function updateListing(id, patch) {
  const ref = db.collection('listings').doc(String(id));
  await ref.update(patch);
  return docShape(await ref.get());
}

async function deleteListing(id) {
  await db.collection('listings').doc(String(id)).delete();
}

// Browse/search. Firestore query is a single indexed `status == 'active'`
// (plus optional user_id for "mine"); every other filter is applied in JS so
// no composite indexes are ever needed.
async function queryListings({
  city, q, min_rent, max_rent, bhk, room_type, furnishing, tenant_preference,
  near_lat, near_lng, near_km,
  mineUid, sort = 'newest', limit = 24, offset = 0, viewerUid,
} = {}) {
  let query = db.collection('listings').where('status', '==', 'active');
  if (mineUid) query = query.where('user_id', '==', String(mineUid));
  const snap = await query.get();
  let rows = snap.docs.map(docShape).filter(Boolean);

  if (city) rows = rows.filter((l) => l.city === city);
  if (bhk) rows = rows.filter((l) => l.bhk === bhk);
  if (room_type) rows = rows.filter((l) => l.room_type === room_type);
  if (furnishing) rows = rows.filter((l) => l.furnishing === furnishing);
  if (tenant_preference) rows = rows.filter((l) => l.tenant_preference === tenant_preference);
  if (min_rent != null && min_rent !== '') rows = rows.filter((l) => Number(l.rent) >= Number(min_rent));
  if (max_rent != null && max_rent !== '') rows = rows.filter((l) => Number(l.rent) <= Number(max_rent));
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter((l) =>
      [l.title, l.description, l.area, l.address]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(needle))
    );
  }

  // Proximity filter: homes within near_km of (near_lat, near_lng), nearest first.
  const nLat = Number(near_lat);
  const nLng = Number(near_lng);
  if (Number.isFinite(nLat) && Number.isFinite(nLng)) {
    const km = Math.min(Math.max(Number(near_km) || 8, 1), 100);
    const toRad = (d) => (d * Math.PI) / 180;
    const distKm = (a, b, c, d) => {
      const s = Math.sin(toRad(c - a) / 2) ** 2
        + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(toRad(d - b) / 2) ** 2;
      return 6371 * 2 * Math.asin(Math.sqrt(s));
    };
    rows = rows
      .map((l) => ({ l, d: l.lat != null && l.lng != null ? distKm(nLat, nLng, Number(l.lat), Number(l.lng)) : Infinity }))
      .filter((r) => r.d <= km)
      .sort((x, y) => x.d - y.d)
      .map((r) => r.l);
  }

  const nearMode = Number.isFinite(nLat) && Number.isFinite(nLng);

  if (sort === 'price_asc') rows.sort((a, b) => Number(a.rent) - Number(b.rent));
  else if (sort === 'price_desc') rows.sort((a, b) => Number(b.rent) - Number(a.rent));
  else if (!nearMode) rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  // in nearMode with default sort, rows are already nearest-first from above

  const total = rows.length;
  const page = rows.slice(Number(offset) || 0, (Number(offset) || 0) + (Number(limit) || 24));

  const owners = await getUsersByIds(page.map((l) => l.user_id));
  let savedSet = new Set();
  if (viewerUid) {
    const s = await db.collection('saves').where('user_id', '==', String(viewerUid)).get();
    savedSet = new Set(s.docs.map((d) => d.data().listing_id));
  }
  const listings = page.map((l) =>
    listingShape(l, { owner: owners.get(String(l.user_id)), isSaved: savedSet.has(l.id) })
  );
  return { listings, total };
}

async function countListings() {
  const snap = await db.collection('listings').get();
  return snap.size;
}

// ---------------------------------------------------------------------------
// saves
// ---------------------------------------------------------------------------

function saveDocId(uid, listingId) {
  return `${String(uid)}_${String(listingId)}`;
}

async function isSaved(uid, listingId) {
  const doc = await db.collection('saves').doc(saveDocId(uid, listingId)).get();
  return doc.exists;
}

async function toggleSave(uid, listingId) {
  const ref = db.collection('saves').doc(saveDocId(uid, listingId));
  const existing = await ref.get();
  if (existing.exists) {
    await ref.delete();
    return { saved: false };
  }
  await ref.set({ user_id: String(uid), listing_id: String(listingId), created_at: nowIso() });
  return { saved: true };
}

async function getSavedListings(uid) {
  const snap = await db.collection('saves')
    .where('user_id', '==', String(uid))
    .get();
  const saves = snap.docs.map(docShape).sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at)));
  const refs = saves.map((s) => db.collection('listings').doc(String(s.listing_id)));
  if (!refs.length) return [];
  const docs = await db.getAll(...refs);
  const owners = await getUsersByIds(docs.map((d) => d.data()?.user_id).filter(Boolean));
  return docs
    .map(docShape)
    .filter((l) => l && l.status === 'active')
    .map((l) => listingShape(l, { owner: owners.get(String(l.user_id)), isSaved: true }));
}

// ---------------------------------------------------------------------------
// conversations + messages
// ---------------------------------------------------------------------------

function conversationDocId(listingId, a, b) {
  const [x, y] = [String(a), String(b)].sort();
  return `${String(listingId)}_${x}_${y}`;
}

async function findOrCreateConversation(listingId, uidA, uidB) {
  const ref = db.collection('conversations').doc(conversationDocId(listingId, uidA, uidB));
  const existing = await ref.get();
  if (existing.exists) return docShape(existing);
  const [a, b] = [String(uidA), String(uidB)].sort();
  const data = { listing_id: String(listingId), user_a: a, user_b: b, created_at: nowIso() };
  await ref.set(data);
  return { id: ref.id, ...data };
}

async function getConversation(id) {
  const doc = await db.collection('conversations').doc(String(id)).get();
  return docShape(doc);
}

function isParticipant(conv, uid) {
  return conv && (conv.user_a === String(uid) || conv.user_b === String(uid));
}

async function conversationView(conv) {
  const users = await getUsersByIds([conv.user_a, conv.user_b]);
  const a = users.get(String(conv.user_a));
  const b = users.get(String(conv.user_b));
  let listingTitle = null;
  try {
    const ldoc = await db.collection('listings').doc(String(conv.listing_id)).get();
    listingTitle = ldoc.data()?.title ?? null;
  } catch { /* listing may have been deleted */ }
  const last = await lastMessageFor(conv.id, conv);
  return {
    id: conv.id,
    listing_id: conv.listing_id,
    user_a: a ? { id: a.id, name: a.name, avatar_url: a.avatar_url } : { id: conv.user_a, name: null, avatar_url: null },
    user_b: b ? { id: b.id, name: b.name, avatar_url: b.avatar_url } : { id: conv.user_b, name: null, avatar_url: null },
    created_at: conv.created_at,
    listing_title: listingTitle,
    last_message: last ? { body: last.body, created_at: last.created_at } : null,
  };
}

// last_message preview for a conversation. addMessage() denormalises the
// latest message onto the conversation doc (created_at only has millisecond
// precision, so a pure timestamp sort can tie); the query fallback covers
// conversations written before that field existed.
async function lastMessageFor(conversationId, conv) {
  if (conv && conv.last_message_at) {
    return { body: conv.last_message_body ?? null, created_at: conv.last_message_at };
  }
  const snap = await db.collection('messages').where('conversation_id', '==', String(conversationId)).get();
  const sorted = snap.docs
    .map(docShape)
    .filter(Boolean)
    .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  return sorted[0] || null;
}

async function listConversations(uid) {
  const u = String(uid);
  const [snapA, snapB] = await Promise.all([
    db.collection('conversations').where('user_a', '==', u).get(),
    db.collection('conversations').where('user_b', '==', u).get(),
  ]);
  const convs = [...snapA.docs, ...snapB.docs]
    .map(docShape)
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by most-recent activity: last_message_at if available, else created_at
      const ta = a.last_message_at ?? a.created_at;
      const tb = b.last_message_at ?? b.created_at;
      return String(tb).localeCompare(String(ta));
    });
  return Promise.all(convs.map(conversationView));
}

async function addMessage(conversationId, senderId, body) {
  const trimmed = String(body).trim();
  const created_at = nowIso();
  const ref = await db.collection('messages').add({
    conversation_id: String(conversationId),
    sender_id: String(senderId),
    body: trimmed,
    created_at,
  });
  // Keep the denormalised preview in step (sequential: last writer wins).
  try {
    await db.collection('conversations').doc(String(conversationId)).update({
      last_message_body: trimmed,
      last_message_at: created_at,
    });
  } catch { /* conversation deleted concurrently; the message still stands */ }
  return docShape(await ref.get());
}

async function listMessages(conversationId) {
  const snap = await db.collection('messages')
    .where('conversation_id', '==', String(conversationId))
    .get();
  const msgs = snap.docs.map(docShape)
    .filter(Boolean)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const senders = await getUsersByIds(msgs.map((m) => m.sender_id));
  return msgs.map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    sender_id: m.sender_id,
    body: m.body,
    created_at: m.created_at,
    sender_name: senders.get(String(m.sender_id))?.name ?? null,
  }));
}

// ---------------------------------------------------------------------------
// visits
// ---------------------------------------------------------------------------

async function createVisit({ listing_id, requester_id, owner_id, scheduled_at, note }) {
  const ref = await db.collection('visits').add({
    listing_id: String(listing_id),
    requester_id: String(requester_id),
    owner_id: String(owner_id),
    scheduled_at,
    status: 'pending',
    note: note ?? null,
    created_at: nowIso(),
  });
  return docShape(await ref.get());
}

async function getVisit(id) {
  const doc = await db.collection('visits').doc(String(id)).get();
  return docShape(doc);
}

async function listVisits(uid) {
  const u = String(uid);
  const [snapR, snapO] = await Promise.all([
    db.collection('visits').where('requester_id', '==', u).get(),
    db.collection('visits').where('owner_id', '==', u).get(),
  ]);
  const seen = new Set();
  const visits = [];
  for (const d of [...snapR.docs, ...snapO.docs]) {
    const v = docShape(d);
    if (v && !seen.has(v.id)) { seen.add(v.id); visits.push(v); }
  }
  visits.sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)));
  const listings = new Map();
  for (const v of visits) {
    if (!listings.has(v.listing_id)) {
      const ldoc = await db.collection('listings').doc(String(v.listing_id)).get();
      listings.set(v.listing_id, docShape(ldoc));
    }
  }
  const people = await getUsersByIds(visits.flatMap((v) => [v.requester_id, v.owner_id]));
  return visits.map((v) => {
    const l = listings.get(v.listing_id);
    return {
      id: v.id,
      listing_id: v.listing_id,
      requester_id: v.requester_id,
      owner_id: v.owner_id,
      scheduled_at: v.scheduled_at,
      status: v.status,
      note: v.note ?? null,
      created_at: v.created_at,
      listing_title: l?.title ?? null,
      listing_city: l?.city ?? null,
      requester_name: people.get(String(v.requester_id))?.name ?? null,
      owner_name: people.get(String(v.owner_id))?.name ?? null,
    };
  });
}

async function setVisitStatus(id, status) {
  const ref = db.collection('visits').doc(String(id));
  await ref.update({ status });
  return docShape(await ref.get());
}

// ---------------------------------------------------------------------------
// reports
// ---------------------------------------------------------------------------

async function createReport({ listing_id, reporter_id, reason, details }) {
  const ref = await db.collection('reports').add({
    listing_id: String(listing_id),
    reporter_id: String(reporter_id),
    reason,
    details: details ?? null,
    status: 'open',
    created_at: nowIso(),
  });
  return ref.id;
}

async function getReport(id) {
  const doc = await db.collection('reports').doc(String(id)).get();
  return docShape(doc);
}

async function listReports(status = 'open') {
  const snap = await db.collection('reports').where('status', '==', status).get();
  const reports = snap.docs.map(docShape)
    .filter(Boolean)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const listings = new Map();
  for (const r of reports) {
    if (!listings.has(r.listing_id)) {
      const ldoc = await db.collection('listings').doc(String(r.listing_id)).get();
      listings.set(r.listing_id, docShape(ldoc));
    }
  }
  const reporters = await getUsersByIds(reports.map((r) => r.reporter_id));
  return reports.map((r) => {
    const l = listings.get(r.listing_id);
    return {
      id: r.id,
      listing_id: r.listing_id,
      reporter_id: r.reporter_id,
      reason: r.reason,
      details: r.details ?? null,
      status: r.status,
      created_at: r.created_at,
      listing_title: l?.title ?? null,
      listing_city: l?.city ?? null,
      listing_status: l?.status ?? null,
      reporter_name: reporters.get(String(r.reporter_id))?.name ?? null,
    };
  });
}

async function setReportStatus(id, status) {
  const ref = db.collection('reports').doc(String(id));
  await ref.update({ status });
}

async function countOpenReports() {
  const snap = await db.collection('reports').where('status', '==', 'open').get();
  return snap.size;
}

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

// Haversine distance in km — shared by listing proximity search and alert matching.
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const s = Math.sin(toRad(lat2 - lat1) / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(s));
}

// Users who opted into listing alerts and set a location, excluding `excludeUid`.
async function listAlertSubscribers(excludeUid) {
  const snap = await db.collection('users').where('alerts_enabled', '==', true).get();
  return snap.docs
    .map(docShape)
    .filter((u) => u && u.id !== String(excludeUid)
      && Number.isFinite(Number(u.alert_lat)) && Number.isFinite(Number(u.alert_lng)));
}

async function addNotification(userId, { type, title, body, link }) {
  await db.collection('notifications').add({
    user_id: String(userId),
    type,
    title,
    body: body ?? null,
    link: link ?? null,
    is_read: 0,
    created_at: nowIso(),
  });
}

async function listNotifications(uid) {
  const snap = await db.collection('notifications')
    .where('user_id', '==', String(uid))
    .get();
  const rows = snap.docs.map(docShape)
    .filter(Boolean)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 50);
  // Count unread from the full snap (before slicing) using integer comparison
  // (is_read is stored as 0 or 1, not a boolean)
  const unread = snap.docs.filter((d) => d.data().is_read === 0).length;
  return { notifications: rows, unread_count: unread };
}

async function markNotificationRead(id, uid) {
  const ref = db.collection('notifications').doc(String(id));
  const doc = await ref.get();
  const d = docShape(doc);
  if (!d || d.user_id !== String(uid)) return false;
  await ref.update({ is_read: 1 });
  return true;
}

async function markAllNotificationsRead(uid) {
  const snap = await db.collection('notifications')
    .where('user_id', '==', String(uid))
    .where('is_read', '==', 0)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  for (const d of snap.docs) batch.update(d.ref, { is_read: 1 });
  await batch.commit();
}

// Public profile: safe-to-share fields plus the user's active listings.
// Email/phone stay private — contact happens through in-app chat.
async function getPublicProfile(uid, viewerUid) {
  const u = await getUser(uid);
  if (!u) return null;
  const { listings } = await queryListings({ mineUid: String(uid), limit: 12, viewerUid });
  return {
    user: {
      id: u.id,
      name: u.name ?? 'Roomie user',
      occupation: u.occupation ?? null,
      bio: u.bio ?? null,
      avatar_url: u.avatar_url ?? null,
      created_at: u.created_at ?? null,
    },
    listings,
    listing_count: listings.length,
  };
}

module.exports = {
  publicUser,
  getUser,
  getPublicProfile,
  provisionUser,
  upsertUser,
  updateUser,
  getAdminUids,
  countUsers,
  getUsersByIds,
  listingShape,
  createListing,
  getListing,
  updateListing,
  deleteListing,
  queryListings,
  countListings,
  isSaved,
  toggleSave,
  getSavedListings,
  findOrCreateConversation,
  getConversation,
  isParticipant,
  conversationView,
  listConversations,
  addMessage,
  listMessages,
  createVisit,
  getVisit,
  listVisits,
  setVisitStatus,
  createReport,
  getReport,
  listReports,
  setReportStatus,
  countOpenReports,
  addNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  haversineKm,
  listAlertSubscribers,
};
