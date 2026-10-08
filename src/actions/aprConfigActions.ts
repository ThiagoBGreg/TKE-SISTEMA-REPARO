'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { aprConfigs, type AprRiskCategoryConfig, type AprEpiConfig } from '@/db/schema';
import {
  DEFAULT_APR_CATEGORIES,
  DEFAULT_EPIS,
  DEFAULT_REGRAS_DE_OURO,
} from '@/lib/constants/aprConstants';

/**
 * Busca a configuração da APR salva no Neon Postgres ou inicializa o padrão corporativo
 */
export async function getAprConfigAction() {
  try {
    const [config] = await db
      .select()
      .from(aprConfigs)
      .where(eq(aprConfigs.id, 'default_apr_config'))
      .limit(1);

    if (config) {
      return { success: true, config };
    }

    // Se não existir, insere a configuração padrão oficial no Neon
    const [novaConfig] = await db
      .insert(aprConfigs)
      .values({
        id: 'default_apr_config',
        titulo: 'APR Corporativa - TKE Reparos',
        revisao: 'REV-2026.1',
        instrucoesGerais:
          'Esta Análise Preliminar de Risco (APR) é obrigatória para todos os reparos e intervenções técnicas da TKE. Deve ser preenchida e assinada antes do início de qualquer tarefa no equipamento.',
        regrasDeOuro: DEFAULT_REGRAS_DE_OURO,
        categoriasRisco: DEFAULT_APR_CATEGORIES,
        episDisponiveis: DEFAULT_EPIS,
        atualizadoPorNome: 'Administrador TKE',
      })
      .returning();

    return { success: true, config: novaConfig };
  } catch (error) {
    console.error('[getAprConfigAction] Erro ao carregar configuração da APR:', error);
    return {
      success: true,
      config: {
        id: 'default_apr_config',
        titulo: 'APR Corporativa - TKE Reparos',
        revisao: 'REV-2026.1',
        instrucoesGerais: 'Análise Preliminar de Riscos Padrão Corporativa TKE.',
        regrasDeOuro: DEFAULT_REGRAS_DE_OURO,
        categoriasRisco: DEFAULT_APR_CATEGORIES,
        episDisponiveis: DEFAULT_EPIS,
        atualizadoPorNome: 'Sistema',
        updatedAt: new Date(),
      },
    };
  }
}

/**
 * Salva e publica todas as alterações de perguntas, opções, EPIs e regras da APR (Uso Admin)
 */
export async function saveAprConfigAction(payload: {
  titulo: string;
  revisao: string;
  instrucoesGerais?: string;
  regrasDeOuro: string[];
  categoriasRisco: AprRiskCategoryConfig[];
  episDisponiveis: AprEpiConfig[];
  autorNome?: string;
}) {
  try {
    const [updated] = await db
      .insert(aprConfigs)
      .values({
        id: 'default_apr_config',
        titulo: payload.titulo.trim() || 'APR Corporativa - TKE Reparos',
        revisao: payload.revisao.trim() || 'REV-2026.1',
        instrucoesGerais: payload.instrucoesGerais?.trim(),
        regrasDeOuro: payload.regrasDeOuro,
        categoriasRisco: payload.categoriasRisco,
        episDisponiveis: payload.episDisponiveis,
        atualizadoPorNome: payload.autorNome || 'Administrador',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aprConfigs.id,
        set: {
          titulo: payload.titulo.trim(),
          revisao: payload.revisao.trim(),
          instrucoesGerais: payload.instrucoesGerais?.trim(),
          regrasDeOuro: payload.regrasDeOuro,
          categoriasRisco: payload.categoriasRisco,
          episDisponiveis: payload.episDisponiveis,
          atualizadoPorNome: payload.autorNome || 'Administrador',
          updatedAt: new Date(),
        },
      })
      .returning();

    revalidatePath('/dashboard/apr-config');
    revalidatePath('/dashboard/reparo/pt');

    return { success: true, config: updated };
  } catch (error) {
    console.error('[saveAprConfigAction] Erro ao salvar configuração da APR:', error);
    return { success: false, error: 'Erro ao salvar alterações da APR no banco de dados.' };
  }
}

/**
 * Restaura todas as perguntas, opções e textos da APR para o padrão de fábrica da TKE
 */
export async function resetAprConfigAction(autorNome?: string) {
  try {
    const [resetConfig] = await db
      .insert(aprConfigs)
      .values({
        id: 'default_apr_config',
        titulo: 'APR Corporativa - TKE Reparos',
        revisao: 'REV-2026.1 (Restaurada)',
        instrucoesGerais:
          'Esta Análise Preliminar de Risco (APR) é obrigatória para todos os reparos e intervenções técnicas da TKE. Deve ser preenchida e assinada antes do início de qualquer tarefa no equipamento.',
        regrasDeOuro: DEFAULT_REGRAS_DE_OURO,
        categoriasRisco: DEFAULT_APR_CATEGORIES,
        episDisponiveis: DEFAULT_EPIS,
        atualizadoPorNome: autorNome || 'Administrador',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aprConfigs.id,
        set: {
          titulo: 'APR Corporativa - TKE Reparos',
          revisao: 'REV-2026.1 (Restaurada)',
          instrucoesGerais:
            'Esta Análise Preliminar de Risco (APR) é obrigatória para todos os reparos e intervenções técnicas da TKE. Deve ser preenchida e assinada antes do início de qualquer tarefa no equipamento.',
          regrasDeOuro: DEFAULT_REGRAS_DE_OURO,
          categoriasRisco: DEFAULT_APR_CATEGORIES,
          episDisponiveis: DEFAULT_EPIS,
          atualizadoPorNome: autorNome || 'Administrador',
          updatedAt: new Date(),
        },
      })
      .returning();

    revalidatePath('/dashboard/apr-config');
    revalidatePath('/dashboard/reparo/pt');

    return { success: true, config: resetConfig };
  } catch (error) {
    console.error('[resetAprConfigAction] Erro ao restaurar APR:', error);
    return { success: false, error: 'Erro ao restaurar parâmetros padrão da APR.' };
  }
}
