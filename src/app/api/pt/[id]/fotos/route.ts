import { NextRequest, NextResponse } from 'next/server';
import { eq, or, and } from 'drizzle-orm';
import { db } from '@/db';
import { workPermits, serviceOrders, serviceOrderAttachments } from '@/db/schema';
import type { FotoServicoItem } from '@/actions/fotoServicoActions';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Identificador da PT não informado.' },
        { status: 400 }
      );
    }

    const [permit] = await db
      .select()
      .from(workPermits)
      .where(or(eq(workPermits.id, id), eq(workPermits.codigo, id)))
      .limit(1);

    if (!permit) {
      return NextResponse.json(
        { success: false, error: 'Permissão de Trabalho não encontrada.' },
        { status: 404 }
      );
    }

    // Lê usuário da sessão
    let sessionUser: any = null;
    const sessionCookie = request.cookies.get('tke_session')?.value;
    if (sessionCookie) {
      try {
        sessionUser = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
      } catch {}
    }

    const formData = await request.formData();
    const legendaGeral = (formData.get('legenda') as string)?.trim() || '';
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhuma foto foi selecionada para envio.' },
        { status: 400 }
      );
    }

    const novasFotos: FotoServicoItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || typeof file === 'string') continue;

      const fotoId = `foto_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString('base64');
      const mimeType = file.type || 'image/jpeg';
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      let driveViewUrl = dataUri;
      let driveDownloadUrl: string | null = dataUri;
      let attachmentId = fotoId;

      // Tenta upload no Google Drive se disponível
      try {
        const { uploadFileToDrive, getOrCreateFolder } = await import('@/lib/google-drive');
        const targetFolderId = await getOrCreateFolder('FOTOS_SERVICO');
        const uploadRes = await uploadFileToDrive({
          buffer,
          fileName: file.name,
          mimeType,
          targetFolderId,
        });

        if (uploadRes && uploadRes.webViewLink) {
          driveViewUrl = uploadRes.webViewLink;
          driveDownloadUrl = uploadRes.webContentLink || uploadRes.webViewLink;
          attachmentId = uploadRes.fileId;
        }
      } catch (driveErr) {
        // Fallback resiliente usando base64
      }

      // Se tiver serviceOrderId, registra também na tabela service_order_attachments
      if (permit.serviceOrderId) {
        try {
          const [insertedAtt] = await db
            .insert(serviceOrderAttachments)
            .values({
              serviceOrderId: permit.serviceOrderId,
              uploadedById: sessionUser?.id || null,
              category: 'FOTO_SERVICO',
              driveFileId: attachmentId,
              driveViewUrl: driveViewUrl,
              driveDownloadUrl: driveDownloadUrl,
              fileName: file.name,
              fileSize: file.size,
              mimeType: mimeType,
            })
            .returning();

          if (insertedAtt) {
            attachmentId = insertedAtt.id;
          }
        } catch (dbErr) {
          console.warn('[POST /api/pt/[id]/fotos] Aviso ao inserir no attachments:', dbErr);
        }
      }

      novasFotos.push({
        id: attachmentId,
        fileName: file.name,
        driveViewUrl: driveViewUrl,
        driveDownloadUrl: driveDownloadUrl,
        legenda: legendaGeral || `Evidência Fotográfica ${i + 1}`,
        enviadoEm: new Date().toISOString(),
        enviadoPorNome: sessionUser?.nome || 'Técnico de Reparo',
        fileSize: file.size,
      });
    }

    // Atualiza os dadosCompletos da PT
    const fotosExistentes: FotoServicoItem[] =
      ((permit.dadosCompletos as any)?.fotosServico as FotoServicoItem[]) || [];

    const fotosAtualizadas = [...fotosExistentes, ...novasFotos];

    const updatedDados = {
      ...permit.dadosCompletos,
      fotosServico: fotosAtualizadas,
    };

    await db
      .update(workPermits)
      .set({
        dadosCompletos: updatedDados as any,
        updatedAt: new Date(),
      })
      .where(eq(workPermits.id, permit.id));

    return NextResponse.json({
      success: true,
      message: `${novasFotos.length} foto(s) enviada(s) com sucesso!`,
      fotos: fotosAtualizadas,
    });
  } catch (error) {
    console.error('[POST /api/pt/[id]/fotos] Erro no upload de fotos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao processar upload de fotos.' },
      { status: 500 }
    );
  }
}
