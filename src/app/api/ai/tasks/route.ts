import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGenerationTasks, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/ai/tasks - Get AI task status for a product
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    // Verify product belongs to user
    const product = await db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.userId, session.user.id)),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get latest AI task for the product
    const task = await db.query.aiGenerationTasks.findFirst({
      where: eq(aiGenerationTasks.productId, productId),
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
    });

    if (!task) {
      return NextResponse.json({ error: "No AI task found" }, { status: 404 });
    }

    return NextResponse.json({
      id: task.id,
      productId: task.productId,
      status: task.status,
      targetCount: task.targetCount,
      resultCount: task.resultCount,
      errorMessage: task.errorMessage,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
    });
  } catch (error) {
    console.error("Get AI task error:", error);
    return NextResponse.json(
      { error: "Failed to get AI task status" },
      { status: 500 }
    );
  }
}
