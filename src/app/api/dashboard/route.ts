import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, products, creditTransactions } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await import("next/headers").then((h) => h.headers()),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, session.user.id),
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get product stats
    const productStats = await db
      .select({
        status: products.status,
        count: sql<number>`count(*)`,
      })
      .from(products)
      .where(eq(products.userId, session.user.id))
      .groupBy(products.status);

    // Get recent products
    const recentProducts = await db
      .select({
        id: products.id,
        productNumber: products.productNumber,
        name: products.name,
        status: products.status,
        deliveryCount: products.deliveryCount,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(eq(products.userId, session.user.id))
      .orderBy(desc(products.createdAt))
      .limit(5);

    // Get recent transactions
    const recentTransactions = await db
      .select({
        id: creditTransactions.id,
        type: creditTransactions.type,
        amount: creditTransactions.amount,
        balanceAfter: creditTransactions.balanceAfter,
        description: creditTransactions.description,
        createdAt: creditTransactions.createdAt,
      })
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, session.user.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(5);

    return NextResponse.json({
      profile: {
        shopName: profile.shopName,
        creditsBalance: profile.creditsBalance,
        creditsFrozen: profile.creditsFrozen,
        creditsTotalSpent: profile.creditsTotalSpent,
      },
      productStats,
      recentProducts,
      recentTransactions,
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
