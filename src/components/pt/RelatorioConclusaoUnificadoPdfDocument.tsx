import React from 'react';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
} from '@react-pdf/renderer';
import type { PtReparoFormData } from '@/lib/validations/ptReparoSchema';
import { PtReparoPdfPage1, PtReparoPdfPage2 } from './PtReparoPdfDocument';
import { CartaConclusaoPdfPage } from './CartaConclusaoPdfDocument';
import type { FotoServicoItem } from '@/actions/fotoServicoActions';

const styles = StyleSheet.create({
  fotoPage: {
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF5E00',
    paddingBottom: 5,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#FF5E00',
  },
  brandSubtitle: {
    fontSize: 6.5,
    color: '#64748b',
    marginTop: 1,
  },
  docBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    alignItems: 'flex-end',
  },
  docBadgeTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1d4ed8',
  },
  docBadgeSubtitle: {
    fontSize: 6.5,
    color: '#3b82f6',
  },
  infoBar: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: 6,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 1,
  },
  fotosGrid: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
    gap: 8,
  },
  fotoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    flexDirection: 'column',
    maxHeight: 330,
  },
  imageWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
  },
  fotoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  fotoMeta: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fotoLegenda: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#1e293b',
    maxWidth: '65%',
  },
  fotoTimestamp: {
    fontSize: 6.5,
    color: '#64748b',
    textAlign: 'right',
  },
  footerContainer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 6.5,
    color: '#94a3b8',
  },
  footerAudit: {
    fontSize: 6.5,
    color: '#64748b',
    fontWeight: 'bold',
  },
});

export interface RelatorioConclusaoUnificadoPdfProps {
  data: PtReparoFormData;
  codigoPT: string;
  cartaConclusao?: {
    fotoBase64?: string;
    tecnicoNome?: string;
    dataHoraTermino?: string;
    observacoes?: string;
  } | null;
  fotosServico?: FotoServicoItem[];
}

export function RelatorioConclusaoUnificadoPdfDocument({
  data,
  codigoPT,
  cartaConclusao,
  fotosServico = [],
}: RelatorioConclusaoUnificadoPdfProps) {
  // Agrupa as fotos de 2 em 2 por página para máxima resolução e visibilidade
  const fotosPorPagina: FotoServicoItem[][] = [];
  for (let i = 0; i < fotosServico.length; i += 2) {
    fotosPorPagina.push(fotosServico.slice(i, i + 2));
  }

  const temCarta = Boolean(cartaConclusao?.fotoBase64);

  return (
    <Document
      title={`Relatorio_Conclusao_PT_${codigoPT}`}
      author="TKE Elevadores - Move Beyond"
      subject="Relatório Unificado de Conclusão: APR, Carta de Aceite e Fotos do Serviço"
    >
      {/* 1. SEÇÃO 1: PERMISSÃO DE TRABALHO & APR (PÁGINA 1) */}
      <PtReparoPdfPage1 data={data} codigoPT={codigoPT} />

      {/* 2. SEÇÃO 1: PERMISSÃO DE TRABALHO & APR (PÁGINA 2) */}
      <PtReparoPdfPage2 data={data} codigoPT={codigoPT} />

      {/* 3. SEÇÃO 2: CARTA DE CONCLUSÃO / ACEITE FORMAL (PÁGINA 3) */}
      {temCarta && cartaConclusao && (
        <CartaConclusaoPdfPage
          codigoPT={codigoPT}
          contratoOrcamento={data.contratoOrcamento}
          equipamento={data.equipamento}
          tecnicoNome={
            cartaConclusao.tecnicoNome ||
            data.terminoServico?.emitenteAssinatura?.nome ||
            'Técnico Especialista'
          }
          dataHoraTermino={
            cartaConclusao.dataHoraTermino ||
            data.terminoServico?.dataHoraTermino ||
            new Date().toISOString()
          }
          observacoes={
            cartaConclusao.observacoes ||
            data.observacoesGerais ||
            ''
          }
          fotoBase64={cartaConclusao.fotoBase64!}
        />
      )}

      {/* 4. SEÇÃO 3: EVIDÊNCIAS FOTOGRÁFICAS DO SERVIÇO */}
      {fotosPorPagina.map((duplaFotos, pageIdx) => (
        <Page key={`fotos-page-${pageIdx}`} size="A4" style={styles.fotoPage}>
          {/* Topo / Cabeçalho */}
          <View style={styles.headerContainer}>
            <View>
              <Text style={styles.brandTitle}>
                TKE <Text style={styles.brandAccent}>REPAROS</Text>
              </Text>
              <Text style={styles.brandSubtitle}>
                Move Beyond • Dossiê de Conclusão de Serviço & Evidências
              </Text>
            </View>
            <View style={styles.docBadge}>
              <Text style={styles.docBadgeTitle}>REGISTRO FOTOGRÁFICO</Text>
              <Text style={styles.docBadgeSubtitle}>
                Página {pageIdx + 1} de {fotosPorPagina.length} • ({fotosServico.length} fotos)
              </Text>
            </View>
          </View>

          {/* Barra de identificação rápida */}
          <View style={styles.infoBar}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Permissão de Trabalho</Text>
              <Text style={styles.infoValue}>{codigoPT}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Contrato / Orçamento</Text>
              <Text style={styles.infoValue}>{data.contratoOrcamento || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Equipamento</Text>
              <Text style={styles.infoValue}>{data.equipamento || 'Elevador'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Mão de Obra</Text>
              <Text style={styles.infoValue}>
                {data.tipoMaoDeObra === 'TKE'
                  ? 'TKE'
                  : `Contratada (${data.empresaContratada || 'Terceiro'})`}
              </Text>
            </View>
          </View>

          {/* Lista de Fotos (até 2 por página) */}
          <View style={styles.fotosGrid}>
            {duplaFotos.map((foto, fIdx) => {
              const fotoSrc = foto.driveViewUrl || (foto as any).rawBase64 || '';
              const dataFormatada = foto.enviadoEm
                ? new Date(foto.enviadoEm).toLocaleString('pt-BR')
                : new Date().toLocaleString('pt-BR');

              return (
                <View key={foto.id || `f-${fIdx}`} style={styles.fotoCard}>
                  <View style={styles.imageWrapper}>
                    {fotoSrc ? (
                      <Image src={fotoSrc} style={styles.fotoImg} />
                    ) : (
                      <Text style={{ color: '#ffffff', fontSize: 8 }}>
                        Imagem não disponível
                      </Text>
                    )}
                  </View>
                  <View style={styles.fotoMeta}>
                    <Text style={styles.fotoLegenda}>
                      {foto.legenda || `Foto ${pageIdx * 2 + fIdx + 1} - Evidência de Execução`}
                    </Text>
                    <Text style={styles.fotoTimestamp}>
                      📅 {dataFormatada} {foto.enviadoPorNome ? `• ${foto.enviadoPorNome}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Rodapé */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              Dossiê Unificado de Conclusão • Sistema TKE Reparos em{' '}
              {new Date().toLocaleString('pt-BR')}
            </Text>
            <Text style={styles.footerAudit}>
              PT: {codigoPT} • Válido para Auditoria e Histórico Operacional
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
