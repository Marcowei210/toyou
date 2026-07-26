import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  hashPassword,
  validateAccountId,
  validatePassword,
  validateNickname,
} from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const { accountId, password, nickname } = await request.json();

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

    // 2. Query Firestore via firebase-admin lazily to check if Account ID already exists
    const db = getAdminDb();
    console.log(`[Register API] Querying Firestore for user document '${accountId}'...`);
    const userDocRef = db.collection("users").doc(accountId);
    
    let userExists = false;
    try {
      const userDoc = await userDocRef.get();
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

    // 3. Write user profile and credentials to Firestore using .doc(accountId).set({...})
    const hashedPassword = hashPassword(password);

    console.log(`[Register API] Executing .doc('${accountId}').set({...}) for user profile...`);
    try {
      await userDocRef.set({
        accountId,
        nickname,
        score: 0,
        title: "Novice Detective",
        avatarUrl: "",
        role: "player",
        team: "Unassigned",
        isLeader: false,
        createdAt: new Date().toISOString(),
      });
      console.log(`[Register API] Successfully wrote user profile document for '${accountId}'.`);
    } catch (writeErr: any) {
      console.error(`[Register API Error] Failed to write user profile for '${accountId}':`, writeErr);
      return NextResponse.json(
        { error: `Failed to create user profile: ${writeErr.message || writeErr}` },
        { status: 500 }
      );
    }

    console.log(`[Register API] Executing .set({...}) for credentials subcollection...`);
    try {
      const credentialsDocRef = userDocRef.collection("private").doc("credentials");
      await credentialsDocRef.set({
        passwordHash: hashedPassword,
        updatedAt: new Date().toISOString(),
      });
      console.log(`[Register API] Successfully wrote credentials subcollection for '${accountId}'.`);
    } catch (credErr: any) {
      console.error(`[Register API Error] Failed to write credentials for '${accountId}':`, credErr);
      return NextResponse.json(
        { error: `Failed to create credentials record: ${credErr.message || credErr}` },
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
