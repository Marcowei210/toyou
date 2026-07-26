import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided in FormData request." },
        { status: 400 }
      );
    }

    // Clean filename
    const originalName = file.name || "upload.png";
    const filename = `uploads/${Date.now()}_${originalName.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;

    console.log(`[Upload API] Uploading '${filename}' to @vercel/blob...`);

    // Upload directly using @vercel/blob put method
    const blob = await put(filename, file, {
      access: "public",
    });

    console.log(`[Upload API] Successfully uploaded to Vercel Blob. Public URL: ${blob.url}`);

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error: any) {
    console.error("[Upload API Error] Vercel Blob upload failed:", error);
    return NextResponse.json(
      { error: error.message || "Vercel Blob upload failed. Make sure BLOB_READ_WRITE_TOKEN is configured in environment variables." },
      { status: 500 }
    );
  }
}
