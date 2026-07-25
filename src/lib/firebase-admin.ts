import { initializeApp, getApps, getApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";

let cachedApp: App | null = null;
let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;
let cachedStorage: Storage | null = null;

/**
 * Lazy initialization function for Firebase Admin App.
 * Does NOT execute at top-level module load time.
 */
export function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }

  try {
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

    if (isEmulator) {
      cachedApp = initializeApp({
        projectId,
        storageBucket: `${projectId}.appspot.com`,
      });
      return cachedApp;
    }

    // Production Vercel initialization using 3 separate environment variables
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

    if (clientEmail && privateKey) {
      console.log(`[Firebase Admin] Lazy initializing with client email '${clientEmail}' for project '${projectId}'`);
      cachedApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      });
      return cachedApp;
    }

    // Fallback default initialization
    console.log(`[Firebase Admin] Lazy initializing with default application credentials for project '${projectId}'`);
    cachedApp = initializeApp({
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
    return cachedApp;
  } catch (e: any) {
    console.error("[Firebase Admin Error] Initialization failed:", e);
    throw new Error("Firebase Admin Init Failed: " + (e.message || e));
  }
}

/**
 * Lazy initialization function for Firestore.
 */
export function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;
  const app = getAdminApp();
  try {
    cachedDb = getFirestore(app);

    const isEmulator =
      process.env.NEXT_PUBLIC_USE_EMULATORS === "true" ||
      (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_EMULATORS !== "false");

    if (isEmulator) {
      try {
        cachedDb.settings({
          host: "127.0.0.1:8080",
          ssl: false,
        });
      } catch (err) {
        // Ignore if settings already locked
      }
    }
    return cachedDb;
  } catch (e: any) {
    console.error("[Firebase Admin Error] Firestore initialization failed:", e);
    throw new Error("Firebase Admin Init Failed (Firestore): " + (e.message || e));
  }
}

/**
 * Lazy initialization function for Auth.
 */
export function getAdminAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  const app = getAdminApp();
  cachedAuth = getAuth(app);
  return cachedAuth;
}

/**
 * Lazy initialization function for Storage.
 */
export function getAdminStorage(): Storage {
  if (cachedStorage) return cachedStorage;
  const app = getAdminApp();
  cachedStorage = getStorage(app);
  return cachedStorage;
}

// Backward-compatibility exports using Proxy for any direct property access
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get: (_, prop) => {
    const target = getAdminDb() as any;
    const value = target[prop];
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get: (_, prop) => {
    const target = getAdminAuth() as any;
    const value = target[prop];
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export const adminStorage: Storage = new Proxy({} as Storage, {
  get: (_, prop) => {
    const target = getAdminStorage() as any;
    const value = target[prop];
    return typeof value === "function" ? value.bind(target) : value;
  },
});
