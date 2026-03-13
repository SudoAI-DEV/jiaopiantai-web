import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // In production, this should be protected by admin authentication
    // For now, we'll use a simple secret check
    const secret = request.headers.get("x-admin-secret");
    if (secret !== process.env.ADMIN_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { email, password, name, phone } = body;

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(require("drizzle-orm").sql`LOWER(${require("@/lib/db/schema").users.email})`, email.toLowerCase()),
    });

    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Create admin user
    const user = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: name || "Admin",
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create admin user" },
        { status: 400 }
      );
    }

    // Create admin profile
    await db.insert(userProfiles).values({
      id: user.user.id,
      userId: user.user.id,
      role: "admin",
      shopName: null,
      phone: phone || null,
      category: null,
      creditsBalance: 0,
      creditsFrozen: 0,
      creditsTotalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      user: { id: user.user.id, email: user.user.email, role: "admin" }
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    );
  }
}
