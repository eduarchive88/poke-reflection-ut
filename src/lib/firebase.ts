import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
const isServer = typeof window === 'undefined';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKey_1234567890abcdefghijklm",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize App (Always safe)
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Lazy init services to prevent errors during build time (prerendering)
let _auth: any = null;
let _db: any = null;

const createLazyProxy = (initFn: () => any, name: string) => {
  return new Proxy({}, {
    get(target, prop) {
      // React and other tools check these properties
      if (prop === '$$typeof' || prop === 'constructor' || prop === 'prototype') {
        return undefined;
      }

      // During build phase, if we don't have real keys, return dummy values/functions
      if (isBuildPhase && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        console.log(`[Build] Skipping ${name} initialization for property: ${String(prop)}`);
        return () => { };
      }

      if (!target.hasOwnProperty('_instance')) {
        try {
          (target as any)._instance = initFn();
        } catch (e) {
          console.error(`[Firebase] Failed to initialize ${name}:`, e);
          return () => { };
        }
      }

      const instance = (target as any)._instance;
      const value = instance ? instance[prop] : undefined;

      return typeof value === 'function' ? value.bind(instance) : value;
    }
  }) as any;
};

export const auth = createLazyProxy(() => getAuth(app), "Auth");
export const db = createLazyProxy(() => getFirestore(app), "Firestore");

export { app };
