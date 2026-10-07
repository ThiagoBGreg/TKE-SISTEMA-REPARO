'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { serviceOrderAttachments, serviceOrderHistory, serviceOrders } from '@/db/schema';
import { getServiceOrderFolderStructure, uploadFileToDrive } from '@/lib/google-drive';

export interface UploadAttachmentsResult {
  success: boolean;
  error?: string;
  count?: number;
  attachments?: Array<{
    id: string;
    fileName: string;
    driveViewUrl: string;
    category: 'FOTO_SERVICO' | 'CARTA_CONCLUSAO';
  }>;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * Server Action para envio de evidências fotográficas e carta de conclusão para o Google Drive + Neon DB
 */
export async function uploadAttachmentsAction(
  formData: FormData
): Promise<UploadAttachmentsResult> {
  try {
    const serviceOrderId = formData.get('serviceOrderId') as string;
    const category = formData.get('category') as 'FOTO_SERVICO' | 'CARTA_CONCLUSAO';
    const uploadedById = (formData.get('uploadedById') as string) || null;
    const files = formData.getAll('files') as File[];

    if (!serviceOrderId) {
      return { success: false, error: 'ID da Ordem de Serviço não informado.' };
    }

    if (!category || !['FOTO_SERVICO', 'CARTA_CONCLUSAO'].includes(category)) {
      return { success: false, error: 'Categoria de anexo inválida.' };
    }

    if (!files || files.length === 0) {
      return { success: false, error: 'Nenhum arquivo enviado para upload.' };
    }

    // 1. Busca os dados da Ordem de Serviço no banco
    const [order] = await db
      .select()
      .from(serviceOrders)
      .where(eq(serviceOrders.id, serviceOrderId))
      .limit(1);

    if (!order) {
      return { success: false, error: 'Ordem de Serviço vinculada não encontrada.' };
    }

    // 2. Garante a estrutura de pastas no Google Drive para esta OS
    const folders = await getServiceOrderFolderStructure(order.codigo);
    const targetFolderId =
      category === 'FOTO_SERVICO' ? folders.fotosFolderId : folders.cartasFolderId;

    const savedRecords = [];

    // 3. Processa e envia cada arquivo individualmente
    for (const file of files) {
      // Validação de tipo
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
          success: false,
          error: `Formato de arquivo não suportado: ${file.name} (${file.type}). Utilize JPG, PNG, WEBP ou PDF.`,
        };
      }

      // Validação de tamanho
      if (file.size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `O arquivo ${file.name} excede o limite máximo permitido de 25MB.`,
        };
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // Upload para o Google Drive
      const driveUpload = await uploadFileToDrive({
        buffer: fileBuffer,
        fileName: file.name,
        mimeType: file.type,
        targetFolderId,
      });

      // Gravação no Neon Postgres
      const [insertedAttachment] = await db
        .insert(serviceOrderAttachments)
        .values({
          serviceOrderId,
          uploadedById,
          category,
          driveFileId: driveUpload.fileId,
          driveViewUrl: driveUpload.webViewLink,
          driveDownloadUrl: driveUpload.webContentLink,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        })
        .returning({
          id: serviceOrderAttachments.id,
          fileName: serviceOrderAttachments.fileName,
          driveViewUrl: serviceOrderAttachments.driveViewUrl,
          category: serviceOrderAttachments.category,
        });

      savedRecords.push(insertedAttachment);
    }

    // 4. Registra no histórico de auditoria da OS
    const descricaoAcao =
      category === 'CARTA_CONCLUSAO'
        ? `Carta de Conclusão / Aceite do cliente enviada ao Google Drive (${files[0].name}).`
        : `${files.length} foto(s) de evidência do serviço enviada(s) ao Google Drive.`;

    await db.insert(serviceOrderHistory).values({
      serviceOrderId,
      alteradoPorId: uploadedById,
      statusAnterior: order.status,
      statusNovo: order.status,
      acao: category === 'CARTA_CONCLUSAO' ? 'CARTA_CONCLUSAO' : 'UPLOAD_EVIDENCIAS',
      descricao: descricaoAcao,
      alteracoes: {
        totalArquivos: { antes: 0, depois: files.length },
        categoria: { antes: null, depois: category },
      },
    });

    revalidatePath(`/dashboard/reparo/${serviceOrderId}`);
    revalidatePath('/dashboard/reparo');

    return {
      success: true,
      count: savedRecords.length,
      attachments: savedRecords,
    };
  } catch (error) {
    console.error('[uploadAttachmentsAction] Erro no upload de evidências:', error);
    return {
      success: false,
      error: 'Erro interno ao processar o upload para o Google Drive.',
    };
  }
}

/**
 * Busca todos os anexos de uma OS agrupados por categoria
 */
export async function getAttachmentsByOrderAction(serviceOrderId: string) {
  try {
    const attachments = await db
      .select()
      .from(serviceOrderAttachments)
      .where(eq(serviceOrderAttachments.serviceOrderId, serviceOrderId))
      .orderBy(serviceOrderAttachments.createdAt);

    return {
      success: true,
      fotos: attachments.filter((a) => a.category === 'FOTO_SERVICO'),
      cartas: attachments.filter((a) => a.category === 'CARTA_CONCLUSAO'),
    };
  } catch (error) {
    console.error('[getAttachmentsByOrderAction] Erro ao buscar anexos:', error);
    return { success: false, fotos: [], cartas: [] };
  }
}
