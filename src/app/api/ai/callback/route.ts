import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiGenerationTasks, products, productGeneratedImages, userProfiles, creditTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { broadcastStatusUpdate } from "@/lib/sse";

// POST /api/ai/callback - AI service calls this when generation completes
export async function POST(request: NextRequest) {
  try {
    // In production, verify the request comes from your AI service
    // This could be done via API key header, JWT, or IP allowlist
    const apiKey = request.headers.get("x-api-key");
    // TODO: Add proper API key validation in production
    // if (apiKey !== process.env.AI_SERVICE_API_KEY) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const body = await request.json();
    const { taskId, status, results, errorMessage } = body;

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

    // Get product and user info
    const product = await db.query.products.findFirst({
      where: eq(products.id, task.productId),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const user = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, product.userId),
    });

    const now = new Date();

    // Process the callback based on status
    if (status === "completed" && results && Array.isArray(results)) {
      // Save generated images
      await db.transaction(async (tx) => {
        // Update task status
        await tx
          .update(aiGenerationTasks)
          .set({
            status: "completed",
            resultCount: results.length,
            completedAt: now,
          })
          .where(eq(aiGenerationTasks.id, taskId));

        // Insert generated images
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          await tx.insert(productGeneratedImages).values({
            id: nanoid(),
            productId: task.productId,
            url: result.url,
            thumbnailUrl: result.thumbnailUrl || result.url,
            batchNumber: task.batchNumber,
            reviewStatus: "pending",
            sortOrder: i,
            createdAt: now,
          });
        }

        // Update product status to reviewing
        await tx
          .update(products)
          .set({
            status: "reviewing",
            updatedAt: now,
          })
          .where(eq(products.id, task.productId));
      });

      // Broadcast status update to connected clients
      broadcastStatusUpdate(task.productId, "reviewing");

      return NextResponse.json({ success: true, message: `${results.length} images saved` });
    } else if (status === "failed") {
      // Handle failure
      await db.transaction(async (tx) => {
        // Update task status
        await tx
          .update(aiGenerationTasks)
          .set({
            status: "failed",
            errorMessage: errorMessage || "Generation failed",
            completedAt: now,
          })
          .where(eq(aiGenerationTasks.id, taskId));

        // Update product status
        await tx
          .update(products)
          .set({
            status: "failed",
            updatedAt: now,
          })
          .where(eq(products.id, task.productId));

        // Unfreeze credit and refund
        if (user) {
          await tx
            .update(userProfiles)
            .set({
              creditsFrozen: user.creditsFrozen - 1,
            })
            .where(eq(userProfiles.id, user.id));

          // Record refund transaction
          await tx.insert(creditTransactions).values({
            id: nanoid(),
            userId: user.id,
            type: "refund",
            amount: 1,
            balanceAfter: user.creditsBalance + 1,
            productId: task.productId,
            description: `AI 生成失败退款: ${product.name}`,
            createdAt: now,
          });
        }
      });

      // Broadcast status update to connected clients
      broadcastStatusUpdate(task.productId, "failed");

      return NextResponse.json({ success: true, message: "Task marked as failed" });
    } else if (status === "processing") {
      // Update task to processing
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

      return NextResponse.json({ success: true, message: "Task processing started" });
    } else if (status === "queued") {
      // Update task to queued
      await db
        .update(aiGenerationTasks)
        .set({
          status: "queued",
        })
        .where(eq(aiGenerationTasks.id, taskId));

      // Update product status
      await db
        .update(products)
        .set({
          status: "queued",
          updatedAt: now,
        })
        .where(eq(products.id, task.productId));

      // Broadcast status update to connected clients
      broadcastStatusUpdate(task.productId, "queued");

      return NextResponse.json({ success: true, message: "Task queued" });
    }

    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  } catch (error) {
    console.error("AI callback error:", error);
    return NextResponse.json(
      { error: "Failed to process callback" },
      { status: 500 }
    );
  }
}
