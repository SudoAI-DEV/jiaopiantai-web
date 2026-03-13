import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let s3Client: S3Client | null = null;

/**
 * Get R2/S3 client instance
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT || "https://88a96747babe00a5c70ab1954e53e136.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return s3Client;
}

/**
 * Generate presigned URL for upload
 */
export async function generateUploadUrl(
  key: string,
  expires: number = 3600
): Promise<{ uploadUrl: string; key: string }> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET_NAME || "jiaopiantai";

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  // Use the signed URL directly from AWS SDK (subdomain style for R2)
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expires });

  return {
    uploadUrl,
    key,
  };
}

/**
 * Generate presigned URL for download/viewing
 */
export async function generateDownloadUrl(
  key: string,
  expires: number = 3600 * 24 * 7 // 7 days by default
): Promise<string> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET_NAME || "jiaopiantai";

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expires });
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  const bucket = process.env.R2_BUCKET_NAME || "jiaopiantai";

  await client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}

/**
 * Check if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const client = getS3Client();
    const bucket = process.env.R2_BUCKET_NAME || "jiaopiantai";

    await client.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get public URL for a file
 * Uses internal API route that generates signed URLs
 */
export function getPublicUrl(key: string): string {
  return `/api/files/${key}`;
}

/**
 * Generate unique file key with hash
 * Format: {type}/{userId}/{productId}/{originalName}-{timestamp}-{hash}.{ext}
 */
export function generateFileKey(
  type: "source" | "generated",
  userId: string,
  productId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const ext = fileName.split(".").pop() || "jpg";
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  // Simple hash based on timestamp and random
  const hash = Math.random().toString(36).substring(2, 10);
  return `${type}/${userId}/${productId}/${nameWithoutExt}-${timestamp}-${hash}.${ext}`;
}

// Keep old functions for backward compatibility
export const getOssClient = getS3Client;
