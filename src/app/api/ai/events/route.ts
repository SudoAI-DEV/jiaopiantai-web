import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGenerationTasks, products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { addConnection, removeConnection, broadcastStatusUpdate } from "@/lib/sse";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return new Response("Product ID required", { status: 400 });
    }

    // Verify product belongs to user
    const product = await db.query.products.findFirst({
      where: and(eq(products.id, productId), eq(products.userId, session.user.id)),
    });

    if (!product) {
      return new Response("Product not found", { status: 404 });
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Add this connection to the product's broadcast group
        addConnection(productId, controller);

        // Send initial connection message
        const connectEvent = {
          type: "connected",
          productId,
          status: product.status,
        };
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(connectEvent)}\n\n`)
        );

        // Send current product status immediately
        const statusEvent = {
          type: "status_update",
          productId,
          status: product.status,
        };
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(statusEvent)}\n\n`)
        );
      },
      cancel(controller) {
        // Remove connection when client disconnects
        removeConnection(productId, controller);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("SSE connection error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
