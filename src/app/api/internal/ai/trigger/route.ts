import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiGenerationTasks, products, productSourceImages, productGeneratedImages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { broadcastStatusUpdate } from "@/lib/sse";

// POST /api/internal/ai/trigger - Internal API to trigger AI generation
// In production, this would call your actual AI service
export async function POST(request: NextRequest) {
  try {
    // Verify internal request (in production, use proper auth)
    const internalKey = request.headers.get("x-internal-key");
    // TODO: Add proper internal key validation
    // if (internalKey !== process.env.INTERNAL_API_KEY) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    // Get the task
    const task = await db.query.aiGenerationTasks.findFirst({
      where: eq(aiGenerationTasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status !== "pending") {
      return NextResponse.json({ error: "Task already processing" }, { status: 400 });
    }

    // Get product details
    const product = await db.query.products.findFirst({
      where: eq(products.id, task.productId),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get source images
    const sourceImages = await db.query.productSourceImages.findMany({
      where: eq(productSourceImages.productId, task.productId),
    });

    // Update task status to processing
    const now = new Date();
    await db
      .update(aiGenerationTasks)
      .set({
        status: "processing",
        startedAt: now,
      })
      .where(eq(aiGenerationTasks.id, taskId));

    // Update product status
    await db
      .update(products)
      .set({
        status: "processing",
        updatedAt: now,
      })
      .where(eq(products.id, task.productId));

    // Broadcast status update to connected clients
    broadcastStatusUpdate(task.productId, "processing");

    // TODO: In production, call your AI service here
    // const aiServiceResponse = await fetch(process.env.AI_SERVICE_URL, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.AI_SERVICE_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     taskId: task.id,
    //     productName: product.name,
    //     category: product.category,
    //     shootingRequirements: product.shootingRequirements,
    //     stylePreference: product.stylePreference,
    //     specialNotes: product.specialNotes,
    //     sourceImages: sourceImages.map(img => img.url),
    //     targetCount: task.targetCount || 6 || 6,
    //   }),
    // });

    // For demo/testing: simulate AI generation with mock images
    // Remove this in production
    setTimeout(async () => {
      try {
        const mockResults: { url: string; thumbnailUrl: string }[] = [];
        const imageCount = Math.min(task.targetCount || 6 || 6, 20);

        for (let i = 0; i < imageCount; i++) {
          // Generate mock URLs - in production these would be real AI-generated images
          mockResults.push({
            url: `https://picsum.photos/seed/${task.productId}-${i}/800/1200`,
            thumbnailUrl: `https://picsum.photos/seed/${task.productId}-${i}/400/600`,
          });
        }

        // Call the callback to save results
        await fetch(new URL("/api/ai/callback", request.url).toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // In production, add proper auth header
            // "x-api-key": process.env.AI_SERVICE_API_KEY || "",
          },
          body: JSON.stringify({
            taskId: task.id,
            status: "completed",
            results: mockResults,
          }),
        });
      } catch (error) {
        console.error("Demo AI generation error:", error);
      }
    }, 5000); // Simulate 5 second processing time

    return NextResponse.json({
      success: true,
      message: "AI generation triggered",
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
