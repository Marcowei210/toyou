// MUST be set at the VERY TOP of the file BEFORE any imports or firebase-admin initializations!
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
}
if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
}

import { getApps, initializeApp, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

const projectId = process.env.GCLOUD_PROJECT || "demo-detective-game";

const app = getApps().length === 0
  ? initializeApp({
      projectId: projectId,
      storageBucket: `${projectId}.appspot.com`,
    })
  : getApp();

const adminDb = getFirestore(app);

// Force adminDb to target the local emulator via explicit settings
try {
  adminDb.settings({
    host: "127.0.0.1:8080",
    ssl: false,
  });
  console.log(`[Firebase Admin] Connected to local emulator at 127.0.0.1:8080 (projectId: ${projectId})`);
} catch (err) {
  // Ignore error if settings were already locked on hot-reload
}

const adminAuth = getAuth(app);
const adminStorage = getStorage(app);

export { adminDb, adminAuth, adminStorage };
