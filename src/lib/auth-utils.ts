import { db } from "@/lib/db";
import { users, userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type UserRole = "customer" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

/**
 * Get the current user's profile including role
 */
export async function getUserProfile(userId: string) {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: userProfiles.role,
      shopName: userProfiles.shopName,
      phone: userProfiles.phone,
      category: userProfiles.category,
      creditsBalance: userProfiles.creditsBalance,
      creditsFrozen: userProfiles.creditsFrozen,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.id))
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role === "admin";
}

/**
 * Check if user is a customer
 */
export async function isCustomer(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId);
  return profile?.role === "customer";
}

/**
 * Get current session in Server Components and API routes
 */
export async function getSession() {
  const { auth } = await import("@/lib/auth");
  const headers = await import("next/headers").then((m) => m.headers());
  const session = await auth.api.getSession({ headers });
  return session;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Require admin role - throws if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth();
  const admin = await isAdmin(session.user.id);

  if (!admin) {
    throw new Error("Forbidden - Admin access required");
  }

  return session;
}

/**
 * Require customer role
 */
export async function requireCustomer() {
  const session = await requireAuth();
  const customer = await isCustomer(session.user.id);

  if (!customer) {
    throw new Error("Forbidden - Customer access required");
  }

  return session;
}
