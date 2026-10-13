import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Conexão oficial de fallback com o banco Neon Serverless Postgres (TKE SISTEMA REPARO)
const OFFICIAL_NEON_URL =
  'postgresql://neondb_owner:npg_v0ru3OWJPNIt@ep-wandering-mouse-b6clcxjt.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const rawConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  OFFICIAL_NEON_URL;

function createDatabaseInstance() {
  const isNeonHttp =
    rawConnectionString.includes('.neon.tech') &&
    !process.env.FORCE_POSTGRES_TCP;

  if (isNeonHttp) {
    // Driver Serverless HTTP exclusivo da Neon
    const normalizedConnectionString = rawConnectionString.includes('-pooler.')
      ? rawConnectionString.replace('-pooler.', '.')
      : rawConnectionString;
    const sql = neon(normalizedConnectionString);
    return drizzleNeon(sql, { schema });
  }

  // Driver universal PostgreSQL TCP (Railway, Supabase, Docker, Localhost)
  const isLocalhost =
    rawConnectionString.includes('localhost') ||
    rawConnectionString.includes('127.0.0.1');

  const client = postgres(rawConnectionString, {
    prepare: false,
    ssl: isLocalhost ? false : 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  return drizzlePostgres(client, { schema });
}

export const db = createDatabaseInstance() as unknown as ReturnType<typeof drizzleNeon<typeof schema>>;
export type Database = typeof db;

