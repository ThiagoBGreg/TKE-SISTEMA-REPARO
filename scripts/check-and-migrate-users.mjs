import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:UvqClmUwJuuDiKqUCNjKZPesRJNBgbqn@crossover.proxy.rlwy.net:45329/railway';

console.log('Conectando a:', connectionString.replace(/:[^:]*@/, ':***@'));

const sql = postgres(connectionString, { ssl: 'prefer' });

async function main() {
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position;
  `;
  console.log('Colunas de users:', cols.map(c => c.column_name));

  console.log('Adicionando coluna pode_visualizar_todas_pt_apr se não existir...');
  await sql`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS pode_visualizar_todas_pt_apr BOOLEAN NOT NULL DEFAULT FALSE;
  `;
  console.log('Sucesso! Coluna adicionada/garantida!');

  const check = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'pode_visualizar_todas_pt_apr';
  `;
  console.log('Verificação:', check);

  // Verifica contagem de usuários
  const userCount = await sql`SELECT count(*) FROM users`;
  console.log('Total de usuários:', userCount[0].count);

  await sql.end();
}

main().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
