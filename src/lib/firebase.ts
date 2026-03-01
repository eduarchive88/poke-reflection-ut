// This file handles Firebase initialization with strict build-time safety for Vercel.

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || (typeof process !== 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKey_1234567890abcdefghijklm",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Define Mocks
const noop = () => { };
const asyncNoop = () => Promise.resolve({});
const mockAuth = new Proxy({}, { get: (t, p) => p === 'onAuthStateChanged' ? () => noop : asyncNoop });
const mockDb = new Proxy({}, { get: (t, p) => () => mockDb });

let app: any;
let auth: any = mockAuth;
let db: any = mockDb;

if (!isBuildPhase) {
  try {
    // Only import and initialize at runtime
    const { initializeApp, getApps } = require("firebase/app");
    const { getAuth } = require("firebase/auth");
    const { getFirestore } = require("firebase/firestore");

    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("[Firebase] Runtime initialization failed:", e);
  }
} else {
  console.log("[Firebase] 🛡️ Build-time Mocking enabled.");
  app = { options: {} };
}

export { app, auth, db };
