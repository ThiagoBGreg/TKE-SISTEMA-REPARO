import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/db';
import { serviceOrderAttachments, workPermits } from '@/db/schema';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function generatePlaceholderSvg(fileName: string): string {
  const safeName = (fileName || 'Evidência Fotográfica')
    .replace(/[<>&"']/g, '')
    .slice(0, 40);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect x="40" y="40" width="720" height="520" rx="20" fill="none" stroke="#ff5e00" stroke-width="2" stroke-dasharray="8 8" opacity="0.6"/>
    <circle cx="400" cy="240" r="60" fill="#ff5e00" fill-opacity="0.15"/>
    <text x="400" y="260" font-family="system-ui, sans-serif" font-size="50" font-weight="bold" fill="#ff5e00" text-anchor="middle">📷</text>
    <text x="400" y="340" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">TKE • Evidência Registrada</text>
    <text x="400" y="380" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">${safeName}</text>
    <text x="400" y="420" font-family="system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Arquivo arquivado no sistema operacional</text>
  </svg>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Arquivo não especificado', { status: 400 });
    }

    const requestedFileName = pathSegments[pathSegments.length - 1];
    const baseUploadsDir = path.join(process.cwd(), 'public', 'uploads');

    // 1. Tenta localizar na pasta pública de uploads
    try {
      const fullPath = path.join(baseUploadsDir, ...pathSegments);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const fileBuffer = fs.readFileSync(fullPath);
        const mimeType = getMimeType(fullPath);
        return new NextResponse(fileBuffer as any, {
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch {
      // Ignora erro de leitura em disco
    }

    // 2. Tenta localizar dentro de public/uploads/cartas/
    const cartasDir = path.join(baseUploadsDir, 'cartas');
    try {
      if (fs.existsSync(cartasDir)) {
        const filesInDir = fs.readdirSync(cartasDir);
        const cleanTargetName = requestedFileName.replace(/^\d+_/, '').toLowerCase();
        const match = filesInDir.find(
          (f) =>
            f.toLowerCase() === requestedFileName.toLowerCase() ||
            f.replace(/^\d+_/, '').toLowerCase() === cleanTargetName
        );
        if (match) {
          const fullMatchedPath = path.join(cartasDir, match);
          const fileBuffer = fs.readFileSync(fullMatchedPath);
          const mimeType = getMimeType(fullMatchedPath);
          return new NextResponse(fileBuffer as any, {
            headers: {
              'Content-Type': mimeType,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }
    } catch {
      // Ignora erro de leitura em disco
    }

    // 3. Procura no banco de dados se há registro de Data URI base64
    try {
      const attachments = await db
        .select({
          driveViewUrl: serviceOrderAttachments.driveViewUrl,
          driveDownloadUrl: serviceOrderAttachments.driveDownloadUrl,
          fileName: serviceOrderAttachments.fileName,
          mimeType: serviceOrderAttachments.mimeType,
        })
        .from(serviceOrderAttachments)
        .where(
          sql`${serviceOrderAttachments.driveViewUrl} LIKE ${'%' + requestedFileName + '%'} OR ${serviceOrderAttachments.fileName} = ${requestedFileName}`
        )
        .limit(1);

      if (attachments.length > 0) {
        const att = attachments[0];
        const targetUrl = att.driveViewUrl || att.driveDownloadUrl || '';
        if (targetUrl.startsWith('data:')) {
          const [, base64] = targetUrl.split(';base64,');
          const mime = att.mimeType || 'image/jpeg';
          const buffer = Buffer.from(base64, 'base64');
          return new NextResponse(buffer as any, {
            headers: {
              'Content-Type': mime,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // Procura em work_permits (dados_completos->cartaConclusao ou fotosServico)
      const permits = await db
        .select({
          dadosCompletos: workPermits.dadosCompletos,
        })
        .from(workPermits)
        .where(
          sql`${workPermits.dadosCompletos}::text LIKE ${'%' + requestedFileName + '%'}`
        )
        .limit(1);

      if (permits.length > 0 && permits[0].dadosCompletos) {
        const dados = permits[0].dadosCompletos as any;
        if (
          dados.cartaConclusao?.driveViewUrl &&
          dados.cartaConclusao.driveViewUrl.startsWith('data:')
        ) {
          const [meta, base64] = dados.cartaConclusao.driveViewUrl.split(';base64,');
          const mime = meta.replace('data:', '') || 'image/jpeg';
          const buffer = Buffer.from(base64, 'base64');
          return new NextResponse(buffer as any, {
            headers: {
              'Content-Type': mime,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        if (Array.isArray(dados.fotosServico)) {
          const matchedFoto = dados.fotosServico.find(
            (f: any) =>
              f.driveViewUrl?.includes(requestedFileName) ||
              f.fileName === requestedFileName
          );
          if (matchedFoto?.driveViewUrl?.startsWith('data:')) {
            const [meta, base64] = matchedFoto.driveViewUrl.split(';base64,');
            const mime = meta.replace('data:', '') || 'image/jpeg';
            const buffer = Buffer.from(base64, 'base64');
            return new NextResponse(buffer as any, {
              headers: {
                'Content-Type': mime,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
              },
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn('[Route /uploads] Erro ao consultar banco:', dbErr);
    }

    // 4. Se não encontrar o arquivo binário em nenhum lugar, retorna placeholder visual em SVG
    const placeholder = generatePlaceholderSvg(requestedFileName);
    return new NextResponse(placeholder, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('[Route /uploads] Erro ao servir anexo:', err);
    return new NextResponse('Erro interno ao carregar arquivo', { status: 500 });
  }
}
