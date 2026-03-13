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
    const r2Endpoint = process.env.R2_ENDPOINT!;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID!;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
    const r2Bucket = process.env.R2_BUCKET_NAME!;

    // Generate presigned URL using AWS Signature V4
    const service = "s3";
    const region = "auto";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);
    const expires = 3600;

    // Credential (NOT URL encoded)
    const credential = `${r2AccessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;

    // Build query string for canonical request (raw, not encoded)
    const queryParams = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${credential}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expires}`,
      `X-Amz-SignedHeaders=host`,
    ].sort().join("&");

    // Canonical request (use raw query string)
    const host = new URL(r2Endpoint).host;
    const canonicalUri = `/${r2Bucket}/${key}`;
    const canonicalRequest = [
      "PUT",
      canonicalUri,
      queryParams,
      `host:${host}`,
      "host",
      "UNSIGNED-PAYLOAD"
    ].join("\n");

    // String to sign
    const algorithm = "AWS4-HMAC-SHA256";
    const stringToSign = [
      algorithm,
      amzDate,
      `${dateStamp}/${region}/${service}/aws4_request`,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex")
    ].join("\n");

    // Calculate signature
    const kSecret = Buffer.from(`AWS4${r2SecretAccessKey}`);
    const kDate = crypto.createHmac("sha256", kSecret).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    // Build presigned URL (encode the query string for actual URL)
    const urlEncodedCredential = encodeURIComponent(credential);
    const finalQueryParams = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${urlEncodedCredential}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expires}`,
      `X-Amz-SignedHeaders=host`,
    ].sort().join("&");

    const presignedUrl = `${r2Endpoint}/${r2Bucket}/${key}?${finalQueryParams}&X-Amz-Signature=${signature}`;

    // Upload file
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
      return NextResponse.json(
        { error: `Upload failed: ${response.status}`, details: errorText },
        { status: 500 }
      );
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
