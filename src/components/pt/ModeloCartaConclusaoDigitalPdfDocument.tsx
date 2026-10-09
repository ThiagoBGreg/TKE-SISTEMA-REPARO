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
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 48,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  // Topo direito: Apenas logo e informações da TKE
  tkeHeaderContainer: {
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  tkeLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  tkeLogoT: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#FF5E00', // Laranja TKE
    letterSpacing: -1,
  },
  tkeLogoKE: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#231F20', // Cinza escuro / preto TKE
    letterSpacing: -1,
  },
  tkeEmpresaText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    marginTop: 1,
    color: '#000000',
  },
  tkeInfoText: {
    fontSize: 7,
    textAlign: 'right',
    color: '#000000',
    marginTop: 1,
  },
  // Destinatário AO(a): Fica abaixo do bloco da TKE, isolado à esquerda
  destinatarioContainer: {
    marginTop: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
  },
  destinatarioTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1.5,
  },
  destinatarioNome: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 1,
  },
  destinatarioText: {
    fontSize: 7.5,
    marginBottom: 1,
    color: '#000000',
  },
  docTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  paragraph: {
    fontSize: 8,
    lineHeight: 1.35,
    marginBottom: 6,
    textAlign: 'justify',
  },
  table: {
    width: '100%',
    borderWidth: 0.8,
    borderColor: '#000000',
    marginTop: 6,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: '#000000',
    backgroundColor: '#ffffff',
  },
  tableHeaderColEquip: {
    width: '26%',
    borderRightWidth: 0.8,
    borderRightColor: '#000000',
    paddingVertical: 2.5,
    paddingHorizontal: 4,
  },
  tableHeaderColServ: {
    width: '74%',
    paddingVertical: 2.5,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.8,
    borderBottomColor: '#000000',
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  tableColEquip: {
    width: '26%',
    borderRightWidth: 0.8,
    borderRightColor: '#000000',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  tableColServ: {
    width: '74%',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  tableCellEquipText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  tableCellServText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
  },
  garantiaText: {
    fontSize: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  cordialmenteText: {
    fontSize: 8,
    marginBottom: 14,
  },
  tkeAssinaturaLinha: {
    width: 240,
    borderBottomWidth: 0.8,
    borderBottomColor: '#000000',
    marginBottom: 3,
  },
  tkeAssinaturaNome: {
    fontSize: 7.5,
    marginBottom: 12,
  },
  termoBox: {
    borderWidth: 0.8,
    borderColor: '#000000',
    paddingTop: 6,
    paddingBottom: 5,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  termoTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  termoFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4.5,
    minHeight: 12,
  },
  termoLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    marginRight: 4,
  },
  termoValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 0.6,
    borderBottomColor: '#000000',
    paddingBottom: 0.5,
  },
  termoValueText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
  },
  termoUnderlineOnly: {
    flex: 1,
    borderBottomWidth: 0.6,
    borderBottomColor: '#000000',
    height: 8,
  },
  assinaturaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 3,
    minHeight: 28,
  },
  assinaturaImage: {
    width: 140,
    height: 28,
    objectFit: 'contain',
  },
  notaRodape: {
    fontSize: 6.2,
    color: '#000000',
    marginTop: 4,
    lineHeight: 1.25,
  },
  paginaFooter: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 7.5,
    color: '#000000',
  },
});

export interface ServicoItemModelo {
  equipamento: string;
  servico: string;
}

export interface ModeloCartaConclusaoDigitalProps {
  // Dados TKE
  tkeCnpj?: string;
  tkeEndereco?: string;
  tkeCidadeUf?: string;
  // Dados Cliente
  clienteNome?: string;
  clienteEndereco?: string;
  clienteCidadeUf?: string;
  filial?: string;
  // Dados Contrato e Reparo
  contratoNumero?: string;
  equipamentosTexto?: string;
  orcamentoNumero?: string;
  servicos: ServicoItemModelo[];
  // Termo de Ciência e Recebimento
  termoNome?: string;
  termoCpf?: string;
  termoFuncao?: string;
  termoData?: string;
  termoTelefone?: string;
  termoAssinaturaBase64?: string;
  logoSrc?: string;
}

export function ModeloCartaConclusaoDigitalPage(props: ModeloCartaConclusaoDigitalProps) {
  const {
    tkeCnpj = '90.347.840/0064-00',
    tkeEndereco = 'AV ADOLFO PINHEIRO, 1000',
    tkeCidadeUf = 'SANTO AMARO, SP',
    clienteNome = 'CLIENTE',
    clienteEndereco = '',
    clienteCidadeUf = 'SAO PAULO - SP',
    filial = '5064',
    contratoNumero = '',
    equipamentosTexto = '',
    orcamentoNumero = '',
    servicos = [],
    termoNome = '',
    termoCpf = '',
    termoFuncao = '',
    termoData = '',
    termoTelefone = '',
    termoAssinaturaBase64 = '',
    logoSrc,
  } = props;

  return (
    <Page size="A4" style={styles.page}>
      {/* 1. TOPO DIREITO: Logo e Dados Oficiais da TKE */}
      <View style={styles.tkeHeaderContainer}>
        {logoSrc ? (
          <Image src={logoSrc} style={{ width: 56, height: 26, objectFit: 'contain', marginBottom: 2 }} />
        ) : (
          <View style={styles.tkeLogoContainer}>
            <Text style={styles.tkeLogoT}>T</Text>
            <Text style={styles.tkeLogoKE}>KE</Text>
          </View>
        )}
        <Text style={styles.tkeEmpresaText}>TKELEVADORES S.A.</Text>
        <Text style={styles.tkeInfoText}>CNPJ: {tkeCnpj}</Text>
        <Text style={styles.tkeInfoText}>{tkeEndereco}</Text>
        <Text style={styles.tkeInfoText}>{tkeCidadeUf}</Text>
      </View>

      {/* 2. DESTINATÁRIO AO(a): Fica abaixo do bloco da TKE, isolado à esquerda */}
      <View style={styles.destinatarioContainer}>
        <Text style={styles.destinatarioTitle}>AO(a)</Text>
        <Text style={styles.destinatarioNome}>{clienteNome.toUpperCase()}</Text>
        {clienteEndereco ? <Text style={styles.destinatarioText}>{clienteEndereco.toUpperCase()}</Text> : null}
        {clienteCidadeUf ? <Text style={styles.destinatarioText}>{clienteCidadeUf.toUpperCase()}</Text> : null}
        <Text style={styles.destinatarioText}>FILIAL: {filial}</Text>
      </View>

      {/* 3. TÍTULO OFICIAL CENTRALIZADO */}
      <Text style={styles.docTitle}>TERMO DE CONCLUSÃO DE REPARO:</Text>

      {/* 4. TEXTOS DO TERMO */}
      <Text style={{ ...styles.paragraph, marginBottom: 4 }}>
        Referente ao Contrato TKE sob o Nº: {contratoNumero}
      </Text>

      <Text style={styles.paragraph}>
        Comunicamos a Vossa Senhoria a conclusão dos serviços executados no(s) equipamento(s){' '}
        {equipamentosTexto}, referente ao orçamento de reparo sob o nº {orcamentoNumero}. Informamos também que
        o equipamento foi entregue em perfeitas condições de uso, sendo realizados os seguintes serviços:
      </Text>

      {/* 5. TABELA OFICIAL DE SERVIÇOS EXECUTADOS */}
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <View style={styles.tableHeaderColEquip}>
            <Text style={styles.tableHeaderText}>Equipamento</Text>
          </View>
          <View style={styles.tableHeaderColServ}>
            <Text style={styles.tableHeaderText}>Serviço Executado</Text>
          </View>
        </View>

        {servicos && servicos.length > 0 ? (
          servicos.map((item, idx) => {
            const isLast = idx === servicos.length - 1;
            return (
              <View key={idx} style={isLast ? styles.tableRowLast : styles.tableRow}>
                <View style={styles.tableColEquip}>
                  <Text style={styles.tableCellEquipText}>{item.equipamento || '-'}</Text>
                </View>
                <View style={styles.tableColServ}>
                  <Text style={styles.tableCellServText}>{item.servico || '-'}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.tableRowLast}>
            <View style={styles.tableColEquip}>
              <Text style={styles.tableCellEquipText}>{equipamentosTexto || '-'}</Text>
            </View>
            <View style={styles.tableColServ}>
              <Text style={styles.tableCellServText}>SERVIÇOS DE REPARO / MANUTENÇÃO CONCLUÍDOS</Text>
            </View>
          </View>
        )}
      </View>

      {/* 6. GARANTIA E ASSINATURA DA TKE */}
      <Text style={styles.garantiaText}>
        O prazo de garantia da prestação de serviços e das peças utilizadas começa a contar da data deste termo.
      </Text>

      <Text style={styles.cordialmenteText}>Cordialmente,</Text>

      <View style={styles.tkeAssinaturaLinha} />
      <Text style={styles.tkeAssinaturaNome}>TK Elevadores Brasil Ltda</Text>

      {/* 7. QUADRO OFICIAL: TERMO DE CIÊNCIA E RECEBIMENTO */}
      <View style={styles.termoBox}>
        <Text style={styles.termoTitle}>TERMO DE CIÊNCIA E RECEBIMENTO:</Text>

        {/* NOME COMPLETO */}
        <View style={styles.termoFieldRow}>
          <Text style={styles.termoLabel}>NOME COMPLETO:</Text>
          <View style={styles.termoValueContainer}>
            <Text style={styles.termoValueText}>{termoNome ? termoNome.toUpperCase() : ''}</Text>
          </View>
        </View>

        {/* CPF */}
        <View style={styles.termoFieldRow}>
          <Text style={styles.termoLabel}>CPF:</Text>
          <View style={{ ...styles.termoValueContainer, maxWidth: 220 }}>
            <Text style={styles.termoValueText}>{termoCpf || ''}</Text>
          </View>
        </View>

        {/* FUNÇÃO */}
        <View style={styles.termoFieldRow}>
          <Text style={styles.termoLabel}>FUNÇÃO:</Text>
          <View style={{ ...styles.termoValueContainer, maxWidth: 240 }}>
            <Text style={styles.termoValueText}>{termoFuncao ? termoFuncao.toUpperCase() : ''}</Text>
          </View>
        </View>

        {/* DATA */}
        <View style={styles.termoFieldRow}>
          <Text style={styles.termoLabel}>DATA:</Text>
          <View style={{ ...styles.termoValueContainer, maxWidth: 120 }}>
            <Text style={styles.termoValueText}>{termoData || '___ / ___ / ______'}</Text>
          </View>
        </View>

        {/* TELEFONE */}
        <View style={styles.termoFieldRow}>
          <Text style={styles.termoLabel}>TELEFONE:</Text>
          <View style={{ ...styles.termoValueContainer, maxWidth: 200 }}>
            <Text style={styles.termoValueText}>{termoTelefone || ''}</Text>
          </View>
        </View>

        {/* ASSINATURA */}
        <View style={styles.assinaturaRow}>
          <Text style={styles.termoLabel}>ASSINATURA:</Text>
          <View style={{ ...styles.termoValueContainer, maxWidth: 240, minHeight: 28 }}>
            {termoAssinaturaBase64 ? (
              <Image src={termoAssinaturaBase64} style={styles.assinaturaImage} />
            ) : null}
          </View>
        </View>

        {/* TEXTO DE RODAPÉ LEGAL OFICIAL (15 DIAS) */}
        <Text style={styles.notaRodape}>
          *Na hipótese de ausência de assinatura do presente termo, sem qualquer manifestação em contrário, no prazo de
          15 (quinze) dias, a contar da data da entrega deste, implica em aceitação da conclusão dos serviços.
        </Text>
      </View>

      {/* NÚMERO DE PÁGINA */}
      <Text style={styles.paginaFooter}>1</Text>
    </Page>
  );
}

export function ModeloCartaConclusaoDigitalPdfDocument(props: ModeloCartaConclusaoDigitalProps) {
  return (
    <Document
      title={`Carta_Conclusao_Digital_${props.contratoNumero || 'TKE'}`}
      author="TK Elevadores Brasil Ltda"
      subject="Termo de Conclusão de Reparo e Termo de Ciência e Recebimento"
    >
      <ModeloCartaConclusaoDigitalPage {...props} />
    </Document>
  );
}
