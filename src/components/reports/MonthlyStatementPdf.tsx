import React from 'react';
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderColor: '#e11d48',
    paddingBottom: 8,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e11d48',
  },
  headerSubtitle: {
    fontSize: 7.5,
    color: '#64748b',
    marginTop: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  subcontractorBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 6,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  kpiLabel: {
    fontSize: 6.5,
    color: '#64748b',
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 2,
  },
  table: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    fontWeight: 'bold',
    padding: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#e2e8f0',
    padding: 4,
    alignItems: 'center',
  },
  tableRowEven: {
    backgroundColor: '#f8fafc',
  },
  colCode: { flex: 1.2 },
  colDate: { flex: 1.1 },
  colEquip: { flex: 2 },
  colDesc: { flex: 3 },
  colApr: { flex: 1, textAlign: 'center' },
  colStatus: { flex: 1.5, textAlign: 'center' },
  colValor: { flex: 1.5, textAlign: 'right' },
  footerRow: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    padding: 6,
    borderTopWidth: 1,
    borderColor: '#0f172a',
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
  },
});

export interface MonthlyStatementPdfProps {
  subcontractorName: string;
  subcontractorDoc?: string;
  month: string;
  emissaoDate: string;
  orders: Array<{
    codigo: string;
    data: string;
    equipamento: string;
    descricao: string;
    aprStatus: string;
    statusFinanceiro: string;
    valor: number;
  }>;
}

export function MonthlyStatementPdf({
  subcontractorName,
  subcontractorDoc = 'Não informado',
  month,
  emissaoDate,
  orders,
}: MonthlyStatementPdfProps) {
  const totalValor = orders.reduce((acc, o) => acc + o.valor, 0);
  const totalConcluidas = orders.filter((o) => o.statusFinanceiro === 'LIQUIDADO').length;

  return (
    <Document title={`Extrato_Mensal_${month}_${subcontractorName}`} author="TKE Elevadores">
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho Institucional */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logoText}>TKE</Text>
            <Text style={styles.headerSubtitle}>Gestão Integrada de Reparos & Manutenção</Text>
          </View>
          <View>
            <Text style={styles.title}>EXTRATO MENSAL DE SERVIÇOS</Text>
            <Text style={{ fontSize: 8, color: '#64748b', textAlign: 'right', marginTop: 2 }}>
              Competência: <Text style={styles.bold}>{month}</Text>
            </Text>
          </View>
        </View>

        {/* Bloco de Dados do Prestador */}
        <View style={styles.subcontractorBox}>
          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text>
                <Text style={styles.bold}>Prestador / Subcontratado:</Text> {subcontractorName}
              </Text>
              <Text style={{ marginTop: 2 }}>
                <Text style={styles.bold}>CNPJ / CPF:</Text> {subcontractorDoc}
              </Text>
            </View>
            <View style={[styles.infoCol, { alignItems: 'flex-end' }]}>
              <Text>
                <Text style={styles.bold}>Data de Emissão:</Text> {emissaoDate}
              </Text>
              <Text style={{ marginTop: 2 }}>
                <Text style={styles.bold}>Total de Ordens:</Text> {orders.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Resumo Financeiro (KPIs) */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>SERVIÇOS ATENDIDOS</Text>
            <Text style={styles.kpiValue}>{orders.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>OS LIQUIDADAS / PAGAS</Text>
            <Text style={[styles.kpiValue, { color: '#15803d' }]}>{totalConcluidas}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: '#fef2f2', borderColor: '#fecdd3' }]}>
            <Text style={[styles.kpiLabel, { color: '#991b1b' }]}>VALOR TOTAL BRUTO</Text>
            <Text style={[styles.kpiValue, { color: '#e11d48' }]}>
              R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Tabela Detalhada das OS */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colCode}>Cód. OS</Text>
            <Text style={styles.colDate}>Data</Text>
            <Text style={styles.colEquip}>Equipamento / Local</Text>
            <Text style={styles.colDesc}>Escopo do Reparo</Text>
            <Text style={styles.colApr}>APR</Text>
            <Text style={styles.colStatus}>Status Pgto</Text>
            <Text style={styles.colValor}>Valor (R$)</Text>
          </View>

          {orders.map((ordem, index) => (
            <View
              key={ordem.codigo || index}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowEven : {}]}
            >
              <Text style={[styles.colCode, styles.bold]}>{ordem.codigo}</Text>
              <Text style={styles.colDate}>{ordem.data}</Text>
              <Text style={styles.colEquip}>{ordem.equipamento}</Text>
              <Text style={styles.colDesc}>{ordem.descricao}</Text>
              <Text style={styles.colApr}>{ordem.aprStatus === 'APROVADA' ? '✓' : '-'}</Text>
              <Text style={styles.colStatus}>{ordem.statusFinanceiro}</Text>
              <Text style={[styles.colValor, styles.bold]}>
                {ordem.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          ))}

          {/* Linha Totalizadora */}
          <View style={styles.footerRow}>
            <Text style={{ flex: 7.3, fontWeight: 'bold' }}>
              TOTALIZADOR ({orders.length} serviços)
            </Text>
            <Text style={[styles.colValor, { fontWeight: 'bold', fontSize: 9 }]}>
              R$ {totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Rodapé */}
        <Text style={styles.footerText}>
          Documento gerado automaticamente pelo Sistema de Reparo TKE para fins de conferência operacional e medição contábil.
        </Text>
      </Page>
    </Document>
  );
}
