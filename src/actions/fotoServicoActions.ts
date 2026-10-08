'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { workPermits, serviceOrders, serviceOrderAttachments, users } from '@/db/schema';

async function getSessionUser() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('tke_session')?.value;
    if (!sessionCookie) return null;
    return JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as any;
  } catch {
    return null;
  }
}

export interface FotoServicoItem {
  id: string;
  fileName: string;
  driveViewUrl: string;
  driveDownloadUrl?: string | null;
  legenda?: string;
  enviadoEm: string;
  enviadoPorNome?: string;
  fileSize?: number;
}

/**
 * Busca todas as fotos do serviço anexadas a uma PT específica
 */
export async function getFotosServicoAction(workPermitId: string) {
  try {
    const [permit] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, workPermitId))
      .limit(1);

    if (!permit) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.', fotos: [] };
    }

    // 1. Fotos salvas no payload JSON da PT
    const fotosFromDados: FotoServicoItem[] =
      ((permit.dadosCompletos as any)?.fotosServico as FotoServicoItem[]) || [];

    // 2. Fotos salvas na tabela service_order_attachments
    let fotosFromAttachments: FotoServicoItem[] = [];
    if (permit.serviceOrderId) {
      const attachments = await db
        .select({
          id: serviceOrderAttachments.id,
          fileName: serviceOrderAttachments.fileName,
          driveViewUrl: serviceOrderAttachments.driveViewUrl,
          driveDownloadUrl: serviceOrderAttachments.driveDownloadUrl,
          fileSize: serviceOrderAttachments.fileSize,
          createdAt: serviceOrderAttachments.createdAt,
          uploadedById: serviceOrderAttachments.uploadedById,
        })
        .from(serviceOrderAttachments)
        .where(
          and(
            eq(serviceOrderAttachments.serviceOrderId, permit.serviceOrderId),
            eq(serviceOrderAttachments.category, 'FOTO_SERVICO')
          )
        )
        .orderBy(serviceOrderAttachments.createdAt);

      fotosFromAttachments = attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        driveViewUrl: a.driveViewUrl,
        driveDownloadUrl: a.driveDownloadUrl || a.driveViewUrl,
        enviadoEm: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
        fileSize: a.fileSize || undefined,
      }));
    }

    // Combina removendo IDs duplicados
    const mapaFotos = new Map<string, FotoServicoItem>();
    fotosFromDados.forEach((f) => mapaFotos.set(f.id, f));
    fotosFromAttachments.forEach((f) => {
      if (!mapaFotos.has(f.id)) {
        mapaFotos.set(f.id, f);
      }
    });

    const todasFotos = Array.from(mapaFotos.values());

    return {
      success: true,
      permit: {
        id: permit.id,
        codigo: permit.codigo,
        contratoOrcamento: permit.contratoOrcamento,
        equipamento: permit.equipamento,
        tipoMaoDeObra: permit.tipoMaoDeObra,
        status: permit.status,
        serviceOrderId: permit.serviceOrderId,
        dadosCompletos: permit.dadosCompletos,
      },
      fotos: todasFotos,
    };
  } catch (error) {
    console.error('[getFotosServicoAction] Erro ao buscar fotos:', error);
    return { success: false, error: 'Erro ao carregar fotos do serviço.', fotos: [] };
  }
}

/**
 * Faz upload de fotos do serviço (uma ou mais) e vincula à PT
 */
export async function uploadFotosServicoAction(formData: FormData) {
  try {
    const user = await getSessionUser();
    const workPermitId = formData.get('workPermitId') as string;
    const legendaGeral = (formData.get('legenda') as string)?.trim() || '';

    if (!workPermitId) {
      return { success: false, error: 'Identificador da PT não informado.' };
    }

    const [permit] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, workPermitId))
      .limit(1);

    if (!permit) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.' };
    }

    const files = formData.getAll('files') as File[];
    if (!files || files.length === 0) {
      return { success: false, error: 'Nenhuma foto foi selecionada para envio.' };
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
        // Fallback resiliente com armazenamento direto
      }

      // Se tiver serviceOrderId, registra também na tabela service_order_attachments
      if (permit.serviceOrderId) {
        try {
          const [insertedAtt] = await db
            .insert(serviceOrderAttachments)
            .values({
              serviceOrderId: permit.serviceOrderId,
              uploadedById: user?.id || null,
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
          console.warn('[uploadFotosServicoAction] Aviso ao inserir no attachments:', dbErr);
        }
      }

      novasFotos.push({
        id: attachmentId,
        fileName: file.name,
        driveViewUrl: driveViewUrl,
        driveDownloadUrl: driveDownloadUrl,
        legenda: legendaGeral || `Evidência Fotográfica ${i + 1}`,
        enviadoEm: new Date().toISOString(),
        enviadoPorNome: user?.nome || 'Técnico de Reparo',
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
      .where(eq(workPermits.id, workPermitId));

    revalidatePath(`/dashboard/reparo/pt/${workPermitId}/fotos`);
    revalidatePath('/dashboard/reparo/pt');

    return {
      success: true,
      message: `${novasFotos.length} foto(s) enviada(s) com sucesso!`,
      fotos: fotosAtualizadas,
    };
  } catch (error) {
    console.error('[uploadFotosServicoAction] Erro:', error);
    return { success: false, error: 'Erro interno ao processar o envio das fotos do serviço.' };
  }
}

/**
 * Exclui uma foto do serviço vinculada à PT
 */
export async function deleteFotoServicoAction(workPermitId: string, fotoId: string) {
  try {
    const [permit] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, workPermitId))
      .limit(1);

    if (!permit) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.' };
    }

    // 1. Remove da tabela service_order_attachments se existir
    try {
      await db
        .delete(serviceOrderAttachments)
        .where(
          and(
            eq(serviceOrderAttachments.id, fotoId),
            eq(serviceOrderAttachments.category, 'FOTO_SERVICO')
          )
        );
    } catch {}

    // 2. Remove do array de fotos em dadosCompletos
    const fotosExistentes: FotoServicoItem[] =
      ((permit.dadosCompletos as any)?.fotosServico as FotoServicoItem[]) || [];

    const fotosFiltradas = fotosExistentes.filter((f) => f.id !== fotoId);

    const updatedDados = {
      ...permit.dadosCompletos,
      fotosServico: fotosFiltradas,
    };

    await db
      .update(workPermits)
      .set({
        dadosCompletos: updatedDados as any,
        updatedAt: new Date(),
      })
      .where(eq(workPermits.id, workPermitId));

    revalidatePath(`/dashboard/reparo/pt/${workPermitId}/fotos`);
    revalidatePath('/dashboard/reparo/pt');

    return { success: true, message: 'Foto removida com sucesso!' };
  } catch (error) {
    console.error('[deleteFotoServicoAction] Erro:', error);
    return { success: false, error: 'Erro ao remover foto.' };
  }
}
