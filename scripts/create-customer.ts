/**
 * Create a customer account in the local database.
 *
 * Usage: npx tsx scripts/create-customer.ts
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { nanoid } from "nanoid";
import * as schema from "../src/lib/db/schema-pg";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Error: DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  const now = new Date();
  const userId = nanoid();
  const phone = "13800000001";
  const name = "花姐&寅寅";
  const shopName = "花姐&寅寅服饰";
  const email = `${phone}@phone.local`;

  // Create user
  await db.insert(schema.users).values({
    id: userId,
    name,
    email,
    phone,
    emailVerified: false,
    phoneVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  // Create account (password-based via Better Auth's scrypt format)
  const { hashPassword } = await import("better-auth/crypto");
  const hashedPassword = await hashPassword("huajie2026");

  await db.insert(schema.accounts).values({
    id: nanoid(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  // Create user profile
  await db.insert(schema.userProfiles).values({
    id: userId,
    userId,
    role: "customer",
    shopName,
    phone,
    category: "服装",
    creditsBalance: 100,
    creditsFrozen: 0,
    creditsTotalSpent: 0,
    createdAt: now,
    updatedAt: now,
  });

  console.log("✅ Customer created successfully!");
  console.log(`  User ID:  ${userId}`);
  console.log(`  Name:     ${name}`);
  console.log(`  Phone:    ${phone}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: huajie2026`);
  console.log(`  Shop:     ${shopName}`);

  await sql.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
