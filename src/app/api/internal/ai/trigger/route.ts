import { NextRequest, NextResponse } from "next/server";

// Deprecated: worker queue owns AI execution now.
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error:
        "Deprecated endpoint. AI generation is now driven by the worker task queue.",
      path: request.nextUrl.pathname,
    },
    { status: 410 }
  );
}
