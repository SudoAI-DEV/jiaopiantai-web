import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getS3Client, generateFileKey, getPublicUrl } from "@/lib/oss";
import { PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = (formData.get("type") as string) as "source" | "generated" || "source";
    const productId = (formData.get("productId") as string) || "temp";

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Generate unique key for the file
    const key = generateFileKey(
      type,
      session.user.id,
      productId,
      file.name
    );

    // Upload to R2 through server
    const s3Client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME || "jiaopiantai";

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    return NextResponse.json({
      key,
      publicUrl: getPublicUrl(key),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
