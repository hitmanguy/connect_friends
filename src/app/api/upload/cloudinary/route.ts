import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { uploadCloudinary } from "../../../../../backend/cloudinary/upload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const MAX = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const mime = file.type || "application/octet-stream";
    if (!/^image\/|^video\//.test(mime)) {
      return NextResponse.json({ error: "Unsupported type" }, { status: 415 });
    }

    const ab = await file.arrayBuffer();
    const dataUri = `data:${mime};base64,${Buffer.from(ab).toString("base64")}`;

    const publicId = `mood_${crypto.randomUUID()}`;
    const result = await uploadCloudinary(dataUri, publicId);

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
      type: result.resource_type === "video" ? "video" : "image",
    });
  } catch (e: any) {
    console.error("upload-cloudinary error:", e);
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
