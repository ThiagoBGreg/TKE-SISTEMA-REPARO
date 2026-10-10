import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { homeConfigs } from '@/db/schema';
import { DEFAULT_HOME_CONFIG } from '@/data/defaultHomeConfig';
import { HomeConfig } from '@/types/homeConfig';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'homeConfig.json');
const RECORD_ID = 'default_home_config';

export async function GET() {
  try {
    // 1. Prioridade máxima: Busca a configuração salva ONLINE no banco Neon Postgres
    try {
      const [record] = await db
        .select()
        .from(homeConfigs)
        .where(eq(homeConfigs.id, RECORD_ID))
        .limit(1);

      if (record && record.config) {
        return NextResponse.json({
          success: true,
          source: 'neon_database',
          updatedAt: record.updatedAt,
          updatedBy: record.updatedBy,
          config: record.config as HomeConfig,
        });
      }
    } catch (dbErr) {
      console.warn('[API home-config GET] Falha ao consultar Neon DB, usando fallback local:', dbErr);
    }

    // 2. Fallback: Arquivo local se existir
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const fileData = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData) as HomeConfig;
      return NextResponse.json({
        success: true,
        source: 'local_file',
        config: parsed,
      });
    }

    // 3. Fallback: Configuração padrão oficial TKE
    return NextResponse.json({
      success: true,
      source: 'default_fallback',
      config: DEFAULT_HOME_CONFIG,
    });
  } catch (error: any) {
    console.error('[API home-config GET] Erro geral ao obter configurações:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao carregar configurações' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newConfig: HomeConfig = {
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: body.updatedBy || 'Thiago Gregorio (DEV)',
      version: (body.version || 1) + 1,
    };

    let savedInDatabase = false;

    // 1. Salva ONLINE no banco Neon Serverless Postgres
    try {
      await db
        .insert(homeConfigs)
        .values({
          id: RECORD_ID,
          config: newConfig,
          updatedBy: newConfig.updatedBy,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: homeConfigs.id,
          set: {
            config: newConfig,
            updatedBy: newConfig.updatedBy,
            updatedAt: new Date(),
          },
        });

      savedInDatabase = true;
    } catch (dbErr: any) {
      console.error('[API home-config POST] Falha ao salvar no banco Neon:', dbErr);
    }

    // 2. Salva localmente em arquivo se o sistema permitir escrita (ambiente de desenvolvimento)
    try {
      const dirPath = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');
    } catch (fsErr) {
      console.warn('[API home-config POST] Gravação em arquivo local ignorada (esperado em nuvem):', fsErr);
    }

    return NextResponse.json({
      success: true,
      online: savedInDatabase,
      message: savedInDatabase
        ? 'Configuração salva com sucesso ONLINE no banco de dados Neon!'
        : 'Configuração salva no armazenamento local.',
      config: newConfig,
    });
  } catch (error: any) {
    console.error('[API home-config POST] Erro fatal ao gravar configuração:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao gravar as configurações da aplicação.',
      },
      { status: 500 }
    );
  }
}
