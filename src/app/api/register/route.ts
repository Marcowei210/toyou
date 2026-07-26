import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  hashPassword,
  validateAccountId,
  validatePassword,
  validateNickname,
} from "@/lib/auth-utils";

// Timeout helper to prevent Vercel functions from hanging indefinitely
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = String(body.accountId || "").trim();
    const password = String(body.password || "").trim();
    const nickname = String(body.nickname || "").trim();

    // 1. Input Validation checks
    if (!accountId || !password || !nickname) {
      return NextResponse.json(
        { error: "All fields (Account ID, Password, Nickname) are required." },
        { status: 400 }
      );
    }

    if (!validateAccountId(accountId)) {
      return NextResponse.json(
        { error: "Account ID must be 4-10 alphanumeric characters." },
        { status: 400 }
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: "Password must be 4-10 characters (alphanumeric or !-=+?*$)." },
        { status: 400 }
      );
    }

    if (!validateNickname(nickname)) {
      return NextResponse.json(
        { error: "Nickname must be 1-10 characters." },
        { status: 400 }
      );
    }

    // 2. Query Firestore via firebase-admin lazily
    const db = getAdminDb();
    console.log(`[Register API] Querying Firestore for user document '${accountId}'...`);
    const userDocRef = db.collection("users").doc(String(accountId));
    
    let userExists = false;
    try {
      const userDoc = await withTimeout(userDocRef.get(), 6000, "Firestore user lookup timed out");
      userExists = userDoc.exists;
      console.log(`[Register API] Document check for '${accountId}' complete. Exists: ${userExists}`);
    } catch (readErr: any) {
      const errCode = readErr?.code;
      const errMessage = String(readErr?.message || readErr);

      // gRPC Code 5 or NOT_FOUND indicates the document doesn't exist yet -> treat as userExists = false
      if (
        errCode === 5 ||
        errCode === "not-found" ||
        errCode === "auth/user-not-found" ||
        errMessage.includes("NOT_FOUND") ||
        errMessage.includes("5 NOT_FOUND")
      ) {
        console.log(`[Register API] Document '${accountId}' not found (Code 5/NOT_FOUND). Account ID is available for registration.`);
        userExists = false;
      } else {
        console.error(`[Register API Error] Firestore read failed for '${accountId}':`, readErr);
        return NextResponse.json(
          { error: `Database query failed: ${errMessage}` },
          { status: 500 }
        );
      }
    }

    if (userExists) {
      console.log(`[Register API] Account ID '${accountId}' is taken. Returning 400 Bad Request.`);
      return NextResponse.json(
        { error: "Account ID is already taken. Please choose a different Account ID." },
        { status: 400 }
      );
    }

    // 3. Write user profile to Firestore
    const profilePayload = JSON.parse(
      JSON.stringify({
        accountId: String(accountId),
        nickname: String(nickname),
        score: 0,
        title: "那個新來的",
        avatarUrl: "",
        role: "player",
        team: "Unassigned",
        isLeader: false,
        createdAt: new Date().toISOString(),
      })
    );

    console.log(`[Register API] Executing .doc('${accountId}').set({...}, { merge: true }) for user profile...`);
    try {
      await withTimeout(
        userDocRef.set(profilePayload, { merge: true }),
        6000,
        "Firestore profile write timed out"
      );
      console.log(`[Register API] Successfully wrote user profile document for '${accountId}'.`);
    } catch (writeErr: any) {
      const msg = writeErr?.message || String(writeErr);
      console.error(`[Register API Error] Failed to write user profile for '${accountId}':`, writeErr);
      if (msg.includes("5 NOT_FOUND") || msg.includes("NOT_FOUND")) {
        return NextResponse.json(
          { error: `Firestore database not found or not created yet in Firebase Console (Error 5: NOT_FOUND). Please open Firebase Console -> Firestore Database and click 'Create database'.` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Failed to create user profile: ${msg}` },
        { status: 500 }
      );
    }

    // 4. Write credentials subcollection to Firestore with ID string casting & payload sanitization
    const hashedPassword = hashPassword(password);
    const credentialsDocRef = db
      .collection("users")
      .doc(String(accountId))
      .collection("private")
      .doc("credentials");

    const credentialsPayload = JSON.parse(
      JSON.stringify({
        passwordHash: String(hashedPassword || ""),
        updatedAt: new Date().toISOString(),
      })
    );

    console.log(`[Register API] Executing .set({...}, { merge: true }) for credentials subcollection of '${accountId}'...`);
    try {
      await withTimeout(
        credentialsDocRef.set(credentialsPayload, { merge: true }),
        6000,
        "Firestore credentials subcollection write timed out"
      );
      console.log(`[Register API] Successfully wrote credentials subcollection for '${accountId}'.`);
    } catch (credErr: any) {
      console.error("[Register API Error] Credential write error:", credErr);
      const msg = credErr?.message || String(credErr);
      return NextResponse.json(
        { error: `Failed to create credentials record: ${msg}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, accountId, nickname },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Register API Error] Unexpected error during registration:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during registration." },
      { status: 500 }
    );
  }
}
