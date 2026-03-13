import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, userProfiles, creditTransactions, aiGenerationTasks, productSourceImages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { broadcastStatusUpdate } from "@/lib/sse";

export async function POST(
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

    // Get product
    const product = await db.query.products.findFirst({
      where: and(eq(products.id, id), eq(products.userId, session.user.id)),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.status !== "draft") {
      return NextResponse.json(
        { error: "Product already submitted" },
        { status: 400 }
      );
    }

    // Get user profile
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, session.user.id),
    });

    if (!profile || profile.creditsBalance < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 400 }
      );
    }

    // Get source images for the product
    const sourceImages = await db.query.productSourceImages.findMany({
      where: eq(productSourceImages.productId, id),
    });

    if (sourceImages.length === 0) {
      return NextResponse.json(
        { error: "Please upload at least one product image" },
        { status: 400 }
      );
    }

    // Freeze 1 credit and create AI task
    await db.transaction(async (tx) => {
      // Update user credits (freeze)
      await tx
        .update(userProfiles)
        .set({
          creditsBalance: profile.creditsBalance - 1,
          creditsFrozen: profile.creditsFrozen + 1,
        })
        .where(eq(userProfiles.id, session.user.id));

      // Record transaction
      await tx.insert(creditTransactions).values({
        id: nanoid(),
        userId: session.user.id,
        type: "submission",
        amount: -1,
        balanceAfter: profile.creditsBalance - 1,
        productId: id,
        description: `提交产品: ${product.name}`,
        createdAt: new Date(),
      });

      // Create AI generation task
      const taskId = nanoid();
      await tx.insert(aiGenerationTasks).values({
        id: taskId,
        productId: id,
        batchNumber: 1,
        status: "pending",
        targetCount: 20,
        createdAt: new Date(),
      });

      // Update product status
      await tx
        .update(products)
        .set({
          status: "submitted",
          updatedAt: new Date(),
        })
        .where(eq(products.id, id));
    });

    // Broadcast status update to connected clients
    broadcastStatusUpdate(id, "submitted");

    // TODO: Call AI service here to queue the task
    // For now, we simulate task processing by updating status after a delay
    // In production, this would be handled by a separate worker

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit product error:", error);
    return NextResponse.json(
      { error: "Failed to submit product" },
      { status: 500 }
    );
  }
}
