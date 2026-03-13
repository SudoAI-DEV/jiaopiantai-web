import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateFileKey } from "@/lib/oss";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileName, fileType, type = "source", productId } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing fileName or fileType" },
        { status: 400 }
      );
    }

    const key = generateFileKey(type, session.user.id, productId || "temp", fileName);

    // Generate presigned URL using our internal function
    const { generateUploadUrl } = await import("@/lib/oss");
    const { uploadUrl } = await generateUploadUrl(key);

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl: `/api/files/${key}`,
    });
  } catch (error) {
    console.error("Generate presigned URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
