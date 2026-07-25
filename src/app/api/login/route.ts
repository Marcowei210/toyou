import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { hashPassword, validateAccountId, validatePassword } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    const { accountId, password } = await request.json();

    // 1. Validation checks
    if (!accountId || !password) {
      return NextResponse.json(
        { error: "Account ID and password are required." },
        { status: 400 }
      );
    }

    if (!validateAccountId(accountId) || !validatePassword(password)) {
      return NextResponse.json(
        { error: "Invalid Account ID or password format." },
        { status: 400 }
      );
    }

    // 2. Fetch user profile
    const userDocRef = adminDb.collection("users").doc(accountId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "No such detective case file. Invalid Account ID or password." },
        { status: 401 }
      );
    }

    // 3. Fetch user private credentials
    const credentialsDocRef = userDocRef.collection("private").doc("credentials");
    const credentialsDoc = await credentialsDocRef.get();

    if (!credentialsDoc.exists) {
      return NextResponse.json(
        { error: "No credentials record found. Contact admin." },
        { status: 401 }
      );
    }

    const { passwordHash } = credentialsDoc.data() || {};
    const inputPasswordHash = hashPassword(password);

    if (passwordHash !== inputPasswordHash) {
      return NextResponse.json(
        { error: "Incorrect password. The evidence doesn't match." },
        { status: 401 }
      );
    }

    const userData = userDoc.data();

    return NextResponse.json(
      {
        success: true,
        user: {
          accountId: userData?.accountId,
          nickname: userData?.nickname,
          score: userData?.score || 0,
          title: userData?.title || "Novice Detective",
          avatarUrl: userData?.avatarUrl || "",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
