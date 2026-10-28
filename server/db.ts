import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Fallback para o banco configurado do projeto caso a variável não tenha sido injetada no Vercel
const DEFAULT_DATABASE_URL =
  'postgresql://neondb_owner:npg_ogF1YLt7xCal@ep-bitter-sky-b6s0cry8-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Database operations will fail.');
}

export const sql = neon(connectionString);

/**
 * Execute a query with RLS or Bypass in a single transactional round-trip.
 * Ensures maximum fluidity and sub-millisecond query execution on Neon.
 */
export async function runQuery<T = any>(query: any, userUid?: string): Promise<T[]> {
  const statements = [
    userUid
      ? sql`SET LOCAL my.auth.uid = ${userUid}`
      : sql`SET LOCAL app.bypass_rls = 'on'`,
    query,
  ];
  const results = await sql.transaction(statements);
  return (results[1] || []) as T[];
}

/**
 * Execute multiple statements in one single round-trip transaction.
 */
export async function runTransaction(statements: any[], userUid?: string): Promise<any[]> {
  const setup = userUid
    ? sql`SET LOCAL my.auth.uid = ${userUid}`
    : sql`SET LOCAL app.bypass_rls = 'on'`;

  const results = await sql.transaction([setup, ...statements]);
  // Return results excluding the setup statement
  return results.slice(1);
}
