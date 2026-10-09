import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workPermits, serviceOrderAttachments } from '@/db/schema';
import { eq, or, and, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return new NextResponse('Identificador da PT não informado.', { status: 400 });
    }

    // Busca por ID (UUID) ou pelo Código público (ex: "PT-2026-3067")
    const permits = await db
      .select()
      .from(workPermits)
      .where(or(eq(workPermits.id, id), eq(workPermits.codigo, id)))
      .limit(1);

    if (!permits || permits.length === 0) {
      return new NextResponse('Permissão de Trabalho não encontrada.', { status: 404 });
    }

    const permit = permits[0];
    let carta = permit.dadosCompletos?.cartaConclusao;

    // Fallback caso não esteja em dadosCompletos mas exista anexo na OS vinculada
    if (!carta && permit.serviceOrderId) {
      try {
        const [att] = await db
          .select()
          .from(serviceOrderAttachments)
          .where(
            and(
              eq(serviceOrderAttachments.serviceOrderId, permit.serviceOrderId),
              eq(serviceOrderAttachments.category, 'CARTA_CONCLUSAO')
            )
          )
          .orderBy(desc(serviceOrderAttachments.createdAt))
          .limit(1);

        if (att) {
          carta = {
            id: att.id,
            fileName: att.fileName,
            driveViewUrl: att.driveViewUrl,
            driveDownloadUrl: att.driveDownloadUrl || att.driveViewUrl,
            enviadoEm: att.createdAt ? new Date(att.createdAt).toISOString() : new Date().toISOString(),
            rawBase64: att.driveViewUrl.startsWith('data:') ? att.driveViewUrl : undefined,
          } as any;
        }
      } catch (attErr) {
        console.warn('[API Carta Conclusao] Erro no fallback de anexo da OS:', attErr);
      }
    }

    if (!carta) {
      return new NextResponse('Nenhuma carta de conclusão foi anexada para esta PT.', { status: 404 });
    }

    const sourceUrl = (carta as any).rawBase64 || carta.driveViewUrl;

    // 1. Caso seja Data URI Base64 (armazenada de forma resiliente na nuvem / Neon)
    if (sourceUrl && sourceUrl.startsWith('data:')) {
      const [meta, base64Content] = sourceUrl.split(';base64,');
      const mimeType = meta.replace('data:', '') || 'application/pdf';
      const buffer = Buffer.from(base64Content, 'base64');
      const isPdf = mimeType.includes('pdf');
      const safeCodigo = permit.codigo.replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = isPdf ? 'pdf' : 'jpg';

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="Carta_Conclusao_${safeCodigo}.${ext}"`,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // 2. Caso seja arquivo local em /uploads/cartas/... (ambiente com disco gravável)
    if (sourceUrl && sourceUrl.startsWith('/uploads/')) {
      const relativeFilePath = sourceUrl.replace(/^\//, '');
      const fullFilePath = path.join(process.cwd(), 'public', relativeFilePath);

      if (fs.existsSync(fullFilePath)) {
        const fileBuffer = fs.readFileSync(fullFilePath);
        const isPdf = sourceUrl.endsWith('.pdf');
        const mimeType = isPdf ? 'application/pdf' : 'image/jpeg';
        const safeCodigo = permit.codigo.replace(/[^a-zA-Z0-9_-]/g, '_');

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': mimeType,
            'Content-Disposition': `inline; filename="Carta_Conclusao_${safeCodigo}.${isPdf ? 'pdf' : 'jpg'}"`,
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    // 3. Caso seja link externo absoluto (Google Drive oficial)
    if (sourceUrl && (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://'))) {
      return NextResponse.redirect(sourceUrl);
    }

    return new NextResponse('Arquivo da carta de conclusão não pôde ser localizado.', { status: 404 });
  } catch (error) {
    console.error('[API Carta Conclusao] Erro ao servir carta de conclusão:', error);
    return new NextResponse('Erro interno ao buscar o documento da carta de conclusão.', { status: 500 });
  }
}
