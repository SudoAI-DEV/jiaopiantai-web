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

    // Get R2 configuration
    const r2Endpoint = process.env.R2_ENDPOINT;
    const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2Bucket = process.env.R2_BUCKET_NAME;

    console.log("R2 config check:", {
      endpoint: r2Endpoint ? "set" : "missing",
      accessKey: r2AccessKeyId ? "set" : "missing",
      secretKey: r2SecretAccessKey ? "set" : "missing",
      bucket: r2Bucket ? "set" : "missing"
    });

    if (!r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey || !r2Bucket) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
    }

    // AWS Signature V4
    const region = "auto";
    const service = "s3";
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);
    const expires = 3600;

    const credential = `${r2AccessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;
    
    const canonicalQuerystring = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${encodeURIComponent(credential)}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expires}`,
      `X-Amz-SignedHeaders=host`,
    ].sort().join("&");

    const host = new URL(r2Endpoint).host;
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = "host";
    const payloadHash = "UNSIGNED-PAYLOAD";

    const canonicalRequest = [
      "PUT",
      `/${key}`,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const canonicalRequestHash = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
    const stringToSign = [
      algorithm,
      amzDate,
      `${dateStamp}/${region}/${service}/aws4_request`,
      canonicalRequestHash,
    ].join("\n");

    const kSecret = Buffer.from(`AWS4${r2SecretAccessKey}`);
    const kDate = crypto.createHmac("sha256", kSecret).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    const uploadUrl = `${r2Endpoint}/${r2Bucket}/${key}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const response = await fetch(uploadUrl, {
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
        { error: `Upload failed: ${response.status}` },
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
