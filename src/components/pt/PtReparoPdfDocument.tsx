import React from 'react';
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { PtReparoFormData } from '@/lib/validations/ptReparoSchema';

const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerTable: {
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 3,
    borderBottomWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 9.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    backgroundColor: '#e2e8f0',
    padding: 2,
    borderBottomWidth: 1,
    borderColor: '#000000',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#000000',
  },
  cell: {
    padding: 2,
    borderRightWidth: 0.5,
    borderColor: '#000000',
    flex: 1,
  },
  cellNoBorder: {
    padding: 2,
    flex: 1,
  },
  bold: {
    fontWeight: 'bold',
  },
  checklistRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    minHeight: 11,
  },
  checkColDesc: {
    flex: 5,
    paddingLeft: 3,
  },
  checkColStatus: {
    flex: 1,
    textAlign: 'center',
    borderLeftWidth: 0.5,
    borderColor: '#cbd5e1',
    fontWeight: 'bold',
  },
  alertBanner: {
    backgroundColor: '#000000',
    color: '#ffffff',
    fontSize: 6,
    padding: 1.5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  signatureBox: {
    height: 28,
    borderWidth: 0.5,
    borderColor: '#94a3b8',
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  signatureImage: {
    maxHeight: 22,
    maxWidth: 110,
    objectFit: 'contain',
  },
  geoBadge: {
    fontSize: 5,
    color: '#475569',
    textAlign: 'center',
    marginTop: 1,
  },
});

export interface PtReparoPdfProps {
  data: PtReparoFormData;
  codigoPT: string;
}

export function PtReparoPdfPage1({ data, codigoPT }: PtReparoPdfProps) {
  return (
    <Page size="A4" style={styles.page}>
      {/* Cabeçalho */}
      <View style={styles.headerTable}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 6.5, color: '#64748b' }}>
                Versão 04 - Revisão: 28/10/2022
              </Text>
              <Text style={styles.bold}>CÓDIGO: {codigoPT}</Text>
            </View>
            <View style={{ flex: 3, alignItems: 'center' }}>
              <Text style={styles.title}>REPAROS</Text>
              <Text style={styles.subtitle}>APR – ANÁLISE PRELIMINAR DE RISCO</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.bold, { fontSize: 11 }]}>TKE</Text>
            </View>
          </View>

          {/* 1 a 4: Identificação */}
          <View style={styles.row}>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text>
                <Text style={styles.bold}>1 - Nº CONTRATO/ORÇAMENTO:</Text> {data.contratoOrcamento}
              </Text>
            </View>
            <View style={[styles.cell, { flex: 2 }]}>
              <Text>
                <Text style={styles.bold}>2 - EQUIPAMENTO:</Text> {data.equipamento}
              </Text>
            </View>
            <View style={[styles.cell, { flex: 3 }]}>
              <Text>
                <Text style={styles.bold}>3 - MÃO DE OBRA:</Text>{' '}
                {data.tipoMaoDeObra === 'TKE'
                  ? '[X] TKE (Equipe Própria)'
                  : data.tipoMaoDeObra === 'CONTRATADA'
                  ? `[X] CONTRATADA: ${data.empresaContratada || ''}`
                  : `[X] ${data.tipoMaoDeObra}${data.empresaContratada ? ` (${data.empresaContratada})` : ''}`}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.cell}>
              <Text>
                <Text style={styles.bold}>4 - TIPO DE EQUIPAMENTO:</Text>{' '}
                {data.tipoEquipamento === 'COM_CASA_DE_MAQUINAS'
                  ? '[X] Com casa de máquinas'
                  : data.tipoEquipamento === 'SEM_CASA_DE_MAQUINAS'
                  ? '[X] Sem casa de máquinas (MRL)'
                  : `[X] ${data.tipoEquipamento.replace(/_/g, ' ')}`}
              </Text>
            </View>
          </View>

          {/* 5: Planejamento */}
          <Text style={styles.sectionTitle}>5 - PLANEJAMENTO DAS ATIVIDADES</Text>
          
          <View style={{ padding: 3 }}>
            <Text style={styles.bold}>5.1 - SERVIÇOS A SEREM REALIZADOS:</Text>
            <Text style={{ marginTop: 2, fontSize: 6.8 }}>
              {data.servicosRealizados.join('  •  ')}
              {data.servicosOutros ? ` (Outros: ${data.servicosOutros})` : ''}
            </Text>
          </View>

          <View style={{ padding: 3, borderTopWidth: 0.5, borderColor: '#cbd5e1' }}>
            <Text style={styles.bold}>5.2 - RISCOS POTENCIAIS:</Text>
            <Text style={{ marginTop: 2, fontSize: 6.8, color: '#b91c1c' }}>
              {data.riscosPotenciais.join('  •  ')}
              {data.riscosOutros ? ` (Outros: ${data.riscosOutros})` : ''}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.cell}>
              <Text>
                <Text style={styles.bold}>5.3 TIPO DE REPARO:</Text>{' '}
                {data.tipoReparo === 'SUSPENSAO_TRACAO'
                  ? 'Reparo em suspensão/tração'
                  : data.tipoReparoOutros || 'Outros'}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text>
                <Text style={styles.bold}>5.4 CLASSIFICAÇÃO:</Text>{' '}
                {data.classificacaoReparo === 'ROTINEIRO'
                  ? 'Rotineiro'
                  : data.classificacaoReparo === 'NAO_ROTINEIRO'
                  ? 'Não Rotineiro'
                  : data.classificacaoReparo.replace(/_/g, ' ')}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text>
                <Text style={styles.bold}>5.5 ALTURA:</Text> {data.trabalhoEmAltura ? 'SIM' : 'NÃO'}
              </Text>
            </View>
          </View>

          {/* 6: Checklist Exclusivo da Supervisão */}
          <Text style={styles.sectionTitle}>
            6 - CHECK-LIST PRELIMINAR DE USO EXCLUSIVO DA SUPERVISÃO
          </Text>

          {[
            {
              id: '6.1',
              label: 'Trabalhadores possuem instrução para realizar o reparo?',
              val: data.checklistSupervisao.instrucaoReparo,
            },
            {
              id: '6.2',
              label: 'Trabalhadores possuem treinamento e capacitação para realizar reparos?',
              val: data.checklistSupervisao.treinamentoCapacitacao,
            },
            {
              id: '6.3',
              label: 'Trabalhadores possuem treinamentos de segurança da NR-10, NR-18 e NR-35?',
              val: data.checklistSupervisao.treinamentosNormas,
            },
            {
              id: '6.4',
              label: 'Trabalhadores possuem os ferramentais necessários para iniciar as atividades?',
              val: data.checklistSupervisao.ferramentaisNecessarios,
            },
            {
              id: '6.5',
              label: 'O adendo contratual para reparo do equipamento está assinado?',
              val: data.checklistSupervisao.adendoContratualAssinado,
            },
            {
              id: '6.6',
              label: 'Trabalhadores possuem todos os EPIs necessários à atividade?',
              val: data.checklistSupervisao.episNecessarios,
            },
          ].map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={styles.checkColDesc}>
                {item.id} - {item.label}
              </Text>
              <Text style={styles.checkColStatus}>{item.val}</Text>
            </View>
          ))}

          {/* Assinatura da Supervisão (Opcional) */}
          <View style={[styles.row, { padding: 4, alignItems: 'center' }]}>
            <View style={{ flex: 2 }}>
              <Text>
                <Text style={styles.bold}>Emitente (Supervisão Técnica):</Text>{' '}
                {data.assinaturaSupervisao?.nome || 'Assinatura dispensada / Opcional'}
              </Text>
              <Text style={{ marginTop: 2 }}>
                <Text style={styles.bold}>Data Autorização:</Text>{' '}
                {data.dataAutorizacaoSupervisao || '-'}
              </Text>
            </View>
            <View style={{ flex: 2, alignItems: 'center' }}>
              {data.assinaturaSupervisao?.assinaturaBase64 ? (
                <>
                  <View style={styles.signatureBox}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image
                      src={data.assinaturaSupervisao.assinaturaBase64}
                      style={styles.signatureImage}
                    />
                  </View>
                  {data.assinaturaSupervisao.geolocalizacao && (
                    <Text style={styles.geoBadge}>
                      📍 {data.assinaturaSupervisao.geolocalizacao.latitude.toFixed(5)},{' '}
                      {data.assinaturaSupervisao.geolocalizacao.longitude.toFixed(5)}
                    </Text>
                  )}
                </>
              ) : (
                <View style={[styles.signatureBox, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 7, color: '#64748b' }}>Não Exigida / Opcional</Text>
                </View>
              )}
            </View>
          </View>

          {/* 7: Análise de Riscos no Local */}
          <Text style={styles.sectionTitle}>7 - ANÁLISE DE RISCOS NO LOCAL DE TRABALHO</Text>
          
          <Text style={{ padding: 2, fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
            ALTURA • Risco Potencial: {data.analiseRiscos.alturaRiscoExistente ? 'EXISTENTE' : 'NÃO EXISTENTE'}
          </Text>
          {[
            { id: '7.1', label: 'Há sinalizações instaladas nos pavimentos?', val: data.analiseRiscos.alturaItens.sinalizacaoPavimentos },
            { id: '7.2', label: 'Existem dispositivos para ancoragem disponíveis?', val: data.analiseRiscos.alturaItens.dispositivosAncoragem },
            { id: '7.3', label: 'Andaime tipo mão francesa/tubular em boas condições?', val: data.analiseRiscos.alturaItens.andaimeBoasCondicoes },
            { id: '7.4', label: 'Existem proteções coletivas contra quedas na casa de máquinas?', val: data.analiseRiscos.alturaItens.protecoesColetivasCasaMaquinas },
            { id: '7.5', label: 'O ambiente de trabalho oferece condições seguras?', val: data.analiseRiscos.alturaItens.entornoSeguro },
          ].map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={styles.checkColDesc}>{item.id} - {item.label}</Text>
              <Text style={styles.checkColStatus}>{item.val}</Text>
            </View>
          ))}
          <Text style={styles.alertBanner}>
            ATENÇÃO: Somente trabalhadores capacitados na NR-35 estão autorizados para o trabalho em altura.
          </Text>

          <Text style={{ padding: 2, fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
            IÇAMENTO DE MATERIAIS • Risco Potencial: {data.analiseRiscos.icamentoRiscoExistente ? 'EXISTENTE' : 'NÃO EXISTENTE'}
          </Text>
          {[
            { id: '7.6', label: 'Equipamentos de içamento adequados à carga?', val: data.analiseRiscos.icamentoItens.equipamentosAdequados },
            { id: '7.7', label: 'Acessórios de içamento disponíveis são adequados?', val: data.analiseRiscos.icamentoItens.acessoriosAdequados },
            { id: '7.8', label: 'Ganchos atestados e com marcação de carga?', val: data.analiseRiscos.icamentoItens.ganchosAtestados },
            { id: '7.9', label: 'Há redundância na amarração da cabine/cabos?', val: data.analiseRiscos.icamentoItens.redundanciaSeguranca },
            { id: '7.10', label: 'Área de projeção do içamento isolada?', val: data.analiseRiscos.icamentoItens.areaProjecaoIsolada },
            { id: '7.11', label: 'Há recursos de comunicação entre os membros?', val: data.analiseRiscos.icamentoItens.comunicacaoEquipe },
          ].map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={styles.checkColDesc}>{item.id} - {item.label}</Text>
              <Text style={styles.checkColStatus}>{item.val}</Text>
            </View>
          ))}
          <Text style={styles.alertBanner}>
            ATENÇÃO: A instalação de redundância é obrigatória em qualquer processo de içamento de cargas.
          </Text>
        </View>
      </Page>
    );
  }

  export function PtReparoPdfPage2({ data, codigoPT }: PtReparoPdfProps) {
    return (
      <Page size="A4" style={styles.page}>
        <View style={styles.headerTable}>
          {/* Circuitos Elétricos */}
          <Text style={{ padding: 2, fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
            CIRCUITOS ELÉTRICOS • Risco Potencial: {data.analiseRiscos.eletricaRiscoExistente ? 'EXISTENTE' : 'NÃO EXISTENTE'}
          </Text>
          {[
            { id: '7.12', label: 'Fiações elétricas isoladas na casa de máquinas/caixa?', val: data.analiseRiscos.eletricaItens.fiacaoIsolada },
            { id: '7.13', label: 'Conferido aterramento e disjuntor DR no quadro de força?', val: data.analiseRiscos.eletricaItens.aterramentoEDR },
            { id: '7.14', label: 'Trabalhadores possuem kit bloqueio elétrico?', val: data.analiseRiscos.eletricaItens.kitBloqueioEletrico },
            { id: '7.15', label: 'Atividade exige bloqueio elétrico?', val: data.analiseRiscos.eletricaItens.exigeBloqueioEletrico },
            { id: '7.16', label: 'Há infiltrações (casa de máquinas, caixa, poço)?', val: data.analiseRiscos.eletricaItens.infiltracoesPresentes },
          ].map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={styles.checkColDesc}>{item.id} - {item.label}</Text>
              <Text style={styles.checkColStatus}>{item.val}</Text>
            </View>
          ))}
          <Text style={styles.alertBanner}>
            ATENÇÃO: Somente trabalhadores capacitados na NR-10 estão autorizados para trabalhos com eletricidade.
          </Text>

          {/* Trabalho a Quente */}
          <Text style={{ padding: 2, fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
            TRABALHO A QUENTE • Risco Potencial: {data.analiseRiscos.quenteRiscoExistente ? 'EXISTENTE' : 'NÃO EXISTENTE'}
          </Text>
          {[
            { id: '7.17', label: 'Local de trabalho está devidamente isolado?', val: data.analiseRiscos.quenteItens.localDevidamenteIsolado },
            { id: '7.18', label: 'Livre de materiais que possam causar princípio de incêndio?', val: data.analiseRiscos.quenteItens.livreMateriaisIncendio },
            { id: '7.19', label: 'Equipamentos de combate a incêndio próximos ao local?', val: data.analiseRiscos.quenteItens.equipamentosCombateIncendioProximos },
            { id: '7.20', label: 'Trabalhadores possuem capacitação técnica em trabalho a quente?', val: data.analiseRiscos.quenteItens.capacitacaoTrabalhoQuente },
          ].map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Text style={styles.checkColDesc}>{item.id} - {item.label}</Text>
              <Text style={styles.checkColStatus}>{item.val}</Text>
            </View>
          ))}

          {/* 8 a 10: Ferramental, EPCs, EPIs */}
          <Text style={styles.sectionTitle}>8 - FERRAMENTAL, 9 - EPCs E 10 - EPIs</Text>
          <View style={{ padding: 3 }}>
            <Text>
              <Text style={styles.bold}>8 - Ferramental:</Text> {data.ferramentasSelecionadas.join(', ') || 'Nenhum'}
            </Text>
            <Text style={{ marginTop: 2 }}>
              <Text style={styles.bold}>9 - EPCs:</Text> {data.epcsSelecionados.join(', ') || 'Nenhum'}
            </Text>
            <Text style={{ marginTop: 2 }}>
              <Text style={styles.bold}>10 - EPIs:</Text> {data.episSelecionados.join(', ')}
            </Text>
          </View>

          {/* 11: Termo de Compromisso */}
          <Text style={styles.sectionTitle}>11 - TERMO DE COMPROMISSO</Text>
          <View style={{ padding: 3 }}>
            <Text style={{ fontSize: 6.5 }}>
              Declaro que fui orientado a partir deste formulário devidamente preenchido, o qual abrange todos os riscos inerentes aos trabalhos a serem executados no dia de HOJE, ficando ciente de todos os EPCs, EPIs e recursos que deverão ser utilizados na prevenção de incidentes/acidentes.
            </Text>
          </View>

          {/* 12: Início do Serviço */}
          <Text style={styles.sectionTitle}>12 - INÍCIO DO SERVIÇO DE REPARO</Text>
          <View style={[styles.row, { padding: 3, alignItems: 'center' }]}>
            <View style={{ flex: 2 }}>
              <Text><Text style={styles.bold}>Emitente:</Text> {data.inicioServico.emitenteAssinatura.nome}</Text>
              <Text><Text style={styles.bold}>Data/Hora Início:</Text> {data.inicioServico.dataHoraInicio}</Text>
            </View>
            <View style={{ flex: 2, alignItems: 'center' }}>
              <View style={styles.signatureBox}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={data.inicioServico.emitenteAssinatura.assinaturaBase64} style={styles.signatureImage} />
              </View>
            </View>
          </View>

          {/* 13: Integrantes da Equipe */}
          <Text style={styles.sectionTitle}>13 - INTEGRANTES DA EQUIPE DE REPARO</Text>
          <View style={{ padding: 2 }}>
            {data.equipeReparo.map((membro, idx) => (
              <View key={idx} style={[styles.row, { padding: 2, alignItems: 'center', borderBottomWidth: 0.5, borderColor: '#e2e8f0' }]}>
                <Text style={{ flex: 2 }}><Text style={styles.bold}>Nome:</Text> {membro.nomeCompleto}</Text>
                <View style={{ flex: 2, alignItems: 'center' }}>
                  <View style={[styles.signatureBox, { height: 28 }]}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={membro.assinatura.assinaturaBase64} style={[styles.signatureImage, { maxHeight: 22 }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* 14: Término do Serviço */}
          <Text style={styles.sectionTitle}>14 - TÉRMINO DO SERVIÇO DE REPARO</Text>
          <View style={[styles.row, { padding: 3, alignItems: 'center' }]}>
            <View style={{ flex: 2 }}>
              <Text>
                <Text style={styles.bold}>Emitente:</Text>{' '}
                {data.terminoServico?.emitenteAssinatura?.nome || 'Pendente'}
              </Text>
              <Text style={{ marginTop: 2 }}>
                <Text style={styles.bold}>Data/Hora Término:</Text>{' '}
                {data.terminoServico?.dataHoraTermino
                  ? String(data.terminoServico.dataHoraTermino).replace('T', ' ')
                  : 'Em andamento'}
              </Text>
              {data.terminoServico?.dataHoraTermino && (
                <Text style={{ marginTop: 2, fontSize: 6.5, color: '#16a34a' }}>
                  ✓ Serviço de Reparo Concluído
                </Text>
              )}
            </View>
            <View style={{ flex: 2, alignItems: 'center' }}>
              {data.terminoServico?.emitenteAssinatura?.assinaturaBase64 ? (
                <>
                  <View style={styles.signatureBox}>
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image
                      src={data.terminoServico.emitenteAssinatura.assinaturaBase64}
                      style={styles.signatureImage}
                    />
                  </View>
                  {data.terminoServico.emitenteAssinatura.geolocalizacao && (
                    <Text style={styles.geoBadge}>
                      📍 {data.terminoServico.emitenteAssinatura.geolocalizacao.latitude.toFixed(5)},{' '}
                      {data.terminoServico.emitenteAssinatura.geolocalizacao.longitude.toFixed(5)}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={{ fontSize: 6.5, color: '#94a3b8' }}>[Serviço em execução]</Text>
              )}
            </View>
          </View>

          {/* 15 a 19: Registros Complementares Fiel ao Formulário Oficial */}
          <Text style={[styles.sectionTitle, { backgroundColor: '#0f172a', color: '#ffffff', fontSize: 7.5 }]}>
            REGISTROS COMPLEMENTARES (PREENCHER QUANDO APLICÁVEL):
          </Text>

          {/* 15 - DIREITO DE RECUSA */}
          <View style={[styles.row, { backgroundColor: '#cbd5e1', alignItems: 'center' }]}>
            <Text style={[styles.bold, { flex: 5, padding: 2, fontSize: 6.8 }]}>15 - DIREITO DE RECUSA:</Text>
            <Text style={[styles.bold, { flex: 1, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontSize: 6.8 }]}>SIM</Text>
            <Text style={[styles.bold, { flex: 1, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontSize: 6.8 }]}>NÃO</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ flex: 5, padding: 2, fontSize: 6.5 }}>A atividade foi paralisada por questões de segurança?</Text>
            <Text style={{ flex: 1, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontWeight: 'bold', fontSize: 7 }}>
              {data.direitoRecusa?.atividadeParalisada ? 'X' : ''}
            </Text>
            <Text style={{ flex: 1, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontWeight: 'bold', fontSize: 7 }}>
              {!data.direitoRecusa?.atividadeParalisada ? 'X' : ''}
            </Text>
          </View>
          <View style={[styles.row, { padding: 2 }]}>
            <Text style={{ fontSize: 6.5 }}>
              <Text style={styles.bold}>Qual foi o motivo da paralisação? </Text>
              {data.direitoRecusa?.motivoParalisacao || '-'}
            </Text>
          </View>

          {/* 16 - REGISTRO DE DESVIOS */}
          <View style={[styles.row, { backgroundColor: '#cbd5e1', alignItems: 'center' }]}>
            <Text style={[styles.bold, { flex: 5, padding: 2, fontSize: 6.8 }]}>16 - REGISTRO DE DESVIOS (QUASE ACIDENTES):</Text>
            <Text style={[styles.bold, { flex: 1, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontSize: 6.8 }]}>SIM</Text>
            <Text style={[styles.bold, { flex: 1, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontSize: 6.8 }]}>NÃO</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ flex: 5, padding: 2, fontSize: 6.5 }}>Você identificou algum desvio em seu local de trabalho?</Text>
            <Text style={{ flex: 1, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontWeight: 'bold', fontSize: 7 }}>
              {data.registroDesviosQuaseAcidentes?.desvioIdentificado ? 'X' : ''}
            </Text>
            <Text style={{ flex: 1, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontWeight: 'bold', fontSize: 7 }}>
              {!data.registroDesviosQuaseAcidentes?.desvioIdentificado ? 'X' : ''}
            </Text>
          </View>
          <View style={[styles.row, { padding: 2 }]}>
            <Text style={{ fontSize: 6.5 }}>
              <Text style={styles.bold}>Descreva o desvio encontrado: </Text>
              {data.registroDesviosQuaseAcidentes?.descricaoDesvio || '-'}
            </Text>
          </View>

          {/* 17 - DSS */}
          <View style={[styles.row, { backgroundColor: '#cbd5e1', alignItems: 'center' }]}>
            <Text style={[styles.bold, { flex: 4, padding: 2, fontSize: 6.8 }]}>17 - DIÁLOGO SEMANAL DE SEGURANÇA (DSS):</Text>
            <Text style={[styles.bold, { flex: 1.5, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontSize: 6.8 }]}>
              SIM ({data.dssDialogoSeguranca?.realizado ? 'X' : ' '})
            </Text>
            <Text style={[styles.bold, { flex: 1.5, textAlign: 'center', borderLeftWidth: 0.5, borderColor: '#000000', fontSize: 6.8 }]}>
              NÃO ({!data.dssDialogoSeguranca?.realizado ? 'X' : ' '})
            </Text>
          </View>
          <View style={[styles.row, { padding: 2 }]}>
            <Text style={{ fontSize: 6.5 }}>
              <Text style={styles.bold}>Tema abordado: </Text>
              {data.dssDialogoSeguranca?.temaAbordado || '-'}
            </Text>
          </View>

          {/* 18 - REGISTRO DE VISITA TÉCNICA */}
          <View style={[styles.row, { backgroundColor: '#cbd5e1', padding: 2 }]}>
            <Text style={[styles.bold, { fontSize: 6.8 }]}>18 - REGISTRO DE VISITA TÉCNICA:</Text>
          </View>
          {(() => {
            const rawVisitas = data.visitaTecnica || [];
            // Garante exibição de no mínimo 3 linhas conforme formulário oficial impresso
            const renderRows = [...rawVisitas];
            while (renderRows.length < 3) {
              renderRows.push({ nome: '', cargo: '', assinatura: undefined });
            }
            return renderRows.map((v, idx) => (
              <View key={idx} style={[styles.row, { alignItems: 'center', minHeight: 20 }]}>
                <View style={[styles.cell, { flex: 3.5 }]}>
                  <Text style={{ fontSize: 6.5 }}>
                    <Text style={styles.bold}>Nome: </Text>{v.nome || ''}
                  </Text>
                </View>
                <View style={[styles.cell, { flex: 2.5 }]}>
                  <Text style={{ fontSize: 6.5 }}>
                    <Text style={styles.bold}>Cargo: </Text>{v.cargo || ''}
                  </Text>
                </View>
                <View style={[styles.cellNoBorder, { flex: 2, alignItems: 'center', justifyContent: 'center' }]}>
                  {v.assinatura?.assinaturaBase64 ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      <Image
                        src={v.assinatura.assinaturaBase64}
                        style={{ maxHeight: 16, maxWidth: 80, objectFit: 'contain' }}
                      />
                    </View>
                  ) : (
                    <Text style={{ fontSize: 5.5, color: '#94a3b8' }}>
                      {v.nome ? 'Assinatura Pendente' : 'Assinatura:'}
                    </Text>
                  )}
                </View>
              </View>
            ));
          })()}

          {/* 19 - OBSERVAÇÕES COMPLEMENTARES */}
          <View style={[styles.row, { backgroundColor: '#cbd5e1', padding: 2 }]}>
            <Text style={[styles.bold, { fontSize: 6.8 }]}>19 - OBSERVAÇÕES COMPLEMENTARES:</Text>
          </View>
          <View style={{ padding: 2.5, minHeight: 18 }}>
            <Text style={{ fontSize: 6.5, color: '#0f172a' }}>
              {data.observacoesGerais?.trim() || 'Nenhuma observação complementar informada.'}
            </Text>
          </View>
        </View>
      </Page>
    );
  }

  export function PtReparoPdfDocument({ data, codigoPT }: PtReparoPdfProps) {
    return (
      <Document title={`Permissao_Trabalho_${codigoPT}`} author="TKE Elevadores">
        <PtReparoPdfPage1 data={data} codigoPT={codigoPT} />
        <PtReparoPdfPage2 data={data} codigoPT={codigoPT} />
      </Document>
    );
  }
