import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, shopName, phone, category } = body;

    // Create user with Better Auth
    const user = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || email.split("@")[0],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 400 }
      );
    }

    // Create user profile with default customer role
    await db.insert(userProfiles).values({
      id: user.user.id,
      role: "customer",
      shopName: shopName || null,
      phone: phone || null,
      category: category || null,
      creditsBalance: 0,
      creditsFrozen: 0,
      creditsTotalSpent: 0,
    });

    return NextResponse.json({ user: user.user });
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "Failed to sign up" },
      { status: 500 }
    );
  }
}
