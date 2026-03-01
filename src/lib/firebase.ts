import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "dummy-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize App
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// Lazy init services to prevent errors during build time (prerendering)
let _auth: any = null;
let _db: any = null;

export const auth = new Proxy({}, {
  get(target, prop) {
    if (!_auth) {
      try {
        _auth = getAuth(app);
      } catch (e) {
        console.warn("Firebase Auth not available:", e);
        return (_: any) => { }; // dummy function for onAuthStateChanged etc
      }
    }
    return (_auth as any)[prop];
  }
}) as any;

export const db = new Proxy({}, {
  get(target, prop) {
    if (!_db) {
      try {
        _db = getFirestore(app);
      } catch (e) {
        console.warn("Firebase Firestore not available:", e);
        return null;
      }
    }
    return (_db as any)[prop];
  }
}) as any;

export { app };
