import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from 'firebase/auth';
// getReactNativePersistence is shipped at runtime by firebase/auth v11 but
// missing from its TypeScript exports (known upstream types gap).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => Persistence;
};
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

export const isFirebaseConfigured =
  !!process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
  !!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID &&
  !!process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Already initialized (hot reload or multiple imports) — fall back to getAuth.
  authInstance = getAuth(app);
}

export const auth = authInstance;

/**
 * Firestore with an on-device cache so reads/writes can continue while
 * offline (airplane mode, flaky network, subway dead zones). Writes are
 * queued and replayed when the device reconnects; reads are served from
 * the cache if available. Falls back to memory-only cache on hot reload
 * / double-init so the app never fails to boot.
 */
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache(),
  });
} catch {
  // Already initialised (hot reload) or the target platform doesn't
  // support persistence (e.g. some test runners) — fall back gracefully.
  try {
    dbInstance = getFirestore(app);
  } catch {
    dbInstance = initializeFirestore(app, { localCache: memoryLocalCache() });
  }
}
export const db = dbInstance;
export default app;
