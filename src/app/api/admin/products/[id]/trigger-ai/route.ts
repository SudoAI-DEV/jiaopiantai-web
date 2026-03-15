import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";

// Deprecated: worker queue owns AI execution now.
export async function POST(
  _request: NextRequest,
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
      where: eq2(userProfiles.userId, session.user.id),
    });

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    return NextResponse.json(
      {
        error:
          "Deprecated endpoint. AI generation now starts from product submission and the worker queue.",
        productId: id,
      },
      { status: 410 }
    );
  } catch (error) {
    console.error("Trigger AI error:", error);
    return NextResponse.json(
      { error: "Failed to trigger AI generation" },
      { status: 500 }
    );
  }
}
