import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql');

let db: any;

if (isPostgres) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for PostgreSQL');
  }
  const sql = postgres(process.env.DATABASE_URL);
  db = drizzlePg(sql, { schema });
} else {
  const sqlite = new Database(process.env.DATABASE_URL?.replace('file:', '') || './dev.db');
  db = drizzleSQLite(sqlite, { schema });
}

export { db };
export type Database = typeof db;
