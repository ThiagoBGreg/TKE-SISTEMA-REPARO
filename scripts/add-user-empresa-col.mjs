import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('Adicionando coluna empresa na tabela users...');
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS empresa VARCHAR(255);
  `;
  console.log('Coluna empresa adicionada com sucesso!');
}

main().catch((err) => {
  console.error('Erro ao adicionar coluna empresa:', err);
  process.exit(1);
});
