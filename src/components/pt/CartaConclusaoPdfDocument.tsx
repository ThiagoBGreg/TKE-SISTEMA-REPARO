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
    padding: 24,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF5E00',
    paddingBottom: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  brandAccent: {
    color: '#FF5E00',
  },
  brandSubtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  docBadge: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'flex-end',
  },
  docBadgeTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  docBadgeSubtitle: {
    fontSize: 7.5,
    color: '#ea580c',
    marginTop: 1,
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoCol: {
    width: '50%',
    marginBottom: 4,
  },
  infoColFull: {
    width: '100%',
    marginTop: 4,
  },
  infoLabel: {
    fontSize: 7.5,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  imageWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 6,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 460,
  },
  attachedImage: {
    maxHeight: 450,
    maxWidth: 520,
    objectFit: 'contain',
  },
  footerContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
  footerAudit: {
    fontSize: 7,
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

export function CartaConclusaoPdfDocument({
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
    <Document
      title={`Carta_Conclusao_${codigoPT}`}
      author="TKE Elevadores - Move Beyond"
      subject="Carta de Conclusão e Aceite de Serviço de Reparo"
    >
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
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Permissão de Trabalho (PT)</Text>
              <Text style={styles.infoValue}>{codigoPT || 'N/A'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Contrato / Orçamento</Text>
              <Text style={styles.infoValue}>{contratoOrcamento || 'N/A'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Equipamento / Instalação</Text>
              <Text style={styles.infoValue}>{equipamento || 'Elevador'}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Data / Hora de Término</Text>
              <Text style={styles.infoValue}>{dataFormatada}</Text>
            </View>
            <View style={styles.infoColFull}>
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
    </Document>
  );
}
