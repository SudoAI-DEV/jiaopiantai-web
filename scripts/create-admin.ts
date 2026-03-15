/**
 * Create an admin account in the local database.
 *
 * Usage: npx tsx scripts/create-admin.ts
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
  const phone = "17682345614";
  const name = "Admin";
  const email = `${phone}@phone.local`;
  const password = "admin123456";

  const { hashPassword } = await import("better-auth/crypto");
  const hashedPassword = await hashPassword(password);

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

  await db.insert(schema.accounts).values({
    id: nanoid(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.userProfiles).values({
    id: userId,
    userId,
    role: "admin",
    shopName: null,
    phone,
    category: null,
    creditsBalance: 0,
    creditsFrozen: 0,
    creditsTotalSpent: 0,
    createdAt: now,
    updatedAt: now,
  });

  console.log("✅ Admin created successfully!");
  console.log(`  User ID:  ${userId}`);
  console.log(`  Name:     ${name}`);
  console.log(`  Phone:    ${phone}`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Role:     admin`);

  await sql.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
