'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import {
  notifications,
  serviceOrderAttachments,
  serviceOrderHistory,
  serviceOrders,
} from '@/db/schema';
import { getServiceOrderFolderStructure, uploadFileToDrive } from '@/lib/google-drive';
import { AuthUser } from '@/types/auth';

const quickRepairSchema = z.object({
  contratoOrcamento: z.string().min(1, 'Número do Contrato ou Orçamento é obrigatório'),
  clienteNome: z.string().min(2, 'Nome do cliente ou edifício é obrigatório'),
  equipamentoNumero: z.string().min(1, 'Identificação do equipamento é obrigatória'),
  temCasaDeMaquinas: z.boolean().default(true),
  categoriaReparo: z.enum([
    'CABOS_DE_TRAÇÃO',
    'MAQUINA_E_MOTOR',
    'CABOS_DE_MANOBRA_ELETRICA',
    'LUBRIFICACAO_OLEO',
    'OUTROS_REPAROS',
  ]),
  prioridade: z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']),
  descricao: z.string().min(5, 'Descreva o problema constatado ou escopo inicial'),
});

export type QuickRepairFormData = z.infer<typeof quickRepairSchema>;

export type QuickRepairResult =
  | { success: true; osId: string; codigo: string }
  | { success: false; error: string };

/**
 * Server Action para abertura rápida de chamado / orçamento restrita a Gestores e Supervisores
 */
export async function createQuickRepairRequestAction(
  formData: FormData,
  user: AuthUser | null
): Promise<QuickRepairResult> {
  try {
    // 1. Controle de Acesso Estrito (RBAC)
    if (!user || user.status !== 'ATIVO') {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const isAuthorized =
      ['GESTOR', 'SUPERVISOR'].includes(user.cargo) &&
      ['REPARO', 'SERVICOS'].includes(user.departamento);

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Abertura rápida de chamados é de uso exclusivo da Supervisão Técnica e Gestão.',
      };
    }

    // 2. Extração e Validação dos Campos
    const rawData = {
      contratoOrcamento: formData.get('contratoOrcamento') as string,
      clienteNome: formData.get('clienteNome') as string,
      equipamentoNumero: formData.get('equipamentoNumero') as string,
      temCasaDeMaquinas: formData.get('temCasaDeMaquinas') === 'true',
      categoriaReparo: formData.get('categoriaReparo') as any,
      prioridade: (formData.get('prioridade') as any) || 'MEDIA',
      descricao: formData.get('descricao') as string,
    };

    const validation = quickRepairSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Dados inválidos.',
      };
    }

    const validated = validation.data;

    // 3. Gera Código da OS
    const anoAtual = new Date().getFullYear();
    const sequencial = Math.floor(1000 + Math.random() * 9000);
    const codigoOS = `OS-${anoAtual}-${sequencial}`;

    // 4. Insere a nova Ordem de Serviço no Neon Postgres
    const [insertedOrder] = await db
      .insert(serviceOrders)
      .values({
        codigo: codigoOS,
        titulo: `Reparo: ${validated.categoriaReparo.replace(/_/g, ' ')}`,
        descricao: validated.descricao,
        status: 'PENDENTE',
        prioridade: validated.prioridade,
        categoriaReparo: validated.categoriaReparo,
        clienteNome: validated.clienteNome,
        equipamentoNumero: validated.equipamentoNumero,
        temCasaDeMaquinas: validated.temCasaDeMaquinas,
        criadoPorId: user.id,
        statusFinanceiro: 'PENDENTE',
        valorServico: '0.00',
      })
      .returning({ id: serviceOrders.id, codigo: serviceOrders.codigo });

    // 5. Se houver foto preliminar anexada, faz upload no Google Drive
    const foto = formData.get('foto') as File | null;
    if (foto && foto.size > 0 && foto.size <= 25 * 1024 * 1024) {
      try {
        const folders = await getServiceOrderFolderStructure(codigoOS);
        const fileBuffer = Buffer.from(await foto.arrayBuffer());

        const driveUpload = await uploadFileToDrive({
          buffer: fileBuffer,
          fileName: `PRELIMINAR_${foto.name}`,
          mimeType: foto.type,
          targetFolderId: folders.fotosFolderId,
        });

        await db.insert(serviceOrderAttachments).values({
          serviceOrderId: insertedOrder.id,
          uploadedById: user.id,
          category: 'FOTO_SERVICO',
          driveFileId: driveUpload.fileId,
          driveViewUrl: driveUpload.webViewLink,
          driveDownloadUrl: driveUpload.webContentLink,
          fileName: `PRELIMINAR_${foto.name}`,
          fileSize: foto.size,
          mimeType: foto.type,
        });
      } catch (driveErr) {
        console.warn('[QuickRepair] Foto preliminar não pôde ser enviada ao Drive:', driveErr);
      }
    }

    // 6. Registra no Histórico de Auditoria
    await db.insert(serviceOrderHistory).values({
      serviceOrderId: insertedOrder.id,
      alteradoPorId: user.id,
      statusAnterior: null,
      statusNovo: 'PENDENTE',
      acao: 'ABERTURA_CHAMADO_RAPIDO',
      descricao: `Chamado aberto via solicitação rápida por ${user.nome} (${user.cargo}).`,
    });

    // 7. Notifica a equipe de gestão
    await db.insert(notifications).values({
      departamento: 'REPARO',
      titulo: `Novo Chamado Emergencial: ${codigoOS}`,
      mensagem: `${validated.clienteNome} • ${validated.categoriaReparo} (${validated.prioridade})`,
      link: `/dashboard/reparo`,
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/reparo');

    return {
      success: true,
      osId: insertedOrder.id,
      codigo: insertedOrder.codigo,
    };
  } catch (error) {
    console.error('[createQuickRepairRequestAction] Erro:', error);
    return {
      success: false,
      error: 'Erro interno ao registrar chamado de reparo.',
    };
  }
}
