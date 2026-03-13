import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateFileKey } from "@/lib/r2";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as "source" | "generated") || "source";
    const productId = (formData.get("productId") as string) || "temp";

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const key = generateFileKey(type, session.user.id, productId, file.name);

    console.log("Uploading to R2:", {
      endpoint: process.env.R2_ENDPOINT ? "set" : "missing",
      bucket: process.env.R2_BUCKET_NAME ? "set" : "missing",
      key: key.substring(0, 50),
    });

    // Use S3 client
    const s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    const result = await s3Client.send(command);

    console.log("Upload success:", result);

    return NextResponse.json({
      key,
      publicUrl: `/api/files/${key}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: String(error) },
      { status: 500 }
    );
  }
}
