import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Conexão oficial com o banco Neon Serverless Postgres (TKE SISTEMA REPARO)
const OFFICIAL_NEON_URL =
  'postgresql://neondb_owner:npg_v0ru3OWJPNIt@ep-wandering-mouse-b6clcxjt.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const rawConnectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  OFFICIAL_NEON_URL;

// Para o driver HTTP da Neon, se a URL contiver -pooler, normaliza para o endpoint direto HTTP
const normalizedConnectionString = rawConnectionString.includes('-pooler.')
  ? rawConnectionString.replace('-pooler.', '.')
  : rawConnectionString;

const sql = neon(normalizedConnectionString);

export const db = drizzle(sql, { schema });
export type Database = typeof db;
