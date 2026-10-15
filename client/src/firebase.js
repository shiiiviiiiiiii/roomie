// Firebase web SDK initialisation.
//
// Config comes from VITE_FIREBASE_* env vars (see .env.example). For local
// development against the Firebase Emulator Suite, set
// VITE_USE_FIREBASE_EMULATORS=true (optionally with
// VITE_FIREBASE_AUTH_EMULATOR_HOST, default http://127.0.0.1:9099) — any
// apiKey/projectId values work there, e.g. "demo-key" / "demo-roomie".
//
// If the web config is missing, `auth` is null and the app still renders:
// browsing works anonymously, and auth UI reports "not configured" instead
// of crashing.
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider } from 'firebase/auth';

export const googleProvider = new GoogleAuthProvider();

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let auth = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(
      auth,
      import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099',
      { disableWarnings: true }
    );
  }
} else {
  console.warn(
    '[roomie] Firebase web config missing — sign-in disabled. ' +
    'Set VITE_FIREBASE_* vars (see .env.example).'
  );
}

export { auth };
