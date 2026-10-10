import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DEFAULT_HOME_CONFIG } from '@/data/defaultHomeConfig';
import { HomeConfig } from '@/types/homeConfig';

const CONFIG_FILE_PATH = path.join(process.cwd(), 'src', 'data', 'homeConfig.json');

export async function GET() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const fileData = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileData) as HomeConfig;
      return NextResponse.json({ success: true, config: parsed });
    }
    return NextResponse.json({ success: true, config: DEFAULT_HOME_CONFIG });
  } catch (error) {
    console.error('[API home-config GET] Erro ao ler configuração:', error);
    return NextResponse.json({ success: true, config: DEFAULT_HOME_CONFIG });
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

    const dirPath = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(newConfig, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Configuração da página inicial salva com sucesso pelo DEV Thiago Gregorio!',
      config: newConfig,
    });
  } catch (error) {
    console.error('[API home-config POST] Erro ao gravar configuração:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao gravar as configurações da home page.' },
      { status: 500 }
    );
  }
}
