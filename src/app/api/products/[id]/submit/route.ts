import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  submitProductToQueue,
  TaskLifecycleError,
} from "@/lib/ai-task-lifecycle";
import { broadcastStatusUpdate } from "@/lib/sse";

const LEGACY_SUBMIT_KEYS = new Set([
  "generationConfig",
  "productConfigPath",
  "selectedImages",
  "selectedImageNotes",
  "modelImage",
  "customRequirements",
]);

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
    const contentType = request.headers.get("content-type") || "";
    const requestPayload = contentType.includes("application/json")
      ? await request.json().catch(() => null)
      : null;

    if (
      requestPayload &&
      typeof requestPayload === "object" &&
      Object.keys(requestPayload).length > 0
    ) {
      const keys = Object.keys(requestPayload);
      const hasLegacyKey = keys.some((key) => LEGACY_SUBMIT_KEYS.has(key));
      return NextResponse.json(
        {
          error: hasLegacyKey
            ? "旧流程配置已移除，请直接提交产品。"
            : "提交接口不再接受额外参数。",
        },
        { status: 400 }
      );
    }

    const submission = await submitProductToQueue({
      productId: id,
      userId: session.user.id,
    });

    // Broadcast status update to connected clients
    broadcastStatusUpdate(id, "submitted");

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    if (error instanceof TaskLifecycleError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Submit product error:", error);
    return NextResponse.json(
      { error: "Failed to submit product" },
      { status: 500 }
    );
  }
}
