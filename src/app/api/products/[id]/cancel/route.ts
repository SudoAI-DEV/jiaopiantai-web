import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  cancelPendingProductTask,
  TaskLifecycleError,
} from "@/lib/ai-task-lifecycle";
import { broadcastStatusUpdate } from "@/lib/sse";

export async function POST(
  _request: NextRequest,
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
    await cancelPendingProductTask({
      productId: id,
      userId: session.user.id,
    });

    broadcastStatusUpdate(id, "cancelled");

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof TaskLifecycleError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Cancel product task error:", error);
    return NextResponse.json(
      { error: "Failed to cancel product task" },
      { status: 500 }
    );
  }
}
