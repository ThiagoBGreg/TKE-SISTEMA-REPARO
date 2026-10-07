'use server';

import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  serviceOrderAttachments,
  serviceOrderHistory,
  serviceOrders,
  users,
  workPermits,
} from '@/db/schema';

export interface SubcontractorFilters {
  search?: string;
  status?: string;
  month?: string; // Formato YYYY-MM
}

export interface SubcontractorHistoryItem {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  categoriaReparo?: string | null;
  status: string;
  prioridade: string;
  clienteNome?: string | null;
  clienteUnidade?: string | null;
  equipamentoNumero?: string | null;
  localizacao?: string | null;
  temCasaDeMaquinas?: boolean | null;
  valorServico?: string | null;
  statusFinanceiro: string;
  dataInicio?: Date | null;
  dataConclusao?: Date | null;
  createdAt: Date;
  permissaoTrabalho?: {
    id: string;
    codigo: string;
    status: string;
    trabalhoEmAltura: boolean;
  } | null;
  anexos: Array<{
    id: string;
    category: 'FOTO_SERVICO' | 'CARTA_CONCLUSAO';
    driveViewUrl: string;
    fileName: string;
  }>;
  historico: Array<{
    id: string;
    acao: string;
    descricao: string;
    statusNovo?: string | null;
    createdAt: Date;
  }>;
}

export interface SubcontractorMetrics {
  totalExecutado: number;
  emAnalise: number;
  concluidosAprovados: number;
  pagamentosLiberados: number;
  valorTotalLiquidar: number;
  valorTotalLiquidado: number;
}

/**
 * Busca o histórico de ordens de serviço vinculado exclusivamente ao Subcontratado autenticado
 */
export async function getSubcontractorHistory(
  subcontractorId: string,
  filters: SubcontractorFilters = {}
) {
  try {
    const conditions = [];

    // 1. Isolamento estrito de dados por Subcontratado
    conditions.push(eq(serviceOrders.subcontratadoId, subcontractorId));

    // 2. Filtro de pesquisa por texto (Código, Título, Equipamento ou Cliente)
    if (filters.search && filters.search.trim() !== '') {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(serviceOrders.codigo, searchTerm),
          ilike(serviceOrders.titulo, searchTerm),
          ilike(serviceOrders.clienteNome, searchTerm),
          ilike(serviceOrders.equipamentoNumero, searchTerm),
          ilike(serviceOrders.localizacao, searchTerm)
        )
      );
    }

    // 3. Filtro por Status
    if (filters.status && filters.status !== 'ALL') {
      conditions.push(eq(serviceOrders.status, filters.status as any));
    }

    // 4. Filtro por Mês (YYYY-MM)
    if (filters.month) {
      const startOfMonth = new Date(`${filters.month}-01T00:00:00Z`);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      conditions.push(
        and(
          gte(serviceOrders.createdAt, startOfMonth),
          lte(serviceOrders.createdAt, endOfMonth)
        )
      );
    }

    // Consulta das Ordens de Serviço
    const orders = await db
      .select()
      .from(serviceOrders)
      .where(and(...conditions))
      .orderBy(desc(serviceOrders.createdAt));

    // Busca detalhes complementares para cada OS (PT, Anexos, Linha do Tempo)
    const detailedOrders: SubcontractorHistoryItem[] = await Promise.all(
      orders.map(async (order) => {
        const [pt] = await db
          .select({
            id: workPermits.id,
            codigo: workPermits.codigo,
            status: workPermits.status,
            trabalhoEmAltura: workPermits.trabalhoEmAltura,
          })
          .from(workPermits)
          .where(eq(workPermits.serviceOrderId, order.id))
          .limit(1);

        const anexos = await db
          .select({
            id: serviceOrderAttachments.id,
            category: serviceOrderAttachments.category,
            driveViewUrl: serviceOrderAttachments.driveViewUrl,
            fileName: serviceOrderAttachments.fileName,
          })
          .from(serviceOrderAttachments)
          .where(eq(serviceOrderAttachments.serviceOrderId, order.id));

        const historico = await db
          .select({
            id: serviceOrderHistory.id,
            acao: serviceOrderHistory.acao,
            descricao: serviceOrderHistory.descricao,
            statusNovo: serviceOrderHistory.statusNovo,
            createdAt: serviceOrderHistory.createdAt,
          })
          .from(serviceOrderHistory)
          .where(eq(serviceOrderHistory.serviceOrderId, order.id))
          .orderBy(desc(serviceOrderHistory.createdAt));

        return {
          ...order,
          permissaoTrabalho: pt || null,
          anexos,
          historico,
        };
      })
    );

    // Cálculo das Métricas Rápidas
    const metrics: SubcontractorMetrics = detailedOrders.reduce(
      (acc, curr) => {
        acc.totalExecutado += 1;
        const valor = parseFloat(curr.valorServico || '0') || 0;

        if (curr.status === 'EM_EXECUCAO' || curr.status === 'EM_APROVACAO_OSH') {
          acc.emAnalise += 1;
        }

        if (curr.status === 'CONCLUIDA' || curr.status === 'VALIDACAO_TECNICA') {
          acc.concluidosAprovados += 1;
        }

        if (curr.statusFinanceiro === 'LIQUIDADO') {
          acc.pagamentosLiberados += 1;
          acc.valorTotalLiquidado += valor;
        } else if (curr.statusFinanceiro === 'APROVADO' || curr.statusFinanceiro === 'PENDENTE') {
          acc.valorTotalLiquidar += valor;
        }

        return acc;
      },
      {
        totalExecutado: 0,
        emAnalise: 0,
        concluidosAprovados: 0,
        pagamentosLiberados: 0,
        valorTotalLiquidar: 0,
        valorTotalLiquidado: 0,
      }
    );

    return {
      success: true,
      orders: detailedOrders,
      metrics,
    };
  } catch (error) {
    console.error('[getSubcontractorHistory] Erro ao buscar histórico:', error);
    return {
      success: false,
      orders: [],
      metrics: {
        totalExecutado: 0,
        emAnalise: 0,
        concluidosAprovados: 0,
        pagamentosLiberados: 0,
        valorTotalLiquidar: 0,
        valorTotalLiquidado: 0,
      },
    };
  }
}
