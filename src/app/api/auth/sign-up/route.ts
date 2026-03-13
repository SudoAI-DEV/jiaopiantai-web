import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phoneNumber, password, name, shopName, phone, category } = body;

    let user;

    if (phoneNumber) {
      // Phone number sign up
      // First check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.phone, phoneNumber),
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "该手机号已注册" },
          { status: 400 }
        );
      }

      // Create user with Better Auth phone sign up
      user = await auth.api.signUpPhone({
        body: {
          phoneNumber,
          password,
          name: name || phoneNumber,
        },
      });
    } else if (email) {
      // Email sign up (fallback)
      user = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name || email.split("@")[0],
        },
      });
    } else {
      return NextResponse.json(
        { error: "请提供手机号或邮箱" },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "注册失败" },
        { status: 400 }
      );
    }

    // Create user profile with default customer role
    await db.insert(userProfiles).values({
      id: user.user.id,
      userId: user.user.id,
      role: "customer",
      shopName: shopName || null,
      phone: phoneNumber || phone || null,
      category: category || null,
      creditsBalance: 0,
      creditsFrozen: 0,
      creditsTotalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ user: user.user });
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "注册失败" },
      { status: 500 }
    );
  }
}
