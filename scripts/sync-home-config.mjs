import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function main() {
  const configPath = path.join(process.cwd(), 'src', 'data', 'homeConfig.json');
  const homeConfigData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // 1. Atualiza Railway
  try {
    const sqlRailway = postgres(process.env.DATABASE_URL, { prepare: false });
    await sqlRailway`
      UPDATE home_configs
      SET config = ${sqlRailway.json(homeConfigData)},
          updated_by = 'Thiago Gregorio (DEV)',
          updated_at = NOW()
      WHERE id = 'default_home_config'
    `;
    console.log('✅ Railway DB atualizado com sucesso!');
    await sqlRailway.end();
  } catch (err) {
    console.error('❌ Erro no Railway DB:', err.message);
  }

  // 2. Atualiza Neon (se quota permitir)
  const neonUrl = 'postgresql://neondb_owner:npg_v0ru3OWJPNIt@ep-wandering-mouse-b6clcxjt.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require';
  try {
    const sqlNeon = postgres(neonUrl, { prepare: false });
    await sqlNeon`
      UPDATE home_configs
      SET config = ${sqlNeon.json(homeConfigData)},
          updated_by = 'Thiago Gregorio (DEV)',
          updated_at = NOW()
      WHERE id = 'default_home_config'
    `;
    console.log('✅ Neon DB também atualizado com sucesso!');
    await sqlNeon.end();
  } catch (err) {
    console.log('⚠️ Neon DB ignorado (limite de quota atingido ou offline):', err.message);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
