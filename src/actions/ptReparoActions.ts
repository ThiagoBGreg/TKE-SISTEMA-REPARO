'use server';

import { revalidatePath } from 'next/cache';
import { eq, desc, or, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, serviceOrderHistory, serviceOrders, users, workPermits, serviceOrderAttachments } from '@/db/schema';
import { ptReparoSchema, type DigitalSignature, type PtReparoFormData } from '@/lib/validations/ptReparoSchema';
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

    // Obtém o usuário criador e valida existência no banco de dados
    const sessionUser = await getSessionUser();
    let creatorId = userId || sessionUser?.id;
    let validCreator = null;

    if (creatorId) {
      try {
        const [userInDb] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, creatorId))
          .limit(1);
        validCreator = userInDb;
      } catch {
        validCreator = null;
      }
    }

    if (!validCreator) {
      // Fallback para admin padrão Thiago Gregorio ou primeiro usuário do banco
      const ADMIN_ID = '00000000-0000-0000-0000-000000000001';
      const [adminUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, ADMIN_ID))
        .limit(1);

      if (adminUser) {
        creatorId = adminUser.id;
      } else {
        const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
        if (firstUser) {
          creatorId = firstUser.id;
        } else {
          // Se o banco estiver vazio, semeia o admin Thiago Gregorio
          await db
            .insert(users)
            .values({
              id: ADMIN_ID,
              nome: 'Thiago Gregorio',
              email: 'thiago.gregorio@tke.com',
              senhaHash: 'ManuLinda',
              departamento: 'ADMINISTRATIVO',
              cargo: 'ADMINISTRATIVO',
              status: 'ATIVO',
              isAdmin: true,
            })
            .onConflictDoNothing();
          creatorId = ADMIN_ID;
        }
      }
    }
    const finalCreatorId: string = creatorId || '00000000-0000-0000-0000-000000000001';

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

    const contratoRaw = validatedData.contratoOrcamento?.trim() || '';
    const contratoUpper = contratoRaw.toUpperCase();
    const osPrefix = contratoUpper.startsWith('OS-') ? contratoUpper : `OS-${contratoUpper}`;
    const semPrefix = contratoUpper.replace(/^OS-/, '');

    // 2.2 Se não encontrou por ID, busca pelo Código de Contrato/Orçamento (todas as variações)
    if (!existingOrder && contratoRaw) {
      const [orderByCodigo] = await db
        .select()
        .from(serviceOrders)
        .where(
          or(
            eq(serviceOrders.codigo, contratoRaw),
            eq(serviceOrders.codigo, contratoUpper),
            eq(serviceOrders.codigo, osPrefix),
            eq(serviceOrders.codigo, semPrefix)
          )
        )
        .limit(1);

      if (orderByCodigo) {
        existingOrder = orderByCodigo;
        targetServiceOrderId = existingOrder.id;
      }
    }

    // 2.3 Se ainda não existir a OS (ex: emissão avulsa pelo técnico/subcontratado), auto-cria a OS
    if (!existingOrder) {
      // Verifica se o código pretendido já existe para evitar violação de unique constraint
      let osCodigo = osPrefix;
      const [existsCode] = await db
        .select()
        .from(serviceOrders)
        .where(eq(serviceOrders.codigo, osCodigo))
        .limit(1);

      if (existsCode) {
        existingOrder = existsCode;
        targetServiceOrderId = existsCode.id;
      } else {
        const isSub = sessionUser?.cargo === 'SUBCONTRATADO';

        try {
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
              criadoPorId: finalCreatorId,
              responsavelTecnicoId: finalCreatorId,
              subcontratadoId: isSub ? finalCreatorId : null,
            })
            .returning();

          existingOrder = newOrder;
          targetServiceOrderId = newOrder.id;
        } catch {
          // Fallback caso ocorra colisão de código
          const osCodigoUnico = `OS-${semPrefix || 'REP'}-${Math.floor(100000 + Math.random() * 900000)}`;
          const [newOrder] = await db
            .insert(serviceOrders)
            .values({
              codigo: osCodigoUnico,
              titulo: `Reparo: ${validatedData.equipamento || 'Equipamento'}`,
              descricao: `Serviço de reparo classificado como ${validatedData.classificacaoReparo} (Mão de Obra: ${validatedData.tipoMaoDeObra}).`,
              status: 'EM_EXECUCAO',
              prioridade: 'MEDIA',
              categoriaReparo: validatedData.classificacaoReparo,
              equipamentoNumero: validatedData.equipamento,
              clienteNome: 'Cliente Corporativo TKE',
              criadoPorId: finalCreatorId,
              responsavelTecnicoId: finalCreatorId,
              subcontratadoId: isSub ? finalCreatorId : null,
            })
            .returning();

          existingOrder = newOrder;
          targetServiceOrderId = newOrder.id;
        }
      }
    }

    const finalServiceOrderId = targetServiceOrderId || existingOrder?.id;
    if (!finalServiceOrderId) {
      throw new Error('Não foi possível associar a Ordem de Serviço para gravação da PT.');
    }

    // 3. Gera código sequencial/formatado da PT garantindo unicidade
    const anoAtual = new Date().getFullYear();
    let codigoPT = `PT-${anoAtual}-${Math.floor(1000 + Math.random() * 9000)}`;
    const [existingPt] = await db
      .select({ id: workPermits.id })
      .from(workPermits)
      .where(eq(workPermits.codigo, codigoPT))
      .limit(1);

    if (existingPt) {
      codigoPT = `PT-${anoAtual}-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    }

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
        criadoPorId: finalCreatorId,
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
    if (existingOrder) {
      try {
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
      } catch (updateErr) {
        console.warn('[submitPtReparoAction] Aviso ao atualizar status da OS:', updateErr);
      }
    }

    // 7. Registra no Histórico de Auditoria da OS de forma resiliente
    try {
      await db.insert(serviceOrderHistory).values({
        serviceOrderId: finalServiceOrderId,
        alteradoPorId: creatorId || null,
        statusAnterior: existingOrder?.status || 'PENDENTE',
        statusNovo: novoStatusOS,
        acao: isFinalizada ? 'FINALIZACAO_PT' : 'EMISSAO_PT',
        descricao: `Permissão de Trabalho (${codigoPT}) emitida com sucesso e assinaturas auditadas registradas.`,
        alteracoes: {
          ptCodigo: { antes: null, depois: codigoPT },
          statusOS: { antes: existingOrder?.status || null, depois: novoStatusOS },
        },
      });
    } catch (historyErr) {
      console.warn('[submitPtReparoAction] Aviso ao registrar histórico:', historyErr);
    }

    revalidatePath(`/dashboard/reparo/${targetServiceOrderId}`);
    revalidatePath('/dashboard/reparo');
    revalidatePath('/dashboard/reparo/pt');
    revalidatePath('/dashboard/reparo/acompanhamento');

    return {
      success: true,
      workPermitId: insertedPermit.id,
      codigo: insertedPermit.codigo,
    };
  } catch (error) {
    console.error('[submitPtReparoAction] Erro ao gravar Permissão de Trabalho:', error);
    const errorDetails = error instanceof Error ? error.message : 'Erro interno';
    return {
      success: false,
      error: `Erro ao salvar a Permissão de Trabalho no banco de dados: ${errorDetails}`,
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
 * Busca todas as PTs/APRs emitidas (Subcontratados somente visualizam as próprias; Admins visualizam todas)
 */
export async function getPtReparosAction() {
  try {
    const user = await getSessionUser();
    const { isSuperAdmin } = await import('@/lib/permissions');
    const isAdmin = isSuperAdmin(user);
    const isSubcontratado = !isAdmin && user?.cargo === 'SUBCONTRATADO';

    let permits;
    if (isSubcontratado && user?.id) {
      // Subcontratados somente podem visualizar as próprias APRs preenchidas ou atribuídas
      permits = await db
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
        .leftJoin(serviceOrders, eq(workPermits.serviceOrderId, serviceOrders.id))
        .where(
          or(
            eq(workPermits.criadoPorId, user.id),
            eq(serviceOrders.subcontratadoId, user.id)
          )
        )
        .orderBy(desc(workPermits.createdAt));
    } else {
      // Gestores, Supervisores, OSH e Administradores visualizam todas
      permits = await db
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
    }

    // Busca cartas de conclusão anexadas às Ordens de Serviço vinculadas
    const soIds = permits
      .map((p) => p.serviceOrderId)
      .filter((id): id is string => Boolean(id));

    const cartasMap = new Map<string, { id: string; fileName: string; driveViewUrl: string; driveDownloadUrl: string | null }>();

    if (soIds.length > 0) {
      try {
        const cartas = await db
          .select({
            id: serviceOrderAttachments.id,
            serviceOrderId: serviceOrderAttachments.serviceOrderId,
            fileName: serviceOrderAttachments.fileName,
            driveViewUrl: serviceOrderAttachments.driveViewUrl,
            driveDownloadUrl: serviceOrderAttachments.driveDownloadUrl,
          })
          .from(serviceOrderAttachments)
          .where(
            and(
              inArray(serviceOrderAttachments.serviceOrderId, soIds),
              eq(serviceOrderAttachments.category, 'CARTA_CONCLUSAO')
            )
          );

        cartas.forEach((c) => {
          cartasMap.set(c.serviceOrderId, {
            id: c.id,
            fileName: c.fileName,
            driveViewUrl: c.driveViewUrl,
            driveDownloadUrl: c.driveDownloadUrl,
          });
        });
      } catch (err) {
        console.warn('[getPtReparosAction] Aviso ao buscar cartas de conclusão:', err);
      }
    }

    // Busca fotos de serviço anexadas às Ordens de Serviço vinculadas
    const fotosCountMap = new Map<string, number>();
    if (soIds.length > 0) {
      try {
        const fotosAtt = await db
          .select({
            id: serviceOrderAttachments.id,
            serviceOrderId: serviceOrderAttachments.serviceOrderId,
          })
          .from(serviceOrderAttachments)
          .where(
            and(
              inArray(serviceOrderAttachments.serviceOrderId, soIds),
              eq(serviceOrderAttachments.category, 'FOTO_SERVICO')
            )
          );

        fotosAtt.forEach((f) => {
          fotosCountMap.set(f.serviceOrderId, (fotosCountMap.get(f.serviceOrderId) || 0) + 1);
        });
      } catch (err) {
        console.warn('[getPtReparosAction] Aviso ao contar fotos de serviço:', err);
      }
    }

    const permitsWithCartasEFotos = permits.map((p) => {
      const cartaFromAttachment = p.serviceOrderId ? cartasMap.get(p.serviceOrderId) : null;
      const cartaFromDados = (p.dadosCompletos as any)?.cartaConclusao || null;

      const fotosFromDados = ((p.dadosCompletos as any)?.fotosServico as any[]) || [];
      const fotosFromAtt = p.serviceOrderId ? (fotosCountMap.get(p.serviceOrderId) || 0) : 0;
      const totalFotos = Math.max(fotosFromDados.length, fotosFromAtt);

      return {
        ...p,
        cartaConclusao: cartaFromAttachment || cartaFromDados || null,
        totalFotos,
      };
    });

    return { success: true, permits: permitsWithCartasEFotos, isAdmin, isSubcontratado, currentUser: user };
  } catch (error) {
    console.error('[getPtReparosAction] Erro ao buscar PTs:', error);
    return { success: false, permits: [], isAdmin: false, isSubcontratado: false };
  }
}

/**
 * Busca dados completos de uma PT pelo ID (com validação estrita para subcontratados)
 */
export async function getPtReparoByIdAction(id: string) {
  try {
    const user = await getSessionUser();
    const { isSuperAdmin } = await import('@/lib/permissions');
    const isAdmin = isSuperAdmin(user);
    const isSubcontratado = !isAdmin && user?.cargo === 'SUBCONTRATADO';

    const [result] = await db
      .select({
        permit: workPermits,
        subcontratadoId: serviceOrders.subcontratadoId,
      })
      .from(workPermits)
      .leftJoin(serviceOrders, eq(workPermits.serviceOrderId, serviceOrders.id))
      .where(eq(workPermits.id, id))
      .limit(1);

    if (!result) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.' };
    }

    // Restrição: Subcontratados somente podem visualizar as próprias APRs
    if (isSubcontratado && user?.id) {
      const isOwner =
        result.permit.criadoPorId === user.id ||
        result.subcontratadoId === user.id;

      if (!isOwner) {
        return {
          success: false,
          error: 'Acesso negado: Subcontratados somente podem visualizar as próprias APRs preenchidas.',
        };
      }
    }

    return { success: true, permit: result.permit, isAdmin, isSubcontratado };
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
 * Atualiza integralmente uma Permissão de Trabalho em andamento (Edição completa do formulário)
 */
export async function updatePtReparoFullAction(
  id: string,
  data: PtReparoFormData
): Promise<SubmitPtReparoResult> {
  try {
    // 1. Validação estrita via Zod
    const validation = ptReparoSchema.safeParse(data);
    if (!validation.success) {
      const fieldErrors = validation.error.flatten().fieldErrors;
      return {
        success: false,
        error: 'Existem campos obrigatórios não preenchidos ou inválidos.',
        issues: fieldErrors,
      };
    }

    const validatedData = validation.data;
    const user = await getSessionUser();
    const { isSuperAdmin } = await import('@/lib/permissions');
    const isAdmin = isSuperAdmin(user);

    // 2. Busca a PT existente no banco
    const [existing] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, id))
      .limit(1);

    if (!existing) {
      return { success: false, error: 'Permissão de Trabalho não encontrada no sistema.' };
    }

    // 3. Validação de permissões: se não for admin, só pode editar se a PT ainda estiver em andamento
    const isPtEmAndamento = existing.status !== 'FINALIZADA' && (existing.status as string) !== 'CONCLUIDO';
    if (!isAdmin && !isPtEmAndamento) {
      return {
        success: false,
        error: 'Esta APR já foi concluída/finalizada e não permite mais edições operacionais.',
      };
    }

    // Se for subcontratado, verifica se a PT pertence a ele ou à sua OS
    if (!isAdmin && user?.cargo === 'SUBCONTRATADO' && user.id) {
      let isAuthorized = existing.criadoPorId === user.id;
      if (!isAuthorized && existing.serviceOrderId) {
        const [order] = await db
          .select({ subcontratadoId: serviceOrders.subcontratadoId })
          .from(serviceOrders)
          .where(eq(serviceOrders.id, existing.serviceOrderId))
          .limit(1);
        if (order?.subcontratadoId === user.id) {
          isAuthorized = true;
        }
      }
      if (!isAuthorized) {
        return {
          success: false,
          error: 'Acesso negado: Você só pode editar as próprias APRs em andamento.',
        };
      }
    }

    // 4. Preserva eventuais anexos e cartas de conclusão já existentes caso não venham no payload
    const mergedDadosCompletos: PtReparoFormData = {
      ...validatedData,
      cartaConclusao: validatedData.cartaConclusao || (existing.dadosCompletos as any)?.cartaConclusao,
    };

    // 5. Atualiza o registro no Neon
    await db
      .update(workPermits)
      .set({
        contratoOrcamento: validatedData.contratoOrcamento,
        equipamento: validatedData.equipamento,
        tipoMaoDeObra: validatedData.tipoMaoDeObra,
        tipoEquipamento: validatedData.tipoEquipamento,
        classificacaoReparo: validatedData.classificacaoReparo,
        trabalhoEmAltura: validatedData.trabalhoEmAltura,
        assinaturaSupervisao: validatedData.assinaturaSupervisao || null,
        assinaturaInicio: validatedData.inicioServico.emitenteAssinatura,
        assinaturaTermino: validatedData.terminoServico?.emitenteAssinatura || existing.assinaturaTermino,
        dadosCompletos: mergedDadosCompletos,
        updatedAt: new Date(),
      })
      .where(eq(workPermits.id, id));

    // 6. Registra no histórico da OS se houver OS vinculada
    if (existing.serviceOrderId) {
      try {
        await db.insert(serviceOrderHistory).values({
          serviceOrderId: existing.serviceOrderId,
          alteradoPorId: user?.id || null,
          acao: 'EDICAO_PT',
          descricao: `APR em andamento (${existing.codigo}) foi editada e atualizada no sistema por ${user?.nome || 'Usuário'}.`,
        });
      } catch (histErr) {
        console.warn('[updatePtReparoFullAction] Aviso ao gravar histórico:', histErr);
      }
    }

    revalidatePath('/dashboard/reparo/pt');
    revalidatePath('/dashboard/reparo');
    revalidatePath('/dashboard/subcontratado/historico');

    return {
      success: true,
      workPermitId: existing.id,
      codigo: existing.codigo,
    };
  } catch (error) {
    console.error('[updatePtReparoFullAction] Erro ao atualizar PT:', error);
    return {
      success: false,
      error: 'Erro interno ao atualizar os dados da Permissão de Trabalho.',
    };
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

export interface ConcluirTerminoPayload {
  workPermitId: string;
  dataHoraTermino: string;
  emitenteNome: string;
  emitenteAssinaturaBase64: string;
  geolocalizacao?: { latitude: number; longitude: number; accuracy?: number } | null;
  observacoesFinais?: string;
}

/**
 * Registra o Término do Serviço de Reparo (Item 14) e atualiza o status para CONCLUIDO
 */
export async function concluirTerminoPtReparoAction(payload: ConcluirTerminoPayload) {
  try {
    if (!payload.workPermitId) {
      return { success: false, error: 'ID da Permissão de Trabalho é obrigatório.' };
    }
    if (!payload.emitenteNome?.trim()) {
      return { success: false, error: 'Nome do responsável pelo término é obrigatório.' };
    }
    if (!payload.emitenteAssinaturaBase64?.trim()) {
      return { success: false, error: 'Assinatura digital do término é obrigatória.' };
    }

    const [permit] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, payload.workPermitId))
      .limit(1);

    if (!permit) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.' };
    }

    const sessionUser = await getSessionUser();

    const assinaturaTerminoData: DigitalSignature = {
      nome: payload.emitenteNome.trim(),
      cargo: 'TECNICO',
      assinaturaBase64: payload.emitenteAssinaturaBase64,
      timestamp: new Date().toISOString(),
      geolocalizacao: payload.geolocalizacao || null,
    };

    const finalDataTermino = payload.dataHoraTermino || new Date().toISOString().slice(0, 16);

    const updatedDadosCompletos: PtReparoFormData = {
      ...permit.dadosCompletos,
      terminoServico: {
        dataHoraTermino: finalDataTermino,
        emitenteAssinatura: assinaturaTerminoData,
      },
      observacoesGerais: payload.observacoesFinais?.trim()
        ? `${permit.dadosCompletos.observacoesGerais || ''}\n[Término ${new Date().toLocaleDateString('pt-BR')}]: ${payload.observacoesFinais.trim()}`.trim()
        : permit.dadosCompletos.observacoesGerais,
    };

    // 1. Atualiza a PT no banco de dados para CONCLUIDO
    await db
      .update(workPermits)
      .set({
        status: 'CONCLUIDO',
        assinaturaTermino: assinaturaTerminoData,
        dadosCompletos: updatedDadosCompletos,
        updatedAt: new Date(),
      })
      .where(eq(workPermits.id, payload.workPermitId));

    // 2. Atualiza a Ordem de Serviço vinculada se existir
    if (permit.serviceOrderId) {
      await db
        .update(serviceOrders)
        .set({
          status: 'CONCLUIDA',
          dataConclusao: new Date(finalDataTermino),
          updatedAt: new Date(),
        })
        .where(eq(serviceOrders.id, permit.serviceOrderId));

      await db.insert(serviceOrderHistory).values({
        serviceOrderId: permit.serviceOrderId,
        alteradoPorId: sessionUser?.id || null,
        statusAnterior: 'EM_EXECUCAO',
        statusNovo: 'CONCLUIDA',
        acao: 'FINALIZACAO_PT',
        descricao: `Término do serviço de reparo concluído e assinado digitalmente por ${payload.emitenteNome}. Permissão e OS finalizadas.`,
        alteracoes: {
          ptStatus: { antes: permit.status, depois: 'CONCLUIDO' },
          dataTermino: { antes: null, depois: finalDataTermino },
        },
      });
    }

    revalidatePath('/dashboard/reparo/pt');
    revalidatePath('/dashboard/reparo');
    if (permit.serviceOrderId) {
      revalidatePath(`/dashboard/reparo/${permit.serviceOrderId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[concluirTerminoPtReparoAction] Erro ao registrar término:', error);
    return { success: false, error: 'Erro ao registrar término do serviço no banco de dados.' };
  }
}

/**
 * Server Action para anexar a Carta de Conclusão / Aceite do Cliente diretamente a uma PT
 */
export async function anexarCartaConclusaoDirectAction(formData: FormData) {
  try {
    const workPermitId = formData.get('workPermitId') as string;
    const file = formData.get('file') as File;

    if (!workPermitId || !file) {
      return { success: false, error: 'Identificador da PT ou arquivo não informado.' };
    }

    const [permit] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, workPermitId))
      .limit(1);

    if (!permit) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.' };
    }

    let attachmentId = '';
    let driveViewUrl = '';
    let driveDownloadUrl: string | null = null;

    // 1. Se a PT estiver vinculada a uma OS, tenta anexar via OS
    if (permit.serviceOrderId) {
      try {
        const { uploadAttachmentsAction } = await import('@/actions/attachmentActions');
        const uploadFormData = new FormData();
        uploadFormData.append('serviceOrderId', permit.serviceOrderId);
        uploadFormData.append('category', 'CARTA_CONCLUSAO');
        uploadFormData.append('files', file);

        const uploadRes = await uploadAttachmentsAction(uploadFormData);
        if (uploadRes.success && uploadRes.attachments && uploadRes.attachments.length > 0) {
          const att = uploadRes.attachments[0];
          attachmentId = att.id;
          driveViewUrl = att.driveViewUrl;
          driveDownloadUrl = att.driveDownloadUrl || null;
        }
      } catch (osErr) {
        console.warn('[anexarCartaConclusaoDirectAction] Aviso no upload da OS, usando armazenamento resiliente:', osErr);
      }
    }

    // 2. Fallback resiliente: grava via uploadFileToDrive (Google Drive / Banco Neon)
    if (!driveViewUrl) {
      const { uploadFileToDrive, getOrCreateFolder } = await import('@/lib/google-drive');
      const targetFolderId = await getOrCreateFolder('CARTAS_CONCLUSAO');
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);
      const driveUpload = await uploadFileToDrive({
        buffer: fileBuffer,
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        targetFolderId,
      });
      attachmentId = driveUpload.fileId;
      driveViewUrl = driveUpload.webViewLink;
      driveDownloadUrl = driveUpload.webContentLink || null;
    }

    // Se a URL for um Data URI inline (modo resiliente para produção/serverless),
    // apontamos driveViewUrl para a rota oficial da API pública /api/pt/[codigo]/carta-conclusao
    // e guardamos o rawBase64 no banco de dados para entrega instantânea
    const isDataUri = driveViewUrl.startsWith('data:');
    const apiPublicUrl = `/api/pt/${permit.codigo}/carta-conclusao`;

    const fotoBase64Raw = (formData.get('fotoBase64') as string) || '';
    const observacoes = (formData.get('observacoes') as string) || '';
    const tecnicoNome = (formData.get('tecnicoNome') as string) || '';

    const { resolveImageToDataUri } = await import('@/lib/pdfImageResolver');
    let resolvedImageBase64 = await resolveImageToDataUri(fotoBase64Raw);
    if (!resolvedImageBase64 && driveViewUrl) {
      resolvedImageBase64 = await resolveImageToDataUri(driveViewUrl);
    }

    const cartaObj = {
      id: attachmentId || `carta_${Date.now()}`,
      fileName: file.name,
      driveViewUrl: isDataUri ? apiPublicUrl : driveViewUrl,
      driveDownloadUrl: isDataUri ? apiPublicUrl : (driveDownloadUrl || driveViewUrl),
      enviadoEm: new Date().toISOString(),
      rawBase64: resolvedImageBase64 || (isDataUri ? driveViewUrl : undefined),
      tecnicoNome: tecnicoNome || (permit.dadosCompletos as any)?.terminoServico?.emitenteAssinatura?.nome || '',
      dataHoraTermino: new Date().toISOString(),
      observacoes: observacoes || (permit.dadosCompletos as any)?.terminoServico?.observacoesGerais || '',
    };

    // 3. Atualiza os dados estruturados da PT com a carta de conclusão
    const updatedDados = {
      ...permit.dadosCompletos,
      cartaConclusao: cartaObj,
    };

    await db
      .update(workPermits)
      .set({
        dadosCompletos: updatedDados as any,
        updatedAt: new Date(),
      })
      .where(eq(workPermits.id, workPermitId));

    revalidatePath('/dashboard/reparo/pt');

    return {
      success: true,
      carta: cartaObj,
    };
  } catch (error) {
    console.error('[anexarCartaConclusaoDirectAction] Erro ao anexar carta de conclusão:', error);
    return { success: false, error: 'Erro interno ao processar o envio da carta de conclusão.' };
  }
}

/**
 * Server Action para importar Carta de Conclusão Digital (PDF) e colher o preenchimento
 * do Termo de Ciência e Recebimento com a assinatura digital do cliente.
 * REGRA OBRIGATÓRIA: Disponível SOMENTE quando a APR estiver em andamento ou concluída.
 */
export async function salvarCartaConclusaoDigitalAction(formData: FormData) {
  try {
    const workPermitId = formData.get('workPermitId') as string;
    const nomeCliente = (formData.get('nomeCliente') as string) || '';
    const cpfCliente = (formData.get('cpfCliente') as string) || '';
    const funcaoCliente = (formData.get('funcaoCliente') as string) || '';
    const dataRecebimento = (formData.get('dataRecebimento') as string) || new Date().toLocaleDateString('pt-BR');
    const telefoneCliente = (formData.get('telefoneCliente') as string) || '';
    const assinaturaClienteBase64 = (formData.get('assinaturaClienteBase64') as string) || '';
    const tecnicoNome = (formData.get('tecnicoNome') as string) || '';
    const observacoes = (formData.get('observacoes') as string) || '';
    const pdfFile = formData.get('pdfFile') as File | null;

    // Campos adicionais editáveis do Modelo Digital TKE
    const tkeCnpj = (formData.get('tkeCnpj') as string) || '';
    const tkeEndereco = (formData.get('tkeEndereco') as string) || '';
    const tkeCidadeUf = (formData.get('tkeCidadeUf') as string) || '';
    const clienteNomeInput = (formData.get('clienteNome') as string) || '';
    const clienteEndereco = (formData.get('clienteEndereco') as string) || '';
    const clienteCidadeUf = (formData.get('clienteCidadeUf') as string) || '';
    const filial = (formData.get('filial') as string) || '';
    const orcamentoInput = (formData.get('orcamento') as string) || '';
    const contratoInput = (formData.get('contrato') as string) || '';
    const equipamentosInput = (formData.get('equipamentos') as string) || '';
    const servicosJson = (formData.get('servicosJson') as string) || '';

    let servicosList: any[] = [];
    if (servicosJson) {
      try {
        servicosList = JSON.parse(servicosJson);
      } catch (e) {
        console.warn('[salvarCartaConclusaoDigitalAction] Falha ao fazer parse de servicosJson:', e);
      }
    }

    if (!workPermitId) {
      return { success: false, error: 'Identificador da PT não informado.' };
    }

    if (!nomeCliente || nomeCliente.trim().length === 0) {
      return { success: false, error: 'O Nome Completo do cliente/responsável é obrigatório.' };
    }

    if (!assinaturaClienteBase64 || !assinaturaClienteBase64.includes('base64')) {
      return { success: false, error: 'A Assinatura Digital do cliente é obrigatória.' };
    }

    const [permit] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, workPermitId))
      .limit(1);

    if (!permit) {
      return { success: false, error: 'Permissão de Trabalho não encontrada.' };
    }

    // REGRA DE NEGÓCIO: Somente em serviços que a APR já estiver em andamento ou concluída
    const status = permit.status as string;
    const isEmAndamento = status === 'EM_ANDAMENTO' || status === 'EM_EXECUCAO';
    const isConcluido = status === 'CONCLUIDO' || status === 'FINALIZADA';

    if (!isEmAndamento && !isConcluido) {
      return {
        success: false,
        error: 'A Carta de Conclusão Digital só pode ser emitida e assinada em serviços cuja APR já estiver em andamento ou concluída.',
      };
    }

    // Processa o buffer do PDF importado (se enviado)
    let pdfOriginalBuffer: Buffer | undefined = undefined;
    let fileName = `Carta_Conclusao_Digital_${permit.codigo}.pdf`;

    if (pdfFile && typeof pdfFile.arrayBuffer === 'function' && pdfFile.size > 0) {
      const arrayBuffer = await pdfFile.arrayBuffer();
      pdfOriginalBuffer = Buffer.from(arrayBuffer);
      fileName = pdfFile.name.endsWith('.pdf') ? pdfFile.name : `${pdfFile.name}.pdf`;
    }

    // Importa dinamicamente a biblioteca de geração de PDF digital
    const { gerarCartaConclusaoDigitalPdf } = await import('@/lib/cartaConclusaoDigital');

    const finalPdfBuffer = await gerarCartaConclusaoDigitalPdf({
      codigoPT: permit.codigo,
      contratoOrcamento: contratoInput.trim() || permit.contratoOrcamento,
      equipamento: equipamentosInput.trim() || permit.equipamento,
      orcamento: orcamentoInput.trim() || (permit.dadosCompletos as any)?.ordemServico?.orcamento || permit.contratoOrcamento,
      servicoDescricao:
        (permit.dadosCompletos as any)?.dadosGerais?.servicosExecutados ||
        permit.classificacaoReparo ||
        'SERVIÇOS DE REPARO E MANUTENÇÃO',
      tkeCnpj: tkeCnpj.trim(),
      tkeEndereco: tkeEndereco.trim(),
      tkeCidadeUf: tkeCidadeUf.trim(),
      clienteNome: clienteNomeInput.trim() || nomeCliente.trim(),
      clienteEndereco: clienteEndereco.trim(),
      clienteCidadeUf: clienteCidadeUf.trim(),
      filial: filial.trim(),
      servicos: servicosList,
      nomeCliente: nomeCliente.trim(),
      cpfCliente: cpfCliente.trim(),
      funcaoCliente: funcaoCliente.trim(),
      dataRecebimento: dataRecebimento.trim(),
      telefoneCliente: telefoneCliente.trim(),
      assinaturaClienteBase64,
      tecnicoNome: tecnicoNome || (permit.dadosCompletos as any)?.terminoServico?.emitenteAssinatura?.nome || '',
      observacoes,
      pdfOriginalBuffer,
    });

    let attachmentId = '';
    let driveViewUrl = '';
    let driveDownloadUrl: string | null = null;

    // 1. Tenta vincular como anexo da OS se existir
    if (permit.serviceOrderId) {
      try {
        const { uploadAttachmentsAction } = await import('@/actions/attachmentActions');
        const pdfBlob = new Blob([new Uint8Array(finalPdfBuffer)], { type: 'application/pdf' });
        const finalFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        const uploadFormData = new FormData();
        uploadFormData.append('serviceOrderId', permit.serviceOrderId);
        uploadFormData.append('category', 'CARTA_CONCLUSAO');
        uploadFormData.append('files', finalFile);

        const uploadRes = await uploadAttachmentsAction(uploadFormData);
        if (uploadRes.success && uploadRes.attachments && uploadRes.attachments.length > 0) {
          const att = uploadRes.attachments[0];
          attachmentId = att.id;
          driveViewUrl = att.driveViewUrl;
          driveDownloadUrl = att.driveDownloadUrl || null;
        }
      } catch (osErr) {
        console.warn('[salvarCartaConclusaoDigitalAction] Falha no upload da OS, usando armazenamento resiliente:', osErr);
      }
    }

    // 2. Se não conseguiu pela OS, tenta upload no Google Drive
    if (!driveViewUrl) {
      try {
        const { uploadFileToDrive, getOrCreateFolder } = await import('@/lib/google-drive');
        const targetFolderId = await getOrCreateFolder('CARTAS_CONCLUSAO');
        const driveUpload = await uploadFileToDrive({
          buffer: finalPdfBuffer,
          fileName,
          mimeType: 'application/pdf',
          targetFolderId,
        });
        attachmentId = driveUpload.fileId;
        driveViewUrl = driveUpload.webViewLink;
        driveDownloadUrl = driveUpload.webContentLink || null;
      } catch (driveErr) {
        console.warn('[salvarCartaConclusaoDigitalAction] Falha no Drive, usando armazenamento Base64 inline:', driveErr);
      }
    }

    const apiPublicUrl = `/api/pt/${permit.codigo}/carta-conclusao`;
    const finalBase64DataUri = `data:application/pdf;base64,${finalPdfBuffer.toString('base64')}`;

    const cartaObj = {
      id: attachmentId || `carta_digital_${Date.now()}`,
      fileName,
      driveViewUrl: driveViewUrl || apiPublicUrl,
      driveDownloadUrl: driveDownloadUrl || apiPublicUrl,
      enviadoEm: new Date().toISOString(),
      rawBase64: finalBase64DataUri,
      tipo: 'DIGITAL',
      clienteNome: nomeCliente.trim(),
      clienteCpf: cpfCliente.trim(),
      clienteFuncao: funcaoCliente.trim(),
      clienteData: dataRecebimento.trim(),
      clienteTelefone: telefoneCliente.trim(),
      clienteAssinatura: assinaturaClienteBase64,
      tecnicoNome: tecnicoNome || (permit.dadosCompletos as any)?.terminoServico?.emitenteAssinatura?.nome || '',
      dataHoraTermino: new Date().toISOString(),
      observacoes: observacoes || (permit.dadosCompletos as any)?.terminoServico?.observacoesGerais || '',
    };

    // 3. Atualiza os dados da PT com a nova carta
    const updatedDados = {
      ...permit.dadosCompletos,
      cartaConclusao: cartaObj,
    };

    await db
      .update(workPermits)
      .set({
        dadosCompletos: updatedDados as any,
        updatedAt: new Date(),
      })
      .where(eq(workPermits.id, workPermitId));

    revalidatePath('/dashboard/reparo/pt');

    return {
      success: true,
      carta: cartaObj,
    };
  } catch (error: any) {
    console.error('[salvarCartaConclusaoDigitalAction] Erro ao salvar Carta Digital:', error);
    return {
      success: false,
      error: error?.message || 'Erro interno ao processar e assinar a Carta de Conclusão Digital.',
    };
  }
}

