import React from 'react';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 14,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF5E00',
    paddingBottom: 5,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#FF5E00',
  },
  brandSubtitle: {
    fontSize: 7,
    color: '#64748b',
    marginTop: 1,
  },
  docBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    alignItems: 'flex-end',
  },
  docBadgeTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  docBadgeSubtitle: {
    fontSize: 6.5,
    color: '#ea580c',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoCol3: {
    width: '33.3%',
    marginBottom: 2,
  },
  infoCol2: {
    width: '50%',
    marginTop: 2,
    marginBottom: 1,
  },
  infoColFull: {
    width: '100%',
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 6.5,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 0,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  attachedImage: {
    width: '100%',
    height: '100%',
    objectFit: 'fill',
  },
  footerContainer: {
    marginTop: 4,
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

export interface CartaConclusaoPdfProps {
  codigoPT: string;
  contratoOrcamento: string;
  equipamento: string;
  tecnicoNome: string;
  dataHoraTermino: string;
  observacoes?: string;
  fotoBase64: string;
}

export function CartaConclusaoPdfPage({
  codigoPT,
  contratoOrcamento,
  equipamento,
  tecnicoNome,
  dataHoraTermino,
  observacoes,
  fotoBase64,
}: CartaConclusaoPdfProps) {
  const dataFormatada = dataHoraTermino
    ? new Date(dataHoraTermino).toLocaleString('pt-BR')
    : new Date().toLocaleString('pt-BR');

  return (
    <Page size="A4" style={styles.page}>
      {/* Topo / Cabeçalho */}
      <View style={styles.headerContainer}>
          <View>
            <Text style={styles.brandTitle}>
              TKE <Text style={styles.brandAccent}>REPAROS</Text>
            </Text>
            <Text style={styles.brandSubtitle}>
              Move Beyond • Excelência Operacional & Engenharia de Campo
            </Text>
          </View>
          <View style={styles.docBadge}>
            <Text style={styles.docBadgeTitle}>CARTA DE CONCLUSÃO</Text>
            <Text style={styles.docBadgeSubtitle}>Aceite Formal de Serviço</Text>
          </View>
        </View>

        {/* Informações Principais da Ordem e da PT */}
        <View style={styles.infoCard}>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol3}>
              <Text style={styles.infoLabel}>Permissão de Trabalho (PT)</Text>
              <Text style={styles.infoValue}>{codigoPT || 'N/A'}</Text>
            </View>
            <View style={styles.infoCol3}>
              <Text style={styles.infoLabel}>Contrato / Orçamento</Text>
              <Text style={styles.infoValue}>{contratoOrcamento || 'N/A'}</Text>
            </View>
            <View style={styles.infoCol3}>
              <Text style={styles.infoLabel}>Equipamento / Instalação</Text>
              <Text style={styles.infoValue}>{equipamento || 'Elevador'}</Text>
            </View>
            <View style={styles.infoCol2}>
              <Text style={styles.infoLabel}>Data / Hora de Término</Text>
              <Text style={styles.infoValue}>{dataFormatada}</Text>
            </View>
            <View style={styles.infoCol2}>
              <Text style={styles.infoLabel}>Técnico Responsável pelo Término</Text>
              <Text style={styles.infoValue}>{tecnicoNome || 'Técnico Especialista'}</Text>
            </View>
            {observacoes && (
              <View style={styles.infoColFull}>
                <Text style={styles.infoLabel}>Observações Registradas</Text>
                <Text style={{ ...styles.infoValue, fontWeight: 'normal', fontSize: 8 }}>
                  {observacoes}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Título da Evidência */}
        <Text style={styles.sectionTitle}>
          Documento Comprobatório / Carta Assinada
        </Text>

        {/* Quadro com a Foto da Carta Anexada */}
        <View style={styles.imageWrapper}>
          {fotoBase64 ? (
            <Image src={fotoBase64} style={styles.attachedImage} />
          ) : (
            <Text style={{ color: '#94a3b8', fontSize: 9 }}>
              Nenhuma imagem da carta de conclusão anexada.
            </Text>
          )}
        </View>

        {/* Rodapé com Carimbo Auditável */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Documento gerado digitalmente pelo Sistema TKE Reparos em{' '}
            {new Date().toLocaleString('pt-BR')}
          </Text>
          <Text style={styles.footerAudit}>
            PT: {codigoPT} • Válido como comprovante
          </Text>
        </View>
      </Page>
    );
  }

  export function CartaConclusaoPdfDocument(props: CartaConclusaoPdfProps) {
    return (
      <Document
        title={`Carta_Conclusao_${props.codigoPT}`}
        author="TKE Elevadores - Move Beyond"
        subject="Carta de Conclusão e Aceite de Serviço de Reparo"
      >
        <CartaConclusaoPdfPage {...props} />
      </Document>
    );
  }
