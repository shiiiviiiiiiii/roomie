# Roomie — find rooms & flatmates

A self-hostable room/flatmate marketplace: browse listings across Indian cities,
post a room, save homes, chat with owners, request visits, and get alerts —
with an admin moderation queue for reported listings.

**Stack (boring, on purpose):** Node.js + Express API backed by **Firebase**
(Auth for sign-in, Firestore for data, Cloud Storage for photos), React + Vite
SPA served by Express in production, Leaflet + OpenStreetMap for maps (no API
key). Rents formatted Indian-style (₹, lakh/crore grouping).

> All seed data is fictional — invented names, areas and rents for demo purposes.

## Firebase setup (one-time)

You need a Firebase project. The server talks to Firebase with the **Admin
SDK** (service-account credentials); the browser app talks to **Firebase Auth**
directly with the web SDK.

1. **Create a project** at [console.firebase.google.com](https://console.firebase.google.com)
   → *Add project*. Any name works (e.g. `roomie`).
2. **Authentication → Sign-in method** → enable **Email/Password**, and
   **Google** (for the "Continue with Google" buttons). Add your production
   domain under *Settings → Authorized domains*.
3. **Firestore Database → Create database** → choose **production mode**
   (locked rules) and location **`asia-south1`** (Mumbai, closest to users).
   Then deploy this repo's locked rules (they deny all direct client access —
   everything goes through the API):
   ```bash
   npx firebase-tools deploy --only firestore:rules   # or: firebase deploy --only firestore:rules
   ```
4. **Storage → Get started** (production mode), then deploy the locked rules:
   ```bash
   firebase deploy --only storage
   ```
5. **Register a web app**: Project settings → *Your apps* → *Add app* → Web.
   Copy the `firebaseConfig` values into your `.env` as the `VITE_FIREBASE_*`
   vars (see `.env.example`).
6. **Service-account key for the server**: Project settings → *Service
   accounts* → *Generate new private key* → downloads a JSON file.
   - **NEVER commit this file** (it's gitignored). Either mount it into the
     server and set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`, or
     paste its `project_id`, `client_email` and `private_key` into
     `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`
     (keep the literal `\n` sequences in the key — the server converts them).

## Quickstart

```bash
# 1. install everything
npm run install:all

# 2. configure
cp .env.example .env
# (edit .env — fill in the FIREBASE_* server creds and VITE_FIREBASE_* web config)

# 3. seed the demo data (35 listings + demo users; needs creds or emulator env — see below)
npm run seed

# 4a. dev mode — API on :4000, frontend on :5173 (Vite dev server)
npm run dev            # terminal 1: API with auto-reload
npm run dev:client     # terminal 2: Vite dev server

# 4b. production mode — build the frontend, serve everything from Express
npm run build
npm start              # http://localhost:4000
```

**Demo logins** (seeded by `npm run seed` — demo only, delete before real use):

| Role  | Email             | Password   |
|-------|-------------------|------------|
| Admin | admin@roomie.demo | Roomie@123 |
| User  | demo@roomie.demo  | demo1234   |

The admin account can open **Moderation** in the nav to review reported listings
(hide / restore them, resolve or dismiss reports).

## Local development with the Firebase Emulator Suite

No Firebase project needed. You need **Java** (any JRE 11+) and
`firebase-tools`:

```bash
npm i -g firebase-tools
# terminal 1 — from the repo root:
firebase emulators:start --only auth,firestore,storage
# Emulator UI at http://127.0.0.1:4001
```

Then point everything at the emulators:

```bash
# terminal 2 — server + seed against the emulators
export FIREBASE_PROJECT_ID=demo-roomie
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
npm run seed
npm run dev

# terminal 3 — web app against the Auth emulator
VITE_USE_FIREBASE_EMULATORS=true \
VITE_FIREBASE_API_KEY=demo-key \
VITE_FIREBASE_AUTH_DOMAIN=demo-roomie.firebaseapp.com \
VITE_FIREBASE_PROJECT_ID=demo-roomie \
VITE_FIREBASE_STORAGE_BUCKET=demo-roomie.appspot.com \
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890 \
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef \
npm run dev:client
```

The same `FIREBASE_*_EMULATOR_HOST` vars make `npm start` and `npm run seed`
work against the emulators in "production" mode too. `firebase.json` already
wires the emulator ports (auth :9099, firestore :8080, storage :9199).

## Docker (one command)

```bash
cp .env.example .env   # fill in FIREBASE_* server creds + VITE_FIREBASE_* web config
docker compose up --build -d
docker compose exec roomie node server/src/seed.js   # seed demo data once
# app on http://localhost:4000
```

Pass the web config at build time if you build the image yourself:
`docker build --build-arg VITE_FIREBASE_API_KEY=… …` (all `VITE_FIREBASE_*`
vars are supported as build args). For the server, provide the Admin
credentials either as `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` /
`FIREBASE_PRIVATE_KEY` env vars, or mount a service-account JSON read-only
and set `GOOGLE_APPLICATION_CREDENTIALS` — see `docker-compose.yml`. No
volumes are needed: data and photos live in Firebase, not on disk.

## Deploy guides

### Railway
1. Push this repo to GitHub, then **New Project → Deploy from GitHub**.
2. Railway detects the `Dockerfile` automatically.
3. Set variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
   `FIREBASE_PRIVATE_KEY` (multiline — keep the `\n`s), `PORT=4000`, and the
   `VITE_FIREBASE_*` build args (Railway → service → Variables; build args via
   the Dockerfile settings or `railway` build config).
4. After first deploy, seed once: `railway run node server/src/seed.js`.
5. Railway gives you a public domain under **Settings → Networking** — add it
   to Firebase *Authentication → Authorized domains* and to `CORS_ORIGINS`.

### Render
1. **New → Web Service**, connect the repo, choose **Docker** runtime.
2. Set env vars: `FIREBASE_*` (server creds), `PORT=4000`, plus the
   `VITE_FIREBASE_*` build args (Render → *Docker Build Arguments*).
3. Alternatively upload the service-account JSON as a **secret file** and set
   `GOOGLE_APPLICATION_CREDENTIALS` to its path.
4. Seed once via **Shell**: `node server/src/seed.js`.
5. Deploys on every push to your branch. No persistent disk needed.

## Project layout

```
roomie/
├── server/               # Express API
│   ├── src/
│   │   ├── index.js      # app wiring (helmet, CORS, rate limits, static frontend)
│   │   ├── firebase.js   # Admin SDK init (env creds or emulator)
│   │   ├── store.js      # Firestore data-access layer (8 collections)
│   │   ├── seed.js       # 35 fictional listings + demo Auth users
│   │   ├── middleware/auth.js   # Firebase ID-token verification, admin guard
│   │   ├── middleware/validate.js # zod validation for mutating endpoints
│   │   ├── routes/       # auth, listings, conversations, visits,
│   │   │                 # notifications, upload, admin
│   │   └── utils/notify.js      # in-app notifications + stubbed mail/SMS/push
├── client/               # React + Vite SPA
│   └── src/
│       ├── firebase.js   # Firebase web SDK init (auth + Google provider)
│       ├── pages/        # Home, Browse, ListingDetail, PostRoom, Dashboard,
│       │                 # Chats, ChatThread, Login, Signup, Profile,
│       │                 # Notifications, Admin, Terms, Privacy, Cookies
│       ├── components/   # ListingCard, MapView (Leaflet), CookieConsent
│       ├── api.js        # fetch wrapper + Firebase ID token
│       └── format.js     # ₹ formatting, labels
├── firestore.rules       # locked-down Firestore rules (deploy with firebase-tools)
├── storage.rules         # locked-down Storage rules
├── firebase.json         # emulator ports + rules wiring
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## What's stubbed (needs your API keys)

- **Phone / OTP login** — not implemented (Twilio or MSG91); see `.env.example`.
- **Transactional email** — `sendMail()` in `server/src/utils/notify.js` (SMTP)
- **SMS alerts** — `sendSms()` (Twilio / MSG91)
- **Push notifications** — `sendPush()` (Web Push / FCM)

In-app notifications (the bell in the nav) fully work without any of these.
Google sign-in is **real** now (Firebase Auth), not a stub.

## API overview

Auth is a Firebase ID token in `Authorization: Bearer <idToken>`. The server
provisions the `users/{uid}` profile on the first verified call.

| Method & path | Auth | What it does |
|---|---|---|
| `GET /api/auth/me` | user | Profile (provisions on first call) |
| `PATCH /api/auth/me` (`PUT` also works) | user | Update profile |
| `GET /api/listings?…` | – | Search (city, q, min/max rent, bhk, room type, furnishing, tenant pref, sort) |
| `POST /api/listings` | user | Post a room |
| `PUT/DELETE /api/listings/:id` | owner | Edit / delete |
| `POST /api/listings/:id/save` | user | Toggle saved |
| `GET /api/listings/saved/mine` | user | Saved homes |
| `POST /api/listings/:id/report` | user | Report a listing |
| `GET/POST /api/conversations[/ :id/messages]` | user | In-app chat |
| `GET/POST/PATCH /api/visits[/ :id]` | user | Visit requests + confirm/decline |
| `GET/PATCH/POST /api/notifications…` | user | Alerts |
| `POST /api/upload` | user | Image upload to Cloud Storage (5 MB, jpg/png/webp/gif, magic-byte checked) |
| `GET/PATCH /api/admin/…` | admin | Reports queue, hide/restore listings, stats |
| `GET /api/health` | – | Health check |

## Legal pages, privacy & cookie consent

- `/terms`, `/privacy` and `/cookies` serve template legal pages
  (`client/src/pages/Terms.jsx`, `Privacy.jsx`, `Cookies.jsx`), linked from the
  footer. The cookie banner (`client/src/components/CookieConsent.jsx`) asks for
  consent on first visit, stores it in localStorage (`roomie_cookie_consent`;
  see `client/src/consent.js`), and can be reopened anytime via the footer's
  "Cookie settings" link.
- **These are templates, not legal advice.** Every page contains bold **[TODO]**
  placeholders (legal entity name, registered address, support/privacy emails,
  grievance officer, retention periods, governing-law city). Fill in all of them
  — and have a lawyer review the pages — **before going live**, especially the
  DPDP Act 2023 references in the Privacy Policy.

## Notes & simplifications vs the original build

- Fresh implementation, not a copy of the original hosted app's code.
- Post-a-room is a clean 5-step form (the original had 12 steps).
- Chat is simple polling (8 s), not websockets — fine for this scale.
- Maps show an **approximate** 600 m radius circle, not an exact pin.
- No public share/export of user data; everything stays in your Firebase project.
- Never commit `.env` or any service-account JSON — both are gitignored.

## Notes & simplifications vs the SQLite build

- **No JOINs**: owner names, sender names, etc. are hydrated with batched
  Firestore reads (`db.getAll`) in `server/src/store.js`.
- **Listing search filters in JS**: Firestore only runs a single indexed
  `status == 'active'` query; city/rent/text/sort filters apply in memory.
  Fine at this scale; at larger scale push filters down with composite indexes
  (or a dedicated search service).
- **Atomic uniqueness without transactions**: saves use doc id
  `{uid}_{listingId}` and conversations `{listingId}_{a}_{b}` (participants
  sorted), mirroring the old UNIQUE constraints.
- **IDs are strings** (Firestore auto-IDs and Auth UIDs), not integers —
  the API shapes are otherwise identical, so the client barely changed.
- **Message ordering** uses millisecond ISO timestamps; the chat list's
  last-message preview is denormalised onto the conversation document by
  `addMessage()` so it stays exact even for same-millisecond messages.
- **No local disk**: uploads go to Cloud Storage via memory-buffered multer;
  nothing is served from `/uploads` anymore.
