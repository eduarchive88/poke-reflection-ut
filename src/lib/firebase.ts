import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const isServer = typeof window === 'undefined';

// Firebase API key validation requires a specific format starting with AIzaSy
const rawKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const safeApiKey = (!rawKey || rawKey === "dummy-key")
  ? "AIzaSyDummyKey_1234567890abcdefghijklm"
  : rawKey;

const firebaseConfig = {
  apiKey: safeApiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize App (Always safe with a valid-looking key)
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

const createLazyProxy = (initFn: () => any, name: string) => {
  let _instance: any = null;
  return new Proxy({}, {
    get(target, prop) {
      if (prop === '$$typeof' || prop === 'constructor' || prop === 'prototype' || prop === 'toJSON') {
        return undefined;
      }

      // During build phase on Vercel, if we don't have real keys, avoid actual init
      if (isBuildPhase && (!rawKey || rawKey === "dummy-key")) {
        console.log(`[Build Protection] Skipping ${name} initialization for property: ${String(prop)}`);
        // Return a no-op function for method calls, or an empty object for properties
        return (...args: any[]) => {
          if (prop === 'onAuthStateChanged') return () => { }; // return unsubscriber
          return Promise.resolve({});
        };
      }

      if (!_instance) {
        try {
          _instance = initFn();
        } catch (e) {
          console.error(`[Firebase] Failed to initialize ${name}:`, e);
          return (...args: any[]) => Promise.resolve({});
        }
      }

      const value = _instance[prop];
      return typeof value === 'function' ? value.bind(_instance) : value;
    }
  }) as any;
};

export const auth = createLazyProxy(() => getAuth(app), "Auth");
export const db = createLazyProxy(() => getFirestore(app), "Firestore");

export { app };
