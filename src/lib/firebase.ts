import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const isEmulator =
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" ||
  (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_EMULATORS !== "false");

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-detective-game";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-detective-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId: projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:1234567890"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

// Connect client SDK to local emulators ONLY if isEmulator is true
const isConfigured = (globalThis as any)._firebaseEmulatorsConnected;
if (isEmulator && !isConfigured) {
  try {
    // Resolve hostname dynamically in browser to allow external local network devices to connect
    const emulatorHost = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
    
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    
    (globalThis as any)._firebaseEmulatorsConnected = true;
    console.log(`[Firebase Client] Connected to local emulators at ${emulatorHost} (projectId: ${projectId})`);
  } catch (err) {
    console.warn("[Firebase Client] Emulator connection warning:", err);
  }
}

export { app, auth, db };
