import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productSourceImages } from "@/lib/db/schema";
import { nanoid } from "nanoid";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, url, fileName, fileSize, mimeType, sortOrder } = body;

    if (!productId || !url || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const image = await db.insert(productSourceImages).values({
      id: nanoid(),
      productId,
      url,
      fileName,
      fileSize: fileSize || null,
      mimeType: mimeType || null,
      sortOrder: sortOrder || 0,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, image });
  } catch (error) {
    console.error("Save image error:", error);
    return NextResponse.json(
      { error: "Failed to save image" },
      { status: 500 }
    );
  }
}
