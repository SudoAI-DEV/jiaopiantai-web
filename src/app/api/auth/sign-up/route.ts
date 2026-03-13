import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, password, name, shopName, category } = body;

    // Use phone number as the email identifier (since Better Auth uses email field)
    const email = `${phone}@phone.local`;

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "该手机号已注册" },
        { status: 400 }
      );
    }

    // Create user with Better Auth using phone as email
    const user = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || phone,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "注册失败" },
        { status: 400 }
      );
    }

    // Update user with phone number
    await db.update(users)
      .set({ phone })
      .where(eq(users.id, user.user.id));

    // Create user profile with default customer role
    await db.insert(userProfiles).values({
      id: user.user.id,
      userId: user.user.id,
      role: "customer",
      shopName: shopName || null,
      phone: phone || null,
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
