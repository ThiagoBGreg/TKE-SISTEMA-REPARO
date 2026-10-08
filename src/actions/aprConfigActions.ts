'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { aprConfigs, type AprRiskCategoryConfig, type AprEpiConfig } from '@/db/schema';

export const DEFAULT_APR_CATEGORIES: AprRiskCategoryConfig[] = [
  {
    id: 'ALTURA',
    titulo: '7.1 Trabalho em Altura (NR-35)',
    descricao: 'Atividades com risco de queda em altura igual ou superior a 2,00m do nível inferior.',
    ativo: true,
    itens: [
      { id: '7.1', label: 'Há sinalizações instaladas nos pavimentos?', obrigatorio: true, ativo: true },
      { id: '7.2', label: 'Existem dispositivos para ancoragem disponíveis?', obrigatorio: true, ativo: true },
      { id: '7.3', label: 'Andaime tipo mão francesa/tubular em boas condições?', obrigatorio: true, ativo: true },
      { id: '7.4', label: 'Existem proteções coletivas contra quedas na casa de máquinas?', obrigatorio: true, ativo: true },
      { id: '7.5', label: 'O ambiente de trabalho oferece condições seguras no entorno?', obrigatorio: true, ativo: true },
    ],
  },
  {
    id: 'ICAMENTO',
    titulo: '7.2 Içamento de Materiais e Cargas (NR-11 / NR-12)',
    descricao: 'Movimentação vertical e horizontal de componentes mecânicos pesados (motores, cabos, contra-peso).',
    ativo: true,
    itens: [
      { id: '7.6', label: 'Equipamentos de içamento adequados à carga?', obrigatorio: true, ativo: true },
      { id: '7.7', label: 'Acessórios de içamento disponíveis são adequados?', obrigatorio: true, ativo: true },
      { id: '7.8', label: 'Ganchos atestados e com marcação de carga legível?', obrigatorio: true, ativo: true },
      { id: '7.9', label: 'Há redundância na amarração da cabine/cabos?', obrigatorio: true, ativo: true },
      { id: '7.10', label: 'Área de projeção do içamento devidamente isolada e sinalizada?', obrigatorio: true, ativo: true },
      { id: '7.11', label: 'Há recursos de comunicação claros entre os membros da equipe?', obrigatorio: true, ativo: true },
    ],
  },
  {
    id: 'ELETRICA',
    titulo: '7.3 Circuitos Elétricos e Bloqueio LOTO (NR-10)',
    descricao: 'Intervenções em quadros elétricos de força, manobras, botoeiras e fiações energizadas.',
    ativo: true,
    itens: [
      { id: '7.12', label: 'Fiações elétricas isoladas na casa de máquinas/caixa?', obrigatorio: true, ativo: true },
      { id: '7.13', label: 'Conferido aterramento e disjuntor DR no quadro de força?', obrigatorio: true, ativo: true },
      { id: '7.14', label: 'Trabalhadores possuem kit bloqueio elétrico (LOTO)?', obrigatorio: true, ativo: true },
      { id: '7.15', label: 'Atividade exige bloqueio elétrico e teste de ausência de tensão?', obrigatorio: true, ativo: true },
      { id: '7.16', label: 'Há infiltrações (casa de máquinas, caixa de corrida ou poço)?', obrigatorio: true, ativo: true },
    ],
  },
  {
    id: 'QUENTE',
    titulo: '7.4 Trabalho a Quente e Inflamáveis (NR-18 / NR-34)',
    descricao: 'Operações de solda, lixamento, corte ou maçarico com desprendimento de fagulhas.',
    ativo: true,
    itens: [
      { id: '7.17', label: 'Local de trabalho está devidamente isolado com biombo antichama?', obrigatorio: true, ativo: true },
      { id: '7.18', label: 'Livre de materiais combustíveis que possam causar princípio de incêndio?', obrigatorio: true, ativo: true },
      { id: '7.19', label: 'Equipamentos de combate a incêndio (extintores) próximos ao local?', obrigatorio: true, ativo: true },
      { id: '7.20', label: 'Trabalhadores possuem capacitação técnica comprovada em trabalho a quente?', obrigatorio: true, ativo: true },
    ],
  },
  {
    id: 'CONFINADO',
    titulo: '7.5 Espaço Confinado e Poço (NR-33)',
    descricao: 'Acesso ao fundo do poço, topo de cabine ou áreas de ventilação restrita.',
    ativo: true,
    itens: [
      { id: '7.21', label: 'Poço limpo, iluminado e isento de gases ou poeiras tóxicas?', obrigatorio: true, ativo: true },
      { id: '7.22', label: 'Botoneira de inspeção e chave de emergência do poço testadas?', obrigatorio: true, ativo: true },
      { id: '7.23', label: 'Escada de acesso ao poço instalada e segura?', obrigatorio: true, ativo: true },
    ],
  },
];

export const DEFAULT_EPIS: AprEpiConfig[] = [
  { id: 'capacete', nome: 'Capacete de Segurança com Jugular', categoria: 'BASICO', obrigatorio: true, ativo: true },
  { id: 'oculos', nome: 'Óculos de Proteção Contra Impacto', categoria: 'BASICO', obrigatorio: true, ativo: true },
  { id: 'bota', nome: 'Bota de Segurança com Biqueira de Composite', categoria: 'BASICO', obrigatorio: true, ativo: true },
  { id: 'luvas_vaqueta', nome: 'Luvas de Vaqueta / Mista', categoria: 'BASICO', obrigatorio: true, ativo: true },
  { id: 'protetor_auricular', nome: 'Protetor Auditivo (Plug / Concha)', categoria: 'BASICO', obrigatorio: true, ativo: true },
  { id: 'cinto_paraquedista', nome: 'Cinto Tipo Paraquedista c/ Ponto Dorsal', categoria: 'ALTURA', obrigatorio: true, ativo: true },
  { id: 'talabarte_duplo', nome: 'Talabarte Duplo com Absorvedor de Energia', categoria: 'ALTURA', obrigatorio: true, ativo: true },
  { id: 'trava_quedas', nome: 'Trava-quedas para Cabo de Aço / Corda', categoria: 'ALTURA', obrigatorio: true, ativo: true },
  { id: 'luvas_alta_tensao', nome: 'Luvas Isolantes de Borracha Alta Tensão', categoria: 'ELETRICA', obrigatorio: false, ativo: true },
  { id: 'mascara_solda', nome: 'Máscara / Escudo de Solda com Filtro', categoria: 'QUENTE', obrigatorio: false, ativo: true },
  { id: 'avental_raspa', nome: 'Avental e Perneiras de Raspa de Couro', categoria: 'QUENTE', obrigatorio: false, ativo: true },
];

export const DEFAULT_REGRAS_DE_OURO: string[] = [
  '1. Nunca realize trabalho em altura sem ancoragem segura de 100% do tempo.',
  '2. Bloqueie, etiquete e teste a ausência de tensão elétrica antes de tocar em condutores (LOTO).',
  '3. Teste os freios e dispositivos de segurança do elevador antes de adentrar a caixa ou poço.',
  '4. Mantenha os pavimentos sinalizados e barreiras físicas impedindo o acesso de terceiros.',
  '5. Utilize sempre todos os EPIs obrigatórios exigidos para o tipo de reparo.',
  '6. Em caso de condições inseguras ou imprevistos, paralise imediatamente a atividade (Direito de Recusa).',
];

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
        atualizadoPorNome: 'Sistema TKE',
        updatedAt: new Date(),
      },
    };
  }
}

/**
 * Salva as alterações, textos modificados e novas opções da APR no banco de dados (Admin)
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
