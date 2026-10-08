'use server';

import { desc, eq, or } from 'drizzle-orm';
import { db } from '@/db';
import { serviceOrders, users, workPermits } from '@/db/schema';
import type { AuthUser } from '@/types/auth';
import { isSuperAdmin } from '@/lib/permissions';

export interface PontoAcompanhamentoAPR {
  id: string;
  codigoPT: string;
  status: string;
  contratoOrcamento: string;
  equipamento: string;
  tipoMaoDeObra: string;
  empresaContratada?: string | null;
  classificacaoReparo: string;
  trabalhoEmAltura: boolean;
  serviceOrderId?: string | null;
  serviceOrderCodigo?: string | null;
  clienteNome?: string | null;
  clienteUnidade?: string | null;
  
  // Quem preencheu e assinou
  quemPreencheuNome: string;
  quemPreencheuCargo?: string | null;
  quemPreencheuEmail?: string | null;
  usuarioCriadorNome?: string | null;
  usuarioCriadorCargo?: string | null;
  
  // Dados de Geolocalização
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  dataHoraPreenchimento: string;
  
  // Dados de Término (se houver)
  temTermino: boolean;
  terminoNome?: string | null;
  terminoDataHora?: string | null;
  terminoLatitude?: number | null;
  terminoLongitude?: number | null;
}

export interface GetAcompanhamentoResult {
  success: boolean;
  pontos: PontoAcompanhamentoAPR[];
  totalSemCoordenadas: number;
  isAdmin: boolean;
  isSubcontratado: boolean;
  error?: string;
}

/**
 * Lê o usuário autenticado a partir dos cookies
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
 * Retorna todos os serviços com APR preenchida e sua geolocalização.
 * - Subcontratados somente visualizam suas próprias APRs.
 * - Administradores e Gestores visualizam todos os serviços mapeados.
 */
export async function getAcompanhamentoServicosAction(): Promise<GetAcompanhamentoResult> {
  try {
    const user = await getSessionUser();
    const isAdmin = isSuperAdmin(user);
    const isSubcontratado = !isAdmin && user?.cargo === 'SUBCONTRATADO';

    let query = db
      .select({
        id: workPermits.id,
        codigo: workPermits.codigo,
        status: workPermits.status,
        contratoOrcamento: workPermits.contratoOrcamento,
        equipamento: workPermits.equipamento,
        tipoMaoDeObra: workPermits.tipoMaoDeObra,
        classificacaoReparo: workPermits.classificacaoReparo,
        trabalhoEmAltura: workPermits.trabalhoEmAltura,
        assinaturaInicio: workPermits.assinaturaInicio,
        assinaturaTermino: workPermits.assinaturaTermino,
        dadosCompletos: workPermits.dadosCompletos,
        createdAt: workPermits.createdAt,
        criadoPorId: workPermits.criadoPorId,
        criadorNome: users.nome,
        criadorCargo: users.cargo,
        criadorEmail: users.email,
        serviceOrderId: workPermits.serviceOrderId,
        serviceOrderCodigo: serviceOrders.codigo,
        clienteNome: serviceOrders.clienteNome,
        clienteUnidade: serviceOrders.clienteUnidade,
        subcontratadoId: serviceOrders.subcontratadoId,
      })
      .from(workPermits)
      .leftJoin(users, eq(workPermits.criadoPorId, users.id))
      .leftJoin(serviceOrders, eq(workPermits.serviceOrderId, serviceOrders.id))
      .orderBy(desc(workPermits.createdAt));

    let rows;
    if (isSubcontratado && user?.id) {
      // Regra: Subcontratados somente podem visualizar as próprias APRs
      rows = await query.where(
        or(
          eq(workPermits.criadoPorId, user.id),
          eq(serviceOrders.subcontratadoId, user.id)
        )
      );
    } else {
      rows = await query;
    }

    const pontos: PontoAcompanhamentoAPR[] = [];
    let totalSemCoordenadas = 0;

    for (const r of rows) {
      const inicioAssinatura = r.assinaturaInicio;
      const dadosCompletos = r.dadosCompletos;
      const terminoAssinatura = r.assinaturaTermino;

      // Procura coordenadas na assinatura de início ou nos dados completos
      const geoInicio =
        inicioAssinatura?.geolocalizacao ||
        dadosCompletos?.inicioServico?.emitenteAssinatura?.geolocalizacao;

      const geoTermino =
        terminoAssinatura?.geolocalizacao ||
        dadosCompletos?.terminoServico?.emitenteAssinatura?.geolocalizacao;

      // Pega coordenadas disponíveis (preferência início, ou término)
      const lat = geoInicio?.latitude ?? geoTermino?.latitude;
      const lng = geoInicio?.longitude ?? geoTermino?.longitude;
      const acc = geoInicio?.accuracy ?? geoTermino?.accuracy ?? null;

      if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
        // Nome de quem preencheu a APR
        const quemPreencheuNome =
          inicioAssinatura?.nome ||
          dadosCompletos?.inicioServico?.emitenteAssinatura?.nome ||
          r.criadorNome ||
          'Técnico Responsável';

        const quemPreencheuCargo =
          inicioAssinatura?.cargo ||
          dadosCompletos?.inicioServico?.emitenteAssinatura?.cargo ||
          r.criadorCargo ||
          r.tipoMaoDeObra;

        const dataHoraPreenchimento =
          inicioAssinatura?.timestamp ||
          dadosCompletos?.inicioServico?.dataHoraInicio ||
          r.createdAt?.toISOString();

        pontos.push({
          id: r.id,
          codigoPT: r.codigo,
          status: r.status,
          contratoOrcamento: r.contratoOrcamento,
          equipamento: r.equipamento,
          tipoMaoDeObra: r.tipoMaoDeObra,
          empresaContratada: dadosCompletos?.empresaContratada || null,
          classificacaoReparo: r.classificacaoReparo,
          trabalhoEmAltura: r.trabalhoEmAltura,
          serviceOrderId: r.serviceOrderId,
          serviceOrderCodigo: r.serviceOrderCodigo,
          clienteNome: r.clienteNome,
          clienteUnidade: r.clienteUnidade,
          quemPreencheuNome,
          quemPreencheuCargo,
          quemPreencheuEmail: r.criadorEmail,
          usuarioCriadorNome: r.criadorNome,
          usuarioCriadorCargo: r.criadorCargo,
          latitude: lat,
          longitude: lng,
          accuracy: acc,
          dataHoraPreenchimento,
          temTermino: !!terminoAssinatura,
          terminoNome: terminoAssinatura?.nome || dadosCompletos?.terminoServico?.emitenteAssinatura?.nome || null,
          terminoDataHora: dadosCompletos?.terminoServico?.dataHoraTermino || terminoAssinatura?.timestamp || null,
          terminoLatitude: geoTermino?.latitude ?? null,
          terminoLongitude: geoTermino?.longitude ?? null,
        });
      } else {
        totalSemCoordenadas++;
      }
    }

    return {
      success: true,
      pontos,
      totalSemCoordenadas,
      isAdmin,
      isSubcontratado,
    };
  } catch (error) {
    console.error('[getAcompanhamentoServicosAction] Erro:', error);
    return {
      success: false,
      pontos: [],
      totalSemCoordenadas: 0,
      isAdmin: false,
      isSubcontratado: false,
      error: 'Erro ao carregar dados de acompanhamento de serviços.',
    };
  }
}
