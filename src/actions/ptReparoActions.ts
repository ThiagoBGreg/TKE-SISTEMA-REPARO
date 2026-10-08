'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { serviceOrderHistory, serviceOrders, workPermits } from '@/db/schema';
import { ptReparoSchema, type PtReparoFormData } from '@/lib/validations/ptReparoSchema';

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
      let creatorId = userId;
      if (!creatorId) {
        const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
        creatorId = firstUser?.id;
      }

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
        serviceOrderId: targetServiceOrderId,
        codigo: codigoPT,
        status: ptStatus,
        contratoOrcamento: validatedData.contratoOrcamento,
        equipamento: validatedData.equipamento,
        tipoMaoDeObra: validatedData.tipoMaoDeObra,
        tipoEquipamento: validatedData.tipoEquipamento,
        classificacaoReparo: validatedData.classificacaoReparo,
        trabalhoEmAltura: validatedData.trabalhoEmAltura,
        assinaturaSupervisao: validatedData.assinaturaSupervisao,
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
      .where(eq(serviceOrders.id, targetServiceOrderId));

    // 7. Registra no Histórico de Auditoria da OS
    await db.insert(serviceOrderHistory).values({
      serviceOrderId: targetServiceOrderId,
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
