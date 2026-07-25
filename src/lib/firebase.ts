import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const projectId = "demo-detective-game";

// Fake configurations are accepted by the Firebase local emulator in demo mode.
const firebaseConfig = {
  apiKey: "demo-detective-key",
  authDomain: `${projectId}.firebaseapp.com`,
  projectId: projectId,
  storageBucket: `${projectId}.appspot.com`,
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:1234567890"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect client SDK to local emulators
const isConfigured = (globalThis as any)._firebaseEmulatorsConnected;
if (!isConfigured) {
  try {
    // Resolve hostname dynamically in browser to allow external local network devices to connect
    const emulatorHost = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
    
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectStorageEmulator(storage, emulatorHost, 9199);
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    
    (globalThis as any)._firebaseEmulatorsConnected = true;
    console.log(`[Firebase Client] Connected to local emulators at ${emulatorHost} (projectId: demo-detective-game)`);
  } catch (err) {
    console.warn("[Firebase Client] Emulator connection warning:", err);
  }
}

export { app, auth, db, storage };
