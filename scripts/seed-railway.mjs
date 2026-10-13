import postgres from 'postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL;
console.log('Conectando ao banco Railway:', dbUrl?.slice(0, 30) + '...');

const sql = postgres(dbUrl, { prepare: false });

async function main() {
  await sql`
    INSERT INTO users (id, nome, email, senha_hash, departamento, cargo, status, is_admin)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Thiago Gregorio',
      'thiago.gregorio@tkelevator.com',
      'ManuLinda',
      'ADMINISTRATIVO',
      'DEV',
      'ATIVO',
      true
    )
    ON CONFLICT (email) DO UPDATE SET
      senha_hash = 'ManuLinda',
      cargo = 'DEV',
      status = 'ATIVO',
      is_admin = true;
  `;
  console.log('✅ Usuário Administrador (Thiago Gregorio) semeado com sucesso!');

  // Inicializa também apr_configs padrão se não existir
  await sql`
    INSERT INTO apr_configs (
      id,
      titulo,
      revisao,
      instrucoes_gerais,
      categorias_risco,
      epis_disponiveis,
      atualizado_por_nome
    )
    VALUES (
      'default_apr_config',
      'APR Corporativa - TKE Reparos',
      'REV-2026.1',
      'Instruções preliminares de segurança para reparo de elevadores.',
      '[]'::jsonb,
      '[]'::jsonb,
      'Thiago Gregorio (DEV)'
    )
    ON CONFLICT (id) DO NOTHING;
  `;
  console.log('✅ Configuração padrão de APR semeada com sucesso!');

  // Inicializa home_configs padrão se não existir
  await sql`
    INSERT INTO home_configs (
      id,
      config,
      updated_by
    )
    VALUES (
      'default_home_config',
      '{}'::jsonb,
      'Thiago Gregorio (DEV)'
    )
    ON CONFLICT (id) DO NOTHING;
  `;
  console.log('✅ Configuração padrão da Home semeada com sucesso!');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});
