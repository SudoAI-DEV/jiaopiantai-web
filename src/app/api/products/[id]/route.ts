import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, productSourceImages, productGeneratedImages, userProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const product = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.userId, session.user.id)),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get source images
    const sourceImages = await db
      .select()
      .from(productSourceImages)
      .where(eq(productSourceImages.productId, id))
      .orderBy(productSourceImages.sortOrder);

    // Get generated images
    const generatedImages = await db
      .select()
      .from(productGeneratedImages)
      .where(eq(productGeneratedImages.productId, id))
      .orderBy(productGeneratedImages.sortOrder);

    // Get user profile for credits
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, session.user.id),
    });

    return NextResponse.json({
      product,
      sourceImages,
      generatedImages,
      credits: profile?.creditsBalance || 0,
    });
  } catch (error) {
    console.error("Product detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
