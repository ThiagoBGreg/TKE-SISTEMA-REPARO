import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('Conectando ao Neon Postgres e criando tabela apr_configs...');
  await sql`
    CREATE TABLE IF NOT EXISTS apr_configs (
      id VARCHAR(50) PRIMARY KEY DEFAULT 'default_apr_config',
      titulo VARCHAR(255) NOT NULL DEFAULT 'APR Corporativa - TKE Reparos',
      revisao VARCHAR(50) NOT NULL DEFAULT 'REV-2026.1',
      instrucoes_gerais TEXT,
      regras_de_ouro JSONB,
      categorias_risco JSONB NOT NULL,
      epis_disponiveis JSONB NOT NULL,
      atualizado_por_nome VARCHAR(255),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;
  console.log('Tabela apr_configs criada ou já existente com sucesso!');
}

main().catch((err) => {
  console.error('Erro ao criar tabela:', err);
  process.exit(1);
});
