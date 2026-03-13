import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, creditTransactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, session.user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const transactions = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, session.user.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(50);

    return NextResponse.json({
      credits: {
        balance: profile.creditsBalance,
        frozen: profile.creditsFrozen,
        totalSpent: profile.creditsTotalSpent,
      },
      transactions,
    });
  } catch (error) {
    console.error("Credits error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    );
  }
}
