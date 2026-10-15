// Firebase Admin SDK initialisation for the Roomie API.
//
// Credentials are taken from the environment, in this order:
//   1. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
//      (the private key may contain literal "\n" sequences — they are
//      converted to real newlines before use; see .env.example), or
//   2. GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account JSON file.
//   3. Otherwise a bare initialisation with just the project id. This is
//      enough for the Firebase Emulator Suite (the SDK honours
//      FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST /
//      FIREBASE_STORAGE_EMULATOR_HOST automatically) and boots without
//      crashing when no credentials are configured; the first real
//      Firestore/Auth call will fail with a clear credentials error.
//
// Exports: { admin, db (Firestore), bucket (Cloud Storage), app }.
const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-roomie';
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    // Service-account keys pasted into env files/shells usually carry the
    // newlines escaped as the two characters "\n".
    privateKey = privateKey.replace(/\\n/g, '\n');
    return admin.initializeApp({
      projectId,
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return admin.initializeApp({
      projectId,
      credential: admin.credential.applicationDefault(),
      storageBucket,
    });
  }

  // Emulator / credential-less fallback. Never throws here; calls that need
  // real credentials fail loudly when first used.
  return admin.initializeApp({ projectId, storageBucket });
}

const app = initAdmin();
const db = app.firestore();
const bucket = app.storage().bucket();

module.exports = { admin, db, bucket, app };
