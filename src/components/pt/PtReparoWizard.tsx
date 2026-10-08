'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitPtReparoAction } from '@/actions/ptReparoActions';
import { SignaturePad } from '@/components/pt/SignaturePad';
import type { DigitalSignature, PtReparoFormData } from '@/lib/validations/ptReparoSchema';

/* ==========================================================================
   CONSTANTES DOS CHECKLISTS E LISTAS OFICIAIS (PT - REPARO TKE)
   ========================================================================== */

const SERVICOS_LIST = [
  'Equalizar cabos de tração',
  'Encurtar cabos de tração',
  'Substituir cabos de tração',
  'Substituir polia de tração',
  'Remover vazamento de máquina de tração',
  'Substituir rolamento da máquina de tração',
  'Substituir máquina de tração',
  'Desacunhar cabine',
  'Desacunhar contrapeso',
  'Retirar motor da máquina de tração',
  'Substituir corrente/cabo de compensação',
  'Encurtar corrente/cabo de compensação',
  'Encurtar cabo do regulador de velocidade',
  'Limpar cabos de tração',
  'Instalar iluminação na caixa de corrida',
  'Retificar guias',
  'Balancear cabina/contrapeso',
  'Revisar aparelho de segurança',
  'Limpeza geral',
];

const RISCOS_LIST = [
  'Corte',
  'Prensagem',
  'Queda de nível',
  'Queda de materiais/ferramentas',
  'Contato com partes móveis',
  'Movimentação e transporte de material',
  'Armazenamento inadequado',
  'Contato com eletricidade',
  'Iluminação inadequada',
  'Ruído',
  'Produto químico',
  'Ausência de organização e limpeza',
  'Poeiras',
  'Risco biológico',
];

const FERRAMENTAS_LIST = [
  'Cintas de poliéster',
  'Manilhas de segurança',
  'Gancho móvel',
  'Prensa cabos',
  'Guincho, minifor, talhas, máquina guincho e troller',
  'Haste telescópica',
  'Cavalete (enrolar e desenrolar cabos de aço)',
  'Pórtico',
  'Andaime metálico tipo mão francesa',
  'Limpador de cabos de tração (Rope Cleaner)',
];

const EPCS_LIST = [
  'Proteções de vãos abertos na casa de máquinas ou pavimentos',
  'Guarda-corpo sobre a cabine',
  'Sinalização de manutenção nos pavimentos',
  'Tela separatória de poço em equipamentos conjugados',
  'Proteção de partes móveis',
  'Regulador de velocidade instalado e testado',
];

const EPIS_LIST = [
  'Cinto segurança tipo paraquedista',
  'Talabarte 0,90m ou 1,60m',
  'Trava quedas',
  'Linha de vida',
  'Protetor para a linha de vida',
  'Eslingas',
  'Mosquetão automático',
  'Capacete de segurança com jugular',
  'Botina com biqueira de composite',
  'Óculos de segurança',
  'Protetor auricular tipo concha',
  'Creme de proteção para as mãos',
  'Luva contra risco mecânico',
  'Luva nitrílica',
  'Luva vaqueta',
  'Protetor facial',
  'Luva de raspa',
  'Blusão de raspa/máscara de solda',
  'Máscaras PFF1 ou PFF 2',
  'Gel de limpeza para as mãos',
];

interface PtReparoWizardProps {
  serviceOrderId: string;
  defaultContrato?: string;
  defaultEquipamento?: string;
}

export function PtReparoWizard({
  serviceOrderId,
  defaultContrato = '',
  defaultEquipamento = '',
}: PtReparoWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdPtInfo, setCreatedPtInfo] = useState<{ id: string; codigo: string } | null>(null);

  // Estado unificado do formulário - Campos em branco e sem pré-preenchimento
  const [formData, setFormData] = useState<PtReparoFormData>({
    serviceOrderId: serviceOrderId || '',
    contratoOrcamento: defaultContrato || '',
    equipamento: defaultEquipamento || '',
    tipoMaoDeObra: 'TKE',
    empresaContratada: '',
    tipoEquipamento: 'COM_CASA_DE_MAQUINAS',

    servicosRealizados: [],
    servicosOutros: '',
    riscosPotenciais: [],
    riscosOutros: '',
    tipoReparo: 'SUSPENSAO_TRACAO',
    tipoReparoOutros: '',
    classificacaoReparo: 'ROTINEIRO',
    trabalhoEmAltura: false,
    tipoSupervisaoAltura: 'BASICA',

    checklistSupervisao: {
      instrucaoReparo: 'NAO_APLICAVEL',
      treinamentoCapacitacao: 'NAO_APLICAVEL',
      treinamentosNormas: 'NAO_APLICAVEL',
      ferramentaisNecessarios: 'NAO_APLICAVEL',
      adendoContratualAssinado: 'NAO_APLICAVEL',
      episNecessarios: 'NAO_APLICAVEL',
    },
    dataAutorizacaoSupervisao: '',
    assinaturaSupervisao: null,

    analiseRiscos: {
      alturaRiscoExistente: false,
      alturaItens: {
        sinalizacaoPavimentos: 'NAO_APLICAVEL',
        dispositivosAncoragem: 'NAO_APLICAVEL',
        andaimeBoasCondicoes: 'NAO_APLICAVEL',
        protecoesColetivasCasaMaquinas: 'NAO_APLICAVEL',
        entornoSeguro: 'NAO_APLICAVEL',
      },
      icamentoRiscoExistente: false,
      icamentoItens: {
        equipamentosAdequados: 'NAO_APLICAVEL',
        acessoriosAdequados: 'NAO_APLICAVEL',
        ganchosAtestados: 'NAO_APLICAVEL',
        redundanciaSeguranca: 'NAO_APLICAVEL',
        areaProjecaoIsolada: 'NAO_APLICAVEL',
        comunicacaoEquipe: 'NAO_APLICAVEL',
      },
      eletricaRiscoExistente: false,
      eletricaItens: {
        fiacaoIsolada: 'NAO_APLICAVEL',
        aterramentoEDR: 'NAO_APLICAVEL',
        kitBloqueioEletrico: 'NAO_APLICAVEL',
        exigeBloqueioEletrico: 'NAO_APLICAVEL',
        infiltracoesPresentes: 'NAO_APLICAVEL',
      },
      quenteRiscoExistente: false,
      quenteItens: {
        localDevidamenteIsolado: 'NAO_APLICAVEL',
        livreMateriaisIncendio: 'NAO_APLICAVEL',
        equipamentosCombateIncendioProximos: 'NAO_APLICAVEL',
        capacitacaoTrabalhoQuente: 'NAO_APLICAVEL',
      },
    },

    ferramentasSelecionadas: [],
    ferramentasKitTesterNum: '',
    ferramentasOutros: '',

    epcsSelecionados: [],
    epcsOutros: '',

    episSelecionados: [],
    episOutros: '',

    termoCompromissoAceito: false,

    inicioServico: {
      dataHoraInicio: '',
      emitenteAssinatura: {
        nome: '',
        cargo: 'TECNICO',
        assinaturaBase64: '',
        timestamp: '',
      },
    },

    equipeReparo: [
      {
        nomeCompleto: '',
        assinatura: {
          nome: '',
          assinaturaBase64: '',
          timestamp: '',
        },
      },
    ],

    terminoServico: null,

    direitoRecusa: {
      atividadeParalisada: false,
      motivoParalisacao: '',
    },
    registroDesviosQuaseAcidentes: {
      desvioIdentificado: false,
      descricaoDesvio: '',
    },
    dssDialogoSeguranca: {
      realizado: false,
      temaAbordado: '',
    },
    observacoesGerais: '',
  });

  // Toggle de itens em arrays (serviços, riscos, ferramentas, epcs, epis)
  const toggleArrayItem = (field: keyof PtReparoFormData, item: string) => {
    setFormData((prev) => {
      const currentList = (prev[field] as string[]) || [];
      const updated = currentList.includes(item)
        ? currentList.filter((i) => i !== item)
        : [...currentList, item];
      return { ...prev, [field]: updated };
    });
  };

  const handleAddEquipeMember = () => {
    setFormData((prev) => ({
      ...prev,
      equipeReparo: [
        ...prev.equipeReparo,
        {
          nomeCompleto: '',
          assinatura: { nome: '', assinaturaBase64: '', timestamp: '' },
        },
      ],
    }));
  };

  const handleRemoveEquipeMember = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      equipeReparo: prev.equipeReparo.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    setIsSubmitting(true);

    // Trata data e assinatura do supervisor caso não tenha assinado
    const hasSupervisorSig = !!formData.assinaturaSupervisao?.assinaturaBase64;
    const dataToSubmit: PtReparoFormData = {
      ...formData,
      inicioServico: {
        ...formData.inicioServico,
        dataHoraInicio:
          formData.inicioServico.dataHoraInicio || new Date().toISOString().slice(0, 16),
      },
      assinaturaSupervisao: hasSupervisorSig ? formData.assinaturaSupervisao : null,
      dataAutorizacaoSupervisao: hasSupervisorSig
        ? formData.dataAutorizacaoSupervisao || new Date().toLocaleDateString('pt-BR')
        : null,
    };

    const result = await submitPtReparoAction(dataToSubmit);

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Erro ao submeter a Permissão de Trabalho.');
      return;
    }

    setCreatedPtInfo({ id: result.workPermitId, codigo: result.codigo });
  };

  return (
    <div className="max-w-4xl mx-auto bg-slate-50 min-h-screen p-4 sm:p-6 space-y-6">
      {/* Header com Branding TKE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-red-600 tracking-wider uppercase">
            TKE • Segurança em Reparos
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            APR / Permissão de Trabalho (PT)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Versão 04 • Análise Preliminar de Risco e Autorização de Trabalho
          </p>
        </div>

        {/* Stepper Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold">
          {[1, 2, 3, 4].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={`px-3 py-1.5 rounded-lg transition ${
                currentStep === step
                  ? 'bg-red-600 text-white shadow-sm'
                  : currentStep > step
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {step === 1 && '1. Contrato & Riscos'}
              {step === 2 && '2. Checklists'}
              {step === 3 && '3. Termo & Equipe'}
              {step === 4 && '4. Assinaturas'}
            </button>
          ))}
        </div>
      </div>

      {/* Alerta de Sucesso com Download de PDF */}
      {createdPtInfo && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 shadow-sm animate-in fade-in">
          <div className="text-3xl">🎉</div>
          <h3 className="text-lg font-bold text-emerald-900">
            Permissão de Trabalho {createdPtInfo.codigo} Emitida com Sucesso!
          </h3>
          <p className="text-sm text-emerald-700 max-w-md mx-auto">
            Todas as assinaturas digitais, dados de geolocalização e checklists de conformidade foram gravados no banco Neon Postgres com auditoria completa.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <a
              href={`/api/pt/${createdPtInfo.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
            >
              📄 Visualizar / Baixar PDF Oficial
            </a>
            <button
              type="button"
              onClick={() => router.push('/dashboard/reparo')}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              Voltar ao Painel
            </button>
          </div>
        </div>
      )}

      {/* Erro de Validação */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl flex items-center gap-2">
          <span>⚠️</span>
          <span>{formError}</span>
        </div>
      )}

      {!createdPtInfo && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          {/* ================================================================
              ETAPA 1: CONTRATO, EQUIPAMENTO, SERVIÇOS E RISCOS
              ================================================================ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                1 a 5. Identificação & Planejamento das Atividades
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Nº Contrato / Orçamento *
                  </label>
                  <input
                    type="text"
                    value={formData.contratoOrcamento}
                    onChange={(e) =>
                      setFormData({ ...formData, contratoOrcamento: e.target.value })
                    }
                    placeholder="Ex: CT-99420/2026"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Equipamento (Nº/Edifício) *
                  </label>
                  <input
                    type="text"
                    value={formData.equipamento}
                    onChange={(e) =>
                      setFormData({ ...formData, equipamento: e.target.value })
                    }
                    placeholder="Ex: Elevador Social 01 - Torre Sul"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Mão de Obra *
                  </label>
                  <select
                    value={formData.tipoMaoDeObra}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipoMaoDeObra: e.target.value as 'TKE' | 'CONTRATADA',
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="TKE">TKE (Equipe Própria)</option>
                    <option value="CONTRATADA">Empresa CONTRATADA</option>
                  </select>
                </div>

                {formData.tipoMaoDeObra === 'CONTRATADA' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Razão Social da Contratada
                    </label>
                    <input
                      type="text"
                      value={formData.empresaContratada}
                      onChange={(e) =>
                        setFormData({ ...formData, empresaContratada: e.target.value })
                      }
                      placeholder="Nome da empresa parceira"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    4. Tipo de Equipamento *
                  </label>
                  <select
                    value={formData.tipoEquipamento}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipoEquipamento: e.target.value as
                          | 'COM_CASA_DE_MAQUINAS'
                          | 'SEM_CASA_DE_MAQUINAS',
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="COM_CASA_DE_MAQUINAS">Com casa de máquinas</option>
                    <option value="SEM_CASA_DE_MAQUINAS">Sem casa de máquinas (MRL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    5.4 Classificação do Reparo *
                  </label>
                  <select
                    value={formData.classificacaoReparo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        classificacaoReparo: e.target.value as 'ROTINEIRO' | 'NAO_ROTINEIRO',
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="ROTINEIRO">Rotineiro (instrução padrão)</option>
                    <option value="NAO_ROTINEIRO">Não Rotineiro (instrução específica)</option>
                  </select>
                </div>
              </div>

              {/* 5.1 Serviços a serem realizados */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  5.1 - Marque os Serviços a Serem Realizados *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {SERVICOS_LIST.map((servico) => {
                    const selected = formData.servicosRealizados.includes(servico);
                    return (
                      <button
                        key={servico}
                        type="button"
                        onClick={() => toggleArrayItem('servicosRealizados', servico)}
                        className={`text-left text-xs p-2.5 rounded-lg border transition ${
                          selected
                            ? 'bg-red-50 border-red-500 text-red-900 font-semibold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {selected ? '☑' : '☐'} {servico}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5.2 Riscos Potenciais */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  5.2 - Riscos Potenciais Identificados *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {RISCOS_LIST.map((risco) => {
                    const selected = formData.riscosPotenciais.includes(risco);
                    return (
                      <button
                        key={risco}
                        type="button"
                        onClick={() => toggleArrayItem('riscosPotenciais', risco)}
                        className={`text-left text-xs p-2 rounded-lg border transition ${
                          selected
                            ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {selected ? '⚠️' : '☐'} {risco}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 2: CHECKLISTS DE SEGURANÇA, ALTURA, IÇAMENTO, ELÉTRICA & EPIS
              ================================================================ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                6 a 10. Checklists de Segurança & Equipamentos
              </h2>

              {/* 6. Checklist Preliminar da Supervisão */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  6. Checklist Preliminar de Uso Exclusivo da Supervisão
                </h3>
                {[
                  { key: 'instrucaoReparo', label: '6.1 Trabalhadores possuem instrução para o reparo?' },
                  { key: 'treinamentoCapacitacao', label: '6.2 Trabalhadores possuem treinamento e capacitação?' },
                  { key: 'treinamentosNormas', label: '6.3 Treinamentos de segurança NR-10, NR-18 e NR-35 em dia?' },
                  { key: 'ferramentaisNecessarios', label: '6.4 Possuem os ferramentais necessários?' },
                  { key: 'adendoContratualAssinado', label: '6.5 Adendo contratual está assinado?' },
                  { key: 'episNecessarios', label: '6.6 Possuem todos os EPIs necessários?' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1 border-b border-slate-200 gap-2"
                  >
                    <span className="text-slate-800">{item.label}</span>
                    <div className="flex gap-1">
                      {(['SIM', 'NAO', 'NAO_APLICAVEL'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              checklistSupervisao: {
                                ...formData.checklistSupervisao,
                                [item.key]: opt,
                              },
                            })
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                            formData.checklistSupervisao[
                              item.key as keyof typeof formData.checklistSupervisao
                            ] === opt
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 8, 9, 10: Ferramentais, EPCs e EPIs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    8. Lista de Ferramental para o Dia de Hoje
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FERRAMENTAS_LIST.map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggleArrayItem('ferramentasSelecionadas', tool)}
                        className={`text-left text-xs p-2 rounded-lg border transition ${
                          formData.ferramentasSelecionadas.includes(tool)
                            ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {formData.ferramentasSelecionadas.includes(tool) ? '🔧' : '☐'} {tool}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    9. Equipamentos de Proteção Coletiva (EPCs)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EPCS_LIST.map((epc) => (
                      <button
                        key={epc}
                        type="button"
                        onClick={() => toggleArrayItem('epcsSelecionados', epc)}
                        className={`text-left text-xs p-2 rounded-lg border transition ${
                          formData.epcsSelecionados.includes(epc)
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {formData.epcsSelecionados.includes(epc) ? '🛡️' : '☐'} {epc}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5">
                    10. Equipamentos de Proteção Individual (EPIs) *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {EPIS_LIST.map((epi) => (
                      <button
                        key={epi}
                        type="button"
                        onClick={() => toggleArrayItem('episSelecionados', epi)}
                        className={`text-left text-xs p-2 rounded-lg border transition ${
                          formData.episSelecionados.includes(epi)
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        {formData.episSelecionados.includes(epi) ? '🦺' : '☐'} {epi}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 3: REGISTROS COMPLEMENTARES, TERMO E EQUIPE
              ================================================================ */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
                11 a 19. Termo de Compromisso & Equipe Técnica
              </h2>

              {/* 11. Termo de Compromisso */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                <h3 className="text-xs font-bold text-amber-900">11 - Termo de Compromisso</h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Declaro que fui orientado a partir deste formulário devidamente preenchido, o qual abrange todos os riscos inerentes aos trabalhos a serem executados no dia de HOJE, ficando ciente de todos os EPCs, EPIs e recursos que deverão ser utilizados na prevenção de incidentes/acidentes.
                </p>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-900 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.termoCompromissoAceito}
                    onChange={(e) =>
                      setFormData({ ...formData, termoCompromissoAceito: e.target.checked as true })
                    }
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <span>Li e aceito integralmente o Termo de Compromisso de Segurança</span>
                </label>
              </div>

              {/* 13. Integrantes da Equipe de Reparo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    13 - Integrantes da Equipe Técnica de Campo
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddEquipeMember}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    + Adicionar Integrante
                  </button>
                </div>

                {formData.equipeReparo.map((membro, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-slate-700">
                        Nome do Técnico {idx + 1}
                      </label>
                      {formData.equipeReparo.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEquipeMember(idx)}
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={membro.nomeCompleto}
                      onChange={(e) => {
                        const updated = [...formData.equipeReparo];
                        updated[idx].nomeCompleto = e.target.value;
                        updated[idx].assinatura.nome = e.target.value;
                        setFormData({ ...formData, equipeReparo: updated });
                      }}
                      placeholder="Nome completo do integrante"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* 19. Observações Gerais */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  19. Observações Complementares
                </label>
                <textarea
                  rows={3}
                  value={formData.observacoesGerais}
                  onChange={(e) => setFormData({ ...formData, observacoesGerais: e.target.value })}
                  placeholder="Informações adicionais do local, condições climáticas ou restrições do cliente..."
                  className="w-full text-sm border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          {/* ================================================================
              ETAPA 4: PAINEL DE ASSINATURAS DIGITAIS
              ================================================================ */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Painel de Assinaturas Digitais com Metadados
                </h2>
                <p className="text-xs text-slate-500">
                  As assinaturas são criptografadas e vinculadas às coordenadas de geolocalização e carimbo temporal UTC.
                </p>
              </div>

              {/* Assinatura Supervisão Técnica (Opcional) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase">
                    6. Assinatura do Emitente (Supervisão Técnica) - Opcional
                  </h3>
                  <span className="text-[11px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-full">
                    Não Obrigatório
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome do Supervisor (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Nome do supervisor técnico (opcional)"
                      value={formData.assinaturaSupervisao?.nome || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assinaturaSupervisao: {
                            nome: e.target.value,
                            cargo: 'SUPERVISOR',
                            assinaturaBase64: formData.assinaturaSupervisao?.assinaturaBase64 || '',
                            timestamp: formData.assinaturaSupervisao?.timestamp || '',
                          },
                        })
                      }
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de Autorização (Opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.dataAutorizacaoSupervisao || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, dataAutorizacaoSupervisao: e.target.value })
                      }
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    />
                  </div>
                </div>
                <SignaturePad
                  label="Desenhar Assinatura da Supervisão Técnica (Opcional)"
                  signatarioNome={formData.assinaturaSupervisao?.nome || 'Supervisor Técnico'}
                  signatarioCargo="Supervisão Técnica"
                  value={
                    formData.assinaturaSupervisao?.assinaturaBase64
                      ? formData.assinaturaSupervisao
                      : null
                  }
                  onChange={(sig) => {
                    setFormData({ ...formData, assinaturaSupervisao: sig || null });
                  }}
                  required={false}
                />
              </div>

              {/* Assinatura Início dos Serviços */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      12. Nome do Responsável pelo Início *
                    </label>
                    <input
                      type="text"
                      value={formData.inicioServico.emitenteAssinatura.nome}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inicioServico: {
                            ...formData.inicioServico,
                            emitenteAssinatura: {
                              ...formData.inicioServico.emitenteAssinatura,
                              nome: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data/Hora de Início *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.inicioServico.dataHoraInicio}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inicioServico: {
                            ...formData.inicioServico,
                            dataHoraInicio: e.target.value,
                          },
                        })
                      }
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <SignaturePad
                  label="12. Assinatura do Responsável pelo Início"
                  signatarioNome={formData.inicioServico.emitenteAssinatura.nome}
                  value={
                    formData.inicioServico.emitenteAssinatura.assinaturaBase64
                      ? formData.inicioServico.emitenteAssinatura
                      : null
                  }
                  onChange={(sig) => {
                    if (sig) {
                      setFormData({
                        ...formData,
                        inicioServico: {
                          ...formData.inicioServico,
                          emitenteAssinatura: sig,
                        },
                      });
                    }
                  }}
                  required
                />
              </div>

              {/* Assinaturas dos Integrantes da Equipe */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  13. Assinatura dos Integrantes da Equipe
                </h3>
                {formData.equipeReparo.map((membro, idx) => (
                  <SignaturePad
                    key={idx}
                    label={`Assinatura do Integrante ${idx + 1}`}
                    signatarioNome={membro.nomeCompleto || `Integrante ${idx + 1}`}
                    value={membro.assinatura.assinaturaBase64 ? membro.assinatura : null}
                    onChange={(sig) => {
                      if (sig) {
                        const updated = [...formData.equipeReparo];
                        updated[idx].assinatura = sig;
                        setFormData({ ...formData, equipeReparo: updated });
                      }
                    }}
                    required
                  />
                ))}
              </div>
            </div>
          )}

          {/* Navegação entre Etapas */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              >
                ← Voltar
              </button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="bg-slate-900 hover:bg-black text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition"
              >
                Próxima Etapa →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-md transition flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span> Emitindo PT no Neon...
                  </>
                ) : (
                  '🔒 Emitir Permissão de Trabalho (PT)'
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
