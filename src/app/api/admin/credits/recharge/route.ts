import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { userProfiles, creditTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // Check admin role
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, session.user.id),
    });

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount, description } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: "无效的参数" }, { status: 400 });
    }

    // Get current user profile
    const targetUser = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, userId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const newBalance = targetUser.creditsBalance + amount;

    // Update balance
    await db
      .update(userProfiles)
      .set({ creditsBalance: newBalance })
      .where(eq(userProfiles.id, userId));

    // Create transaction record
    await db.insert(creditTransactions).values({
      id: nanoid(),
      userId,
      type: "recharge",
      amount,
      balanceAfter: newBalance,
      description: description || `管理员充值 ${amount} 点数`,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      newBalance,
    });
  } catch (error) {
    console.error("Recharge error:", error);
    return NextResponse.json({ error: "充值失败" }, { status: 500 });
  }
}
