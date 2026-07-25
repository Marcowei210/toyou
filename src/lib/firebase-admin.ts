import { getApps, initializeApp, getApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

// Determine if we should connect to local emulators or cloud Firebase
const isEmulator =
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" ||
  (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_EMULATORS !== "false");

if (isEmulator) {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  }
  if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
  }
}

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  "demo-detective-game";

function initAdminApp() {
  if (getApps().length > 0) return getApp();

  if (isEmulator) {
    return initializeApp({
      projectId,
      storageBucket: `${projectId}.appspot.com`,
    });
  }

  // Production (Vercel) initialization via service account key JSON or individual credentials
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (serviceAccountKey) {
    try {
      const parsed = JSON.parse(serviceAccountKey);
      return initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      });
    } catch (err) {
      console.error("[Firebase Admin] Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON:", err);
    }
  }

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
  }

  // Fallback default initialization
  return initializeApp({
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  });
}

const app = initAdminApp();
const adminDb = getFirestore(app);

if (isEmulator) {
  try {
    adminDb.settings({
      host: "127.0.0.1:8080",
      ssl: false,
    });
    console.log(`[Firebase Admin] Connected to local emulator at 127.0.0.1:8080 (projectId: ${projectId})`);
  } catch (err) {
    // Ignore error if settings were already locked on hot-reload
  }
}

const adminAuth = getAuth(app);
const adminStorage = getStorage(app);

export { adminDb, adminAuth, adminStorage };
