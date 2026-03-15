import { PutObjectCommand } from "@aws-sdk/client-s3";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  buildCustomerModelFileKey,
  getStoredFileUrl,
} from "@/lib/customer-models";
import { db } from "@/lib/db";
import { customerModels } from "@/lib/db/schema";
import { getS3Client } from "@/lib/r2";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const models = await db
      .select()
      .from(customerModels)
      .where(eq(customerModels.userId, session.user.id))
      .orderBy(desc(customerModels.createdAt));

    return NextResponse.json({ models });
  } catch (error) {
    console.error("List models error:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const rawName = formData.get("name");
    const rawDescription = formData.get("description");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing model image" }, { status: 400 });
    }

    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Missing model name" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Empty model image" }, { status: 400 });
    }

    if (file.type && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Model file must be an image" },
        { status: 400 }
      );
    }

    const modelId = nanoid();
    const key = buildCustomerModelFileKey({
      userId: session.user.id,
      modelId,
      fileName: file.name,
    });
    const buffer = Buffer.from(await file.arrayBuffer());

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: (process.env.R2_BUCKET_NAME || "jiaopiantai").trim(),
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    const now = new Date();
    const model = {
      id: modelId,
      userId: session.user.id,
      name,
      description:
        typeof rawDescription === "string" && rawDescription.trim().length > 0
          ? rawDescription.trim()
          : null,
      imageUrl: getStoredFileUrl(key),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(customerModels).values(model);

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error("Create model error:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}
