import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
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
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  "demo-detective-game";

function initAdminApp(): App {
  // Prevent double initialization in serverless environments
  if (getApps().length > 0) {
    return getApp();
  }

  if (isEmulator) {
    return initializeApp({
      projectId,
      storageBucket: `${projectId}.appspot.com`,
    });
  }

  // Production Vercel initialization using 3 separate environment variables
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && rawPrivateKey) {
    // Format private key escaped newlines (\n) to actual newlines
    const formattedPrivateKey = rawPrivateKey.replace(/\\n/g, "\n");
    console.log(`[Firebase Admin] Initializing with client email '${clientEmail}' for project '${projectId}'`);
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
  }

  // Fallback default initialization
  console.log(`[Firebase Admin] Initializing with default application credentials for project '${projectId}'`);
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
