import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKey_1234567890abcdefghijklm",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Internal initialization function
const initFirebase = () => {
  if (isBuildPhase) {
    console.log("[Firebase] Returning mock instances for build phase.");
    return {
      app: { options: {} } as any,
      auth: {
        onAuthStateChanged: () => () => { },
        signOut: () => Promise.resolve(),
        currentUser: null
      } as any,
      db: {
        _type: 'firestore-mock'
      } as any
    };
  }

  try {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    return { app, auth, db };
  } catch (e) {
    console.error("[Firebase] Runtime init failed:", e);
    return {
      app: {} as any,
      auth: { onAuthStateChanged: () => () => { } } as any,
      db: {} as any
    };
  }
};

const { app, auth, db } = initFirebase();

export { app, auth, db };
