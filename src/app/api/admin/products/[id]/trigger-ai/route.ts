import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { aiGenerationTasks, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

// POST /api/admin/products/[id]/trigger-ai - Trigger AI generation for a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { db } = await import("@/lib/db");
    const { userProfiles } = await import("@/lib/db/schema");
    const { eq: eq2 } = await import("drizzle-orm");

    const profile = await db.query.userProfiles.findFirst({
      where: eq2(userProfiles.id, session.user.id),
    });

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Get product
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check product status - only allow for submitted products
    if (product.status !== "submitted") {
      return NextResponse.json(
        { error: "Product is not in submitted status" },
        { status: 400 }
      );
    }

    // Get AI task
    const task = await db.query.aiGenerationTasks.findFirst({
      where: eq(aiGenerationTasks.productId, id),
    });

    if (!task) {
      return NextResponse.json({ error: "No AI task found" }, { status: 404 });
    }

    // Call internal trigger API
    const triggerUrl = new URL("/api/internal/ai/trigger", request.url);
    const triggerRes = await fetch(triggerUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": process.env.INTERNAL_API_KEY || "dev-key",
      },
      body: JSON.stringify({ taskId: task.id }),
    });

    const triggerData = await triggerRes.json();

    if (!triggerRes.ok) {
      return NextResponse.json(
        { error: triggerData.error || "Failed to trigger AI" },
        { status: triggerRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "AI generation started",
      taskId: task.id,
    });
  } catch (error) {
    console.error("Trigger AI error:", error);
    return NextResponse.json(
      { error: "Failed to trigger AI generation" },
      { status: 500 }
    );
  }
}
