import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema-pg';

// Use a build-time safe approach
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/dev';

// At build time, this will be evaluated but not actually connected to
const sql = postgres(DATABASE_URL);
export const db = drizzle(sql, { schema });

export type Database = typeof db;
