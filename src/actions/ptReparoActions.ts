'use server';

import { revalidatePath } from 'next/cache';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, serviceOrderHistory, serviceOrders, users, workPermits } from '@/db/schema';
import { ptReparoSchema, type PtReparoFormData } from '@/lib/validations/ptReparoSchema';
import type { AuthUser } from '@/types/auth';

export type SubmitPtReparoResult =
  | { success: true; workPermitId: string; codigo: string }
  | { success: false; error: string; issues?: Record<string, string[]> };

/**
 * Server Action para submissão e gravação da PT - Reparo
 */
export async function submitPtReparoAction(
  data: PtReparoFormData,
  userId?: string
): Promise<SubmitPtReparoResult> {
  try {
    // 1. Validação estrita via Zod
    const validation = ptReparoSchema.safeParse(data);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: 'Existem campos obrigatórios não preenchidos ou assinaturas pendentes.',
        issues: fieldErrors,
      };
    }

    const validatedData = validation.data;

    // Obtém o usuário criador
    const sessionUser = await getSessionUser();
    let creatorId = userId || sessionUser?.id;
    if (!creatorId) {
      const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
      creatorId = firstUser?.id;
    }

    // 2. Busca ou auto-cria a Ordem de Serviço vinculada
    let targetServiceOrderId = validatedData.serviceOrderId;
    let existingOrder = null;

    // 2.1 Busca por ID se fornecido
    if (targetServiceOrderId) {
      try {
        const [orderById] = await db
          .select()
          .from(serviceOrders)
          .where(eq(serviceOrders.id, targetServiceOrderId))
          .limit(1);
        existingOrder = orderById;
      } catch {
        // Se targetServiceOrderId não for UUID válido, ignora erro e busca por código
      }
    }

    // 2.2 Se não encontrou por ID, busca pelo Código de Contrato/Orçamento
    if (!existingOrder && validatedData.contratoOrcamento) {
      const [orderByCodigo] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.codigo, validatedData.contratoOrcamento.trim()))
        .limit(1);
      if (orderByCodigo) {
        existingOrder = orderByCodigo;
        targetServiceOrderId = existingOrder.id;
      }
    }

    // 2.3 Se ainda não existir a OS (ex: emissão avulsa pelo técnico/subcontratado), auto-cria a OS
    if (!existingOrder) {
      const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
      if (!creatorId) {
        await db
          .insert(users)
          .values({
            id: ADMIN_ID,
            nome: 'Thiago Gregorio',
            email: 'thiago.gregorio@tke.com',
            senhaHash: 'Thiago200189',
            departamento: 'ADMINISTRATIVO',
            cargo: 'ADMINISTRATIVO',
            status: 'ATIVO',
            isAdmin: true,
          })
          .onConflictDoNothing();
        creatorId = ADMIN_ID;
      }

      const osCodigo = validatedData.contratoOrcamento.trim().toUpperCase().startsWith('OS-')
        ? validatedData.contratoOrcamento.trim().toUpperCase()
        : `OS-${validatedData.contratoOrcamento.trim() || Math.floor(100000 + Math.random() * 900000)}`;

      const [newOrder] = await db
        .insert(serviceOrders)
        .values({
          codigo: osCodigo,
          titulo: `Reparo: ${validatedData.equipamento || 'Equipamento'}`,
          descricao: `Serviço de reparo classificado como ${validatedData.classificacaoReparo} (Mão de Obra: ${validatedData.tipoMaoDeObra}).`,
          status: 'EM_EXECUCAO',
          prioridade: 'MEDIA',
          categoriaReparo: validatedData.classificacaoReparo,
          equipamentoNumero: validatedData.equipamento,
          clienteNome: 'Cliente Corporativo TKE',
          criadoPorId: creatorId,
          responsavelTecnicoId: creatorId,
        })
        .returning();

      existingOrder = newOrder;
      targetServiceOrderId = newOrder.id;
    }

    const finalServiceOrderId = targetServiceOrderId || existingOrder?.id;
    if (!finalServiceOrderId) {
      throw new Error('Não foi possível associar a Ordem de Serviço para gravação da PT.');
    }

    // 3. Gera código sequencial/formatado da PT
    const anoAtual = new Date().getFullYear();
    const hash = Math.floor(1000 + Math.random() * 9000);
    const codigoPT = `PT-${anoAtual}-${hash}`;

    // 4. Determina status inicial da PT e da OS
    const isFinalizada = !!validatedData.terminoServico?.emitenteAssinatura;
    const ptStatus = isFinalizada ? 'FINALIZADA' : 'EM_ANDAMENTO';
    const novoStatusOS = isFinalizada ? 'VALIDACAO_TECNICA' : 'EM_EXECUCAO';

    // 5. Persiste a PT no Neon Postgres
    const [insertedPermit] = await db
      .insert(workPermits)
      .values({
        serviceOrderId: finalServiceOrderId,
        codigo: codigoPT,
        status: ptStatus,
        criadoPorId: creatorId,
        contratoOrcamento: validatedData.contratoOrcamento,
        equipamento: validatedData.equipamento,
        tipoMaoDeObra: validatedData.tipoMaoDeObra,
        tipoEquipamento: validatedData.tipoEquipamento,
        classificacaoReparo: validatedData.classificacaoReparo,
        trabalhoEmAltura: validatedData.trabalhoEmAltura,
        assinaturaSupervisao: validatedData.assinaturaSupervisao || null,
        assinaturaInicio: validatedData.inicioServico.emitenteAssinatura,
        assinaturaTermino: validatedData.terminoServico?.emitenteAssinatura || null,
        dadosCompletos: validatedData,
      })
      .returning({ id: workPermits.id, codigo: workPermits.codigo });

    // 6. Atualiza o status da Ordem de Serviço
    await db
      .update(serviceOrders)
      .set({
        status: novoStatusOS,
        dataInicio: existingOrder.dataInicio || new Date(validatedData.inicioServico.dataHoraInicio),
        ...(isFinalizada && validatedData.terminoServico?.dataHoraTermino
          ? { dataConclusao: new Date(validatedData.terminoServico.dataHoraTermino) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(serviceOrders.id, finalServiceOrderId));

    // 7. Registra no Histórico de Auditoria da OS
    await db.insert(serviceOrderHistory).values({
      serviceOrderId: finalServiceOrderId,
      alteradoPorId: userId || null,
      statusAnterior: existingOrder.status,
      statusNovo: novoStatusOS,
      acao: isFinalizada ? 'FINALIZACAO_PT' : 'EMISSAO_PT',
      descricao: `Permissão de Trabalho (${codigoPT}) emitida com sucesso e assinaturas auditadas registradas.`,
      alteracoes: {
        ptCodigo: { antes: null, depois: codigoPT },
        statusOS: { antes: existingOrder.status, depois: novoStatusOS },
      },
    });

    revalidatePath(`/dashboard/reparo/${targetServiceOrderId}`);
    revalidatePath('/dashboard/reparo');
    revalidatePath('/dashboard/reparo/pt');

    return {
      success: true,
      workPermitId: insertedPermit.id,
      codigo: insertedPermit.codigo,
    };
  } catch (error) {
    console.error('[submitPtReparoAction] Erro ao gravar Permissão de Trabalho:', error);
    return {
      success: false,
      error: 'Erro interno ao salvar a Permissão de Trabalho no banco de dados.',
    };
  }
}

/**
 * Obtém a sessão do usuário logado (cookies)
 */
async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('tke_session')?.value;
    if (!sessionCookie) return null;
    return JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Busca todas as PTs/APRs emitidas (Usuários visualizam as suas ou todas se Admin)
 */
export async function getPtReparosAction() {
  try {
    const user = await getSessionUser();
    const { isSuperAdmin } = await import('@/lib/permissions');
    const isAdmin = isSuperAdmin(user);

    const permits = await db
      .select({
        id: workPermits.id,
        codigo: workPermits.codigo,
        status: workPermits.status,
        contratoOrcamento: workPermits.contratoOrcamento,
        equipamento: workPermits.equipamento,
        tipoMaoDeObra: workPermits.tipoMaoDeObra,
        tipoEquipamento: workPermits.tipoEquipamento,
        classificacaoReparo: workPermits.classificacaoReparo,
        trabalhoEmAltura: workPermits.trabalhoEmAltura,
        serviceOrderId: workPermits.serviceOrderId,
        criadoPorId: workPermits.criadoPorId,
        dadosCompletos: workPermits.dadosCompletos,
        createdAt: workPermits.createdAt,
      })
      .from(workPermits)
      .orderBy(desc(workPermits.createdAt));

    return { success: true, permits, isAdmin };
  } catch (error) {
    console.error('[getPtReparosAction] Erro ao buscar PTs:', error);
    return { success: false, permits: [], isAdmin: false };
  }
}

/**
 * Busca dados completos de uma PT pelo ID
 */
export async function getPtReparoByIdAction(id: string) {
  try {
    const [permit] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, id))
      .limit(1);

    if (!permit) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.' };
    }

    const user = await getSessionUser();
    const { isSuperAdmin } = await import('@/lib/permissions');
    const isAdmin = isSuperAdmin(user);

    return { success: true, permit, isAdmin };
  } catch (error) {
    console.error('[getPtReparoByIdAction] Erro:', error);
    return { success: false, error: 'Erro ao buscar Permissão de Trabalho.' };
  }
}

/**
 * Atualiza uma Permissão de Trabalho (Somente Administrador)
 */
export async function updatePtReparoAction(
  id: string,
  data: Partial<PtReparoFormData>
) {
  try {
    const user = await getSessionUser();
    const { isSuperAdmin } = await import('@/lib/permissions');
    if (!isSuperAdmin(user)) {
      return { success: false, error: 'Apenas administradores podem editar a Permissão de Trabalho.' };
    }

    const [existing] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.' };
    }

    const updatedData = {
      ...existing.dadosCompletos,
      ...data,
    };

    await db
      .update(workPermits)
      .set({
        contratoOrcamento: data.contratoOrcamento || existing.contratoOrcamento,
        equipamento: data.equipamento || existing.equipamento,
        classificacaoReparo: data.classificacaoReparo || existing.classificacaoReparo,
        dadosCompletos: updatedData,
        updatedAt: new Date(),
      })
      .where(eq(workPermits.id, id));

    revalidatePath('/dashboard/reparo/pt');
    return { success: true };
  } catch (error) {
    console.error('[updatePtReparoAction] Erro ao atualizar PT:', error);
    return { success: false, error: 'Erro ao atualizar a Permissão de Trabalho.' };
  }
}

/**
 * Exclui uma Permissão de Trabalho (Somente Administrador)
 */
export async function deletePtReparoAction(id: string) {
  try {
    const user = await getSessionUser();
    const { isSuperAdmin } = await import('@/lib/permissions');
    if (!isSuperAdmin(user)) {
      return { success: false, error: 'Apenas administradores podem excluir a Permissão de Trabalho.' };
    }

    await db.delete(workPermits).where(eq(workPermits.id, id));

    revalidatePath('/dashboard/reparo/pt');
    return { success: true };
  } catch (error) {
    console.error('[deletePtReparoAction] Erro ao excluir PT:', error);
    return { success: false, error: 'Erro ao excluir a Permissão de Trabalho.' };
  }
}
