import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function main() {
  const rows = await sql`SELECT id, nome, email, cargo, empresa, documento, senha_hash FROM users ORDER BY nome ASC`;
  console.log('Total de usuarios existentes no banco Railway:', rows.length);
  rows.forEach(r => {
    console.log(`${r.nome} | email: ${r.email} | cargo: ${r.cargo} | empresa: ${r.empresa} | doc: ${r.documento} | senha: ${r.senha_hash}`);
  });
  await sql.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
