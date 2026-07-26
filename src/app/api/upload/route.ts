import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in request." }, { status: 400 });
    }

    const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;

    // Check if Vercel Blob Token exists
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      console.log(`[Upload API] Uploading '${filename}' to @vercel/blob...`);
      const blob = await put(filename, file, {
        access: "public",
      });
      console.log(`[Upload API] Successfully uploaded to Vercel Blob: ${blob.url}`);
      return NextResponse.json({ url: blob.url }, { status: 200 });
    }

    // Fallback for local development if BLOB_READ_WRITE_TOKEN is not configured
    console.warn("[Upload API] BLOB_READ_WRITE_TOKEN not found. Converting file to Base64 Data URL fallback...");
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type || "image/png";
    const base64DataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    return NextResponse.json({ url: base64DataUrl }, { status: 200 });
  } catch (error: any) {
    console.error("[Upload API Error]:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during file upload." },
      { status: 500 }
    );
  }
}
