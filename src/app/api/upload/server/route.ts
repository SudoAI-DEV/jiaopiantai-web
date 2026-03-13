import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateFileKey } from "@/lib/oss";
import crypto from "crypto";

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

    // R2 configuration
    const r2Endpoint = process.env.R2_ENDPOINT || "https://88a96747babe00a5c70ab1954e53e136.r2.cloudflarestorage.com";
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || "";
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
    const r2Bucket = process.env.R2_BUCKET_NAME || "jiaopiantai";

    // Generate AWS Signature Version 4
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);
    const region = "auto";
    const service = "s3";
    const expiresIn = 3600;

    // Create canonical request for presigned URL
    const credential = `${r2AccessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;
    const credentialEncoded = encodeURIComponent(credential);
    
    const canonicalQuerystring = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${credentialEncoded}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expiresIn}`,
      `X-Amz-SignedHeaders=host`,
    ].sort().join("&");

    const canonicalUri = `/${key}`;
    const canonicalHeaders = `host:${new URL(r2Endpoint).host}\n`;
    const signedHeaders = "host";

    const canonicalRequest = [
      "PUT",
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      "UNSIGNED-PAYLOAD",
    ].join("\n");

    // String to sign
    const algorithm = "AWS4-HMAC-SHA256";
    const stringToSign = [
      algorithm,
      amzDate,
      `${dateStamp}/${region}/${service}/aws4_request`,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    // Calculate signature
    const kSecret = Buffer.from(`AWS4${r2SecretAccessKey}`);
    const kDate = crypto.createHmac("sha256", kSecret).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    // Build presigned URL
    const presignedUrl = `${r2Endpoint}/${r2Bucket}/${key}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

    // Upload file using presigned URL
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const response = await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("R2 upload failed:", response.status, errorText);
      throw new Error(`Upload failed: ${response.status}`);
    }

    return NextResponse.json({
      key,
      publicUrl: `/api/files/${key}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
