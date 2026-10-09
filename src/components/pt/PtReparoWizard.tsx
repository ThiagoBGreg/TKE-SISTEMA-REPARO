'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitPtReparoAction, updatePtReparoFullAction } from '@/actions/ptReparoActions';
import { getAprConfigAction } from '@/actions/aprConfigActions';
import type { AprRiskCategoryConfig, AprEpiConfig, AprItensPlanejamentoConfig } from '@/db/schema';
import { DEFAULT_ITENS_PLANEJAMENTO } from '@/lib/constants/aprConstants';
import { SignaturePad } from '@/components/pt/SignaturePad';
import { ptReparoSchema, type DigitalSignature, type PtReparoFormData } from '@/lib/validations/ptReparoSchema';

export interface PtPendingIssue {
  id: string;
  step: number;
  stepLabel: string;
  fieldLabel: string;
  motivo: string;
  targetId: string;
}

const DRAFT_KEY = 'tke_pt_wizard_draft_v2';

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
  serviceOrderId?: string;
  defaultContrato?: string;
  defaultEquipamento?: string;
  initialData?: PtReparoFormData | null;
  editingPermitId?: string | null;
  editingCodigo?: string | null;
  onCancelEdit?: () => void;
  onSuccessSubmit?: (workPermitId: string, codigo: string) => void;
}

export function PtReparoWizard({
  serviceOrderId = '',
  defaultContrato = '',
  defaultEquipamento = '',
  initialData = null,
  editingPermitId = null,
  editingCodigo = null,
  onCancelEdit,
  onSuccessSubmit,
}: PtReparoWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdPtInfo, setCreatedPtInfo] = useState<{ id: string; codigo: string } | null>(null);

  // Estados do Pop-up/Modal de Campos Obrigatórios Pendentes
  const [pendingIssues, setPendingIssues] = useState<PtPendingIssue[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [visitaSignatureModalIdx, setVisitaSignatureModalIdx] = useState<number | null>(null);

  // Configurações Dinâmicas da APR carregadas do banco de dados (Gerenciadas pelo Administrador)
  const [aprCategorias, setAprCategorias] = useState<AprRiskCategoryConfig[]>([]);
  const [aprEpis, setAprEpis] = useState<AprEpiConfig[]>([]);
  const [aprPlanejamento, setAprPlanejamento] = useState<AprItensPlanejamentoConfig>(DEFAULT_ITENS_PLANEJAMENTO);
  const [aprTitulo, setAprTitulo] = useState('APR Corporativa - TKE Reparos');
  const [aprRevisao, setAprRevisao] = useState('REV-2026.1');
  const [aprInstrucoes, setAprInstrucoes] = useState('');
  const [aprRegras, setAprRegras] = useState<string[]>([]);
  const [aprRespostasExtras, setAprRespostasExtras] = useState<Record<string, 'SIM' | 'NAO' | 'NAO_APLICAVEL'>>({});
  const [categoriasRiscoAtivas, setCategoriasRiscoAtivas] = useState<Record<string, boolean>>({});

  // Digitação de serviços e riscos extras ("Outro" com autopreenchimento)
  const [outroServicoInput, setOutroServicoInput] = useState('');
  const [outroRiscoInput, setOutroRiscoInput] = useState('');

  useEffect(() => {
    getAprConfigAction().then((res) => {
      if (res.success && res.config) {
        if (res.config.categoriasRisco && res.config.categoriasRisco.length > 0) {
          setAprCategorias(res.config.categoriasRisco);
        }
        if (res.config.episDisponiveis && res.config.episDisponiveis.length > 0) {
          setAprEpis(res.config.episDisponiveis);
        }
        if (res.config.itensPlanejamento) {
          setAprPlanejamento(res.config.itensPlanejamento);
        }
        if (res.config.titulo) setAprTitulo(res.config.titulo);
        if (res.config.revisao) setAprRevisao(res.config.revisao);
        if (res.config.instrucoesGerais) setAprInstrucoes(res.config.instrucoesGerais);
        if (res.config.regrasDeOuro) setAprRegras(res.config.regrasDeOuro);
      }
    });
  }, []);

  // Estado unificado do formulário - Se initialData for fornecido, inicializa com ele
  const [formData, setFormData] = useState<PtReparoFormData>(() => {
    if (initialData) return initialData;
    return {
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
    visitaTecnica: [
      { nome: '', cargo: '', assinatura: undefined },
      { nome: '', cargo: '', assinatura: undefined },
      { nome: '', cargo: '', assinatura: undefined },
    ],
    observacoesGerais: '',
  };
});

  const [draftRestored, setDraftRestored] = useState(false);

  // Sincroniza initialData caso seja atualizado externamente
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Restaura o rascunho salvo do localStorage na inicialização (somente para novas PTs)
  useEffect(() => {
    if (editingPermitId || initialData) return;
    try {
      if (typeof window === 'undefined') return;
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.formData) {
          setFormData((prev) => ({
            ...prev,
            ...parsed.formData,
            serviceOrderId: serviceOrderId || parsed.formData.serviceOrderId || '',
          }));
          if (parsed.currentStep) {
            setCurrentStep(parsed.currentStep);
          }
          if (parsed.categoriasRiscoAtivas) {
            setCategoriasRiscoAtivas(parsed.categoriasRiscoAtivas);
          }
          if (parsed.aprRespostasExtras) {
            setAprRespostasExtras(parsed.aprRespostasExtras);
          }
          setDraftRestored(true);
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar rascunho:', e);
    }
  }, [serviceOrderId, editingPermitId, initialData]);

  // Salva automaticamente no localStorage sempre que os dados ou etapa forem alterados (apenas novas PTs)
  useEffect(() => {
    if (editingPermitId || initialData) return;
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          formData,
          currentStep,
          categoriasRiscoAtivas,
          aprRespostasExtras,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {}
  }, [formData, currentStep, categoriasRiscoAtivas, aprRespostasExtras, editingPermitId, initialData]);

  const handleClearDraft = () => {
    if (confirm('Deseja realmente limpar o rascunho atual e recomeçar do zero?')) {
      try {
        localStorage.removeItem(DRAFT_KEY);
        window.location.reload();
      } catch {}
    }
  };

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

  // Manipuladores de Visita Técnica (Item 18)
  const handleUpdateVisitaTecnica = (index: number, field: 'nome' | 'cargo', value: string) => {
    setFormData((prev) => {
      const current = prev.visitaTecnica && prev.visitaTecnica.length > 0
        ? [...prev.visitaTecnica]
        : [
            { nome: '', cargo: '', assinatura: undefined },
            { nome: '', cargo: '', assinatura: undefined },
            { nome: '', cargo: '', assinatura: undefined },
          ];
      current[index] = { ...current[index], [field]: value };
      return { ...prev, visitaTecnica: current };
    });
  };

  const handleAddVisitaTecnica = () => {
    setFormData((prev) => ({
      ...prev,
      visitaTecnica: [
        ...(prev.visitaTecnica || []),
        { nome: '', cargo: '', assinatura: undefined },
      ],
    }));
  };

  const handleRemoveVisitaTecnica = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      visitaTecnica: (prev.visitaTecnica || []).filter((_, i) => i !== index),
    }));
  };

  const handleSetVisitaSignature = (index: number, sig: DigitalSignature | null) => {
    setFormData((prev) => {
      const current = [...(prev.visitaTecnica || [])];
      if (current[index]) {
        current[index] = { ...current[index], assinatura: sig || undefined };
      }
      return { ...prev, visitaTecnica: current };
    });
    setVisitaSignatureModalIdx(null);
  };

  // Funções para adicionar/remover serviços personalizados via 'Outro' com autopreenchimento
  const handleAddOutroServico = () => {
    const val = outroServicoInput.trim();
    if (!val) return;
    setFormData((prev) => {
      const novos = prev.servicosRealizados.includes(val)
        ? prev.servicosRealizados
        : [...prev.servicosRealizados, val];

      const outrosArr = prev.servicosOutros
        ? prev.servicosOutros.split(', ').filter(Boolean)
        : [];
      if (!outrosArr.includes(val)) outrosArr.push(val);

      return {
        ...prev,
        servicosRealizados: novos,
        servicosOutros: outrosArr.join(', '),
      };
    });
    setOutroServicoInput('');
  };

  const handleRemoveOutroServico = (servico: string) => {
    setFormData((prev) => {
      const outrosArr = (prev.servicosOutros || '')
        .split(', ')
        .map((s) => s.trim())
        .filter((s) => s !== servico && s !== '');

      return {
        ...prev,
        servicosRealizados: prev.servicosRealizados.filter((s) => s !== servico),
        servicosOutros: outrosArr.join(', '),
      };
    });
  };

  // Funções para adicionar/remover riscos personalizados via 'Outro'
  const handleAddOutroRisco = () => {
    const val = outroRiscoInput.trim();
    if (!val) return;
    setFormData((prev) => {
      const novos = prev.riscosPotenciais.includes(val)
        ? prev.riscosPotenciais
        : [...prev.riscosPotenciais, val];

      const outrosArr = prev.riscosOutros
        ? prev.riscosOutros.split(', ').filter(Boolean)
        : [];
      if (!outrosArr.includes(val)) outrosArr.push(val);

      return {
        ...prev,
        riscosPotenciais: novos,
        riscosOutros: outrosArr.join(', '),
      };
    });
    setOutroRiscoInput('');
  };

  const handleRemoveOutroRisco = (risco: string) => {
    setFormData((prev) => {
      const outrosArr = (prev.riscosOutros || '')
        .split(', ')
        .map((r) => r.trim())
        .filter((r) => r !== risco && r !== '');

      return {
        ...prev,
        riscosPotenciais: prev.riscosPotenciais.filter((r) => r !== risco),
        riscosOutros: outrosArr.join(', '),
      };
    });
  };

  // Helper para alternar se o risco de uma categoria é existente ou não (suporta categorias nativas e criadas pelo Admin)
  const handleToggleRiskCategoryExistente = (catId: string, existe: boolean) => {
    setCategoriasRiscoAtivas((prev) => ({ ...prev, [catId]: existe }));

    setFormData((prev) => {
      const copy = { ...prev, analiseRiscos: { ...prev.analiseRiscos } };
      if (catId === 'ALTURA') copy.analiseRiscos.alturaRiscoExistente = existe;
      else if (catId === 'ICAMENTO') copy.analiseRiscos.icamentoRiscoExistente = existe;
      else if (catId === 'ELETRICA') copy.analiseRiscos.eletricaRiscoExistente = existe;
      else if (catId === 'QUENTE') copy.analiseRiscos.quenteRiscoExistente = existe;
      return copy;
    });

    // Se marcou que o risco NÃO é aplicável à atividade, marca automaticamente as perguntas da categoria como N/A
    if (!existe) {
      const cat = aprCategorias.find((c) => c.id === catId);
      if (cat) {
        cat.itens.forEach((item) => {
          handleUpdateRiskAnswer(catId, item.id, 'NAO_APLICAVEL');
        });
      }
    }
  };

  // Helper para responder itens da APR (suporta itens nativos e novas perguntas criadas pelo Admin)
  const handleUpdateRiskAnswer = (
    catId: string,
    itemId: string,
    resposta: 'SIM' | 'NAO' | 'NAO_APLICAVEL'
  ) => {
    setAprRespostasExtras((prev) => ({ ...prev, [`${catId}_${itemId}`]: resposta }));

    setFormData((prev) => {
      const copy = { ...prev, analiseRiscos: { ...prev.analiseRiscos } };
      if (catId === 'ALTURA') {
        const keyMap: Record<string, keyof typeof copy.analiseRiscos.alturaItens> = {
          '7.1': 'sinalizacaoPavimentos',
          '7.2': 'dispositivosAncoragem',
          '7.3': 'andaimeBoasCondicoes',
          '7.4': 'protecoesColetivasCasaMaquinas',
          '7.5': 'entornoSeguro',
        };
        const target = keyMap[itemId];
        if (target) {
          copy.analiseRiscos.alturaItens = { ...copy.analiseRiscos.alturaItens, [target]: resposta };
        }
      } else if (catId === 'ICAMENTO') {
        const keyMap: Record<string, keyof typeof copy.analiseRiscos.icamentoItens> = {
          '7.6': 'equipamentosAdequados',
          '7.7': 'acessoriosAdequados',
          '7.8': 'ganchosAtestados',
          '7.9': 'redundanciaSeguranca',
          '7.10': 'areaProjecaoIsolada',
          '7.11': 'comunicacaoEquipe',
        };
        const target = keyMap[itemId];
        if (target) {
          copy.analiseRiscos.icamentoItens = { ...copy.analiseRiscos.icamentoItens, [target]: resposta };
        }
      } else if (catId === 'ELETRICA') {
        const keyMap: Record<string, keyof typeof copy.analiseRiscos.eletricaItens> = {
          '7.12': 'fiacaoIsolada',
          '7.13': 'aterramentoEDR',
          '7.14': 'kitBloqueioEletrico',
          '7.15': 'exigeBloqueioEletrico',
          '7.16': 'infiltracoesPresentes',
        };
        const target = keyMap[itemId];
        if (target) {
          copy.analiseRiscos.eletricaItens = { ...copy.analiseRiscos.eletricaItens, [target]: resposta };
        }
      } else if (catId === 'QUENTE') {
        const keyMap: Record<string, keyof typeof copy.analiseRiscos.quenteItens> = {
          '7.17': 'localDevidamenteIsolado',
          '7.18': 'livreMateriaisIncendio',
          '7.19': 'equipamentosCombateIncendioProximos',
          '7.20': 'capacitacaoTrabalhoQuente',
        };
        const target = keyMap[itemId];
        if (target) {
          copy.analiseRiscos.quenteItens = { ...copy.analiseRiscos.quenteItens, [target]: resposta };
        }
      }
      return copy;
    });
  };

  const getRiskItemCurrentVal = (catId: string, itemId: string): 'SIM' | 'NAO' | 'NAO_APLICAVEL' => {
    if (aprRespostasExtras[`${catId}_${itemId}`]) {
      return aprRespostasExtras[`${catId}_${itemId}`];
    }
    if (catId === 'ALTURA') {
      const keyMap: Record<string, keyof typeof formData.analiseRiscos.alturaItens> = {
        '7.1': 'sinalizacaoPavimentos',
        '7.2': 'dispositivosAncoragem',
        '7.3': 'andaimeBoasCondicoes',
        '7.4': 'protecoesColetivasCasaMaquinas',
        '7.5': 'entornoSeguro',
      };
      const key = keyMap[itemId];
      if (key && formData.analiseRiscos.alturaItens[key]) return formData.analiseRiscos.alturaItens[key];
    } else if (catId === 'ICAMENTO') {
      const keyMap: Record<string, keyof typeof formData.analiseRiscos.icamentoItens> = {
        '7.6': 'equipamentosAdequados',
        '7.7': 'acessoriosAdequados',
        '7.8': 'ganchosAtestados',
        '7.9': 'redundanciaSeguranca',
        '7.10': 'areaProjecaoIsolada',
        '7.11': 'comunicacaoEquipe',
      };
      const key = keyMap[itemId];
      if (key && formData.analiseRiscos.icamentoItens[key]) return formData.analiseRiscos.icamentoItens[key];
    } else if (catId === 'ELETRICA') {
      const keyMap: Record<string, keyof typeof formData.analiseRiscos.eletricaItens> = {
        '7.12': 'fiacaoIsolada',
        '7.13': 'aterramentoEDR',
        '7.14': 'kitBloqueioEletrico',
        '7.15': 'exigeBloqueioEletrico',
        '7.16': 'infiltracoesPresentes',
      };
      const key = keyMap[itemId];
      if (key && formData.analiseRiscos.eletricaItens[key]) return formData.analiseRiscos.eletricaItens[key];
    } else if (catId === 'QUENTE') {
      const keyMap: Record<string, keyof typeof formData.analiseRiscos.quenteItens> = {
        '7.17': 'localDevidamenteIsolado',
        '7.18': 'livreMateriaisIncendio',
        '7.19': 'equipamentosCombateIncendioProximos',
        '7.20': 'capacitacaoTrabalhoQuente',
      };
      const key = keyMap[itemId];
      if (key && formData.analiseRiscos.quenteItens[key]) return formData.analiseRiscos.quenteItens[key];
    }
    return 'NAO_APLICAVEL';
  };

  const isRiskCategoryExistente = (catId: string): boolean => {
    if (categoriasRiscoAtivas[catId] !== undefined) {
      return categoriasRiscoAtivas[catId];
    }
    if (catId === 'ALTURA') return formData.analiseRiscos.alturaRiscoExistente;
    if (catId === 'ICAMENTO') return formData.analiseRiscos.icamentoRiscoExistente;
    if (catId === 'ELETRICA') return formData.analiseRiscos.eletricaRiscoExistente;
    if (catId === 'QUENTE') return formData.analiseRiscos.quenteRiscoExistente;
    return true;
  };

  // Validação completa de campos pendentes com vinculação a elemento HTML para foco/scroll
  const getPendingIssues = (dataToValidate: PtReparoFormData): PtPendingIssue[] => {
    const issues: PtPendingIssue[] = [];

    // --- ETAPA 1: Identificação & Planejamento ---
    if (!dataToValidate.contratoOrcamento?.trim()) {
      issues.push({
        id: 'contratoOrcamento',
        step: 1,
        stepLabel: 'Contrato & Riscos',
        fieldLabel: '1. Nº Contrato / Orçamento',
        motivo: 'Número do contrato ou orçamento é obrigatório',
        targetId: 'input-contratoOrcamento',
      });
    }

    if (!dataToValidate.equipamento?.trim()) {
      issues.push({
        id: 'equipamento',
        step: 1,
        stepLabel: 'Contrato & Riscos',
        fieldLabel: '2. Equipamento (Nº/Edifício)',
        motivo: 'Identificação do equipamento ou condomínio é obrigatória',
        targetId: 'input-equipamento',
      });
    }

    if (!dataToValidate.tipoMaoDeObra?.trim()) {
      issues.push({
        id: 'tipoMaoDeObra',
        step: 1,
        stepLabel: 'Contrato & Riscos',
        fieldLabel: '3. Tipo de Mão de Obra',
        motivo: 'Selecione se a mão de obra é TKE ou Contratada',
        targetId: 'select-tipoMaoDeObra',
      });
    }

    if (!dataToValidate.tipoEquipamento?.trim()) {
      issues.push({
        id: 'tipoEquipamento',
        step: 1,
        stepLabel: 'Contrato & Riscos',
        fieldLabel: '4. Tipo de Equipamento',
        motivo: 'Selecione o tipo de equipamento (com ou sem casa de máquinas)',
        targetId: 'select-tipoEquipamento',
      });
    }

    if (!dataToValidate.classificacaoReparo?.trim()) {
      issues.push({
        id: 'classificacaoReparo',
        step: 1,
        stepLabel: 'Contrato & Riscos',
        fieldLabel: '5.4 Classificação do Reparo',
        motivo: 'Selecione se o reparo é Rotineiro ou Não Rotineiro',
        targetId: 'select-classificacaoReparo',
      });
    }

    if (!dataToValidate.servicosRealizados || dataToValidate.servicosRealizados.length === 0) {
      issues.push({
        id: 'servicosRealizados',
        step: 1,
        stepLabel: 'Contrato & Riscos',
        fieldLabel: '5.1 Serviços a Serem Realizados',
        motivo: 'Selecione ao menos um serviço da lista ou adicione em "Outro"',
        targetId: 'section-servicosRealizados',
      });
    }

    if (!dataToValidate.riscosPotenciais || dataToValidate.riscosPotenciais.length === 0) {
      issues.push({
        id: 'riscosPotenciais',
        step: 1,
        stepLabel: 'Contrato & Riscos',
        fieldLabel: '5.2 Riscos Potenciais Identificados',
        motivo: 'Selecione ao menos um risco potencial identificado no local',
        targetId: 'section-riscosPotenciais',
      });
    }

    // --- ETAPA 2: Checklists & EPIs ---
    if (!dataToValidate.episSelecionados || dataToValidate.episSelecionados.length === 0) {
      issues.push({
        id: 'episSelecionados',
        step: 2,
        stepLabel: 'Checklists & EPIs',
        fieldLabel: '10. EPIs Obrigatórios',
        motivo: 'Selecione os EPIs obrigatórios para a execução do reparo',
        targetId: 'section-episSelecionados',
      });
    }

    // --- ETAPA 3: Termo & Equipe ---
    if (!dataToValidate.termoCompromissoAceito) {
      issues.push({
        id: 'termoCompromissoAceito',
        step: 3,
        stepLabel: 'Termo & Equipe',
        fieldLabel: '11. Termo de Compromisso de Segurança',
        motivo: 'É obrigatório marcar o aceite do Termo de Compromisso',
        targetId: 'checkbox-termoCompromisso',
      });
    }

    if (!dataToValidate.equipeReparo || dataToValidate.equipeReparo.length === 0) {
      issues.push({
        id: 'equipeReparoVazia',
        step: 3,
        stepLabel: 'Termo & Equipe',
        fieldLabel: '13. Equipe Técnica de Campo',
        motivo: 'Adicione ao menos um integrante na equipe técnica',
        targetId: 'section-equipeReparo',
      });
    } else {
      dataToValidate.equipeReparo.forEach((m, idx) => {
        if (!m.nomeCompleto || m.nomeCompleto.trim().length < 2) {
          issues.push({
            id: `equipeNome-${idx}`,
            step: 3,
            stepLabel: 'Termo & Equipe',
            fieldLabel: `13. Nome do Integrante ${idx + 1}`,
            motivo: 'Preencha o nome completo do integrante técnico (mín. 2 letras)',
            targetId: `input-equipe-nome-${idx}`,
          });
        }
      });
    }

    // --- REGISTROS COMPLEMENTARES (Itens 15 a 17) ---
    if (dataToValidate.direitoRecusa?.atividadeParalisada && !dataToValidate.direitoRecusa?.motivoParalisacao?.trim()) {
      issues.push({
        id: 'direitoRecusaMotivo',
        step: 3,
        stepLabel: 'Termo & Equipe',
        fieldLabel: '15. Motivo da Paralisação (Direito de Recusa)',
        motivo: 'Informe o motivo da paralisação por questões de segurança',
        targetId: 'input-direitoRecusa-motivo',
      });
    }

    if (dataToValidate.registroDesviosQuaseAcidentes?.desvioIdentificado && !dataToValidate.registroDesviosQuaseAcidentes?.descricaoDesvio?.trim()) {
      issues.push({
        id: 'desvioDescricao',
        step: 3,
        stepLabel: 'Termo & Equipe',
        fieldLabel: '16. Descrição do Desvio Encontrado',
        motivo: 'Descreva o desvio ou quase acidente identificado no local',
        targetId: 'input-desvio-descricao',
      });
    }

    if (dataToValidate.dssDialogoSeguranca?.realizado && !dataToValidate.dssDialogoSeguranca?.temaAbordado?.trim()) {
      issues.push({
        id: 'dssTema',
        step: 3,
        stepLabel: 'Termo & Equipe',
        fieldLabel: '17. Tema Abordado no DSS',
        motivo: 'Informe o tema abordado no Diálogo Semanal de Segurança',
        targetId: 'input-dss-tema',
      });
    }

    // --- ETAPA 4: Assinaturas Digitais ---
    if (
      !dataToValidate.inicioServico?.emitenteAssinatura?.nome ||
      dataToValidate.inicioServico.emitenteAssinatura.nome.trim().length < 2
    ) {
      issues.push({
        id: 'inicioServicoNome',
        step: 4,
        stepLabel: 'Assinaturas',
        fieldLabel: '12. Nome do Responsável pelo Início',
        motivo: 'Nome do responsável pelo início do serviço é obrigatório',
        targetId: 'input-inicioServico-nome',
      });
    }

    if (!dataToValidate.inicioServico?.dataHoraInicio) {
      issues.push({
        id: 'inicioServicoDataHora',
        step: 4,
        stepLabel: 'Assinaturas',
        fieldLabel: '12. Data/Hora de Início',
        motivo: 'Informe a data e horário de início do serviço',
        targetId: 'input-inicioServico-dataHora',
      });
    }

    if (
      !dataToValidate.inicioServico?.emitenteAssinatura?.assinaturaBase64 ||
      dataToValidate.inicioServico.emitenteAssinatura.assinaturaBase64.length < 100
    ) {
      issues.push({
        id: 'inicioServicoAssinatura',
        step: 4,
        stepLabel: 'Assinaturas',
        fieldLabel: '12. Assinatura do Responsável pelo Início',
        motivo: 'Desenhe e confirme a assinatura digital do responsável',
        targetId: 'signature-inicioServico',
      });
    }

    if (dataToValidate.equipeReparo && dataToValidate.equipeReparo.length > 0) {
      dataToValidate.equipeReparo.forEach((m, idx) => {
        if (
          !m.assinatura?.assinaturaBase64 ||
          m.assinatura.assinaturaBase64.length < 100
        ) {
          issues.push({
            id: `equipeAssinatura-${idx}`,
            step: 4,
            stepLabel: 'Assinaturas',
            fieldLabel: `13. Assinatura do Integrante ${idx + 1} (${m.nomeCompleto?.trim() || 'Sem nome'})`,
            motivo: 'Desenhe e confirme a assinatura digital deste integrante',
            targetId: `signature-equipe-${idx}`,
          });
        }
      });
    }

    // Validação complementar com o Zod schema
    const zodResult = ptReparoSchema.safeParse(dataToValidate);
    if (!zodResult.success) {
      zodResult.error.issues.forEach((zi) => {
        const pathStr = zi.path.join('.');
        const alreadyCovered = issues.some(
          (i) => i.id === pathStr || i.targetId.includes(String(zi.path[0]))
        );
        if (!alreadyCovered) {
          let step = 1;
          let stepLabel = 'Contrato & Riscos';
          if (pathStr.includes('epis') || pathStr.includes('analiseRiscos') || pathStr.includes('checklist')) {
            step = 2;
            stepLabel = 'Checklists & EPIs';
          } else if (pathStr.includes('termo') || (pathStr.includes('equipe') && !pathStr.includes('assinatura')) || pathStr.includes('direitoRecusa') || pathStr.includes('dss') || pathStr.includes('visita')) {
            step = 3;
            stepLabel = 'Termo & Equipe';
          } else if (pathStr.includes('inicioServico') || pathStr.includes('assinatura')) {
            step = 4;
            stepLabel = 'Assinaturas';
          }

          issues.push({
            id: `zod-${pathStr}`,
            step,
            stepLabel,
            fieldLabel: `Campo: ${pathStr}`,
            motivo: zi.message,
            targetId: `input-${zi.path[0]}`,
          });
        }
      });
    }

    return issues;
  };

  // Leva o usuário diretamente até o campo pendente com transição suave e foco
  const handleGoToPendingIssue = (issue: PtPendingIssue) => {
    setShowPendingModal(false);
    setCurrentStep(issue.step);

    setTimeout(() => {
      const el = document.getElementById(issue.targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const inputChild =
          el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA'
            ? (el as HTMLElement)
            : (el.querySelector('input, select, textarea, button') as HTMLElement | null);
        if (inputChild && typeof inputChild.focus === 'function') {
          inputChild.focus();
        }
        el.classList.add('ring-4', 'ring-orange-500', 'ring-offset-2', 'bg-orange-50/50');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-orange-500', 'ring-offset-2', 'bg-orange-50/50');
        }, 3000);
      }
    }, 150);
  };

  const handleSubmit = async () => {
    setFormError(null);

    // Trata data e assinatura do supervisor caso não tenha assinado
    const hasSupervisorSig = !!formData.assinaturaSupervisao?.assinaturaBase64;
    const visitasFiltradas = (formData.visitaTecnica || []).filter((v) => v.nome && v.nome.trim() !== '');

    const dataToSubmit: PtReparoFormData = {
      ...formData,
      visitaTecnica: visitasFiltradas,
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

    // Verifica se há campos pendentes e abre o pop-up imediatamente
    const issues = getPendingIssues(dataToSubmit);
    if (issues.length > 0) {
      setPendingIssues(issues);
      setShowPendingModal(true);
      setFormError('Existem campos obrigatórios não preenchidos ou assinaturas pendentes.');
      return;
    }

    setIsSubmitting(true);
    let result;
    if (editingPermitId) {
      result = await updatePtReparoFullAction(editingPermitId, dataToSubmit);
    } else {
      result = await submitPtReparoAction(dataToSubmit);
    }
    setIsSubmitting(false);

    if (!result.success) {
      const refreshedIssues = getPendingIssues(dataToSubmit);
      if (refreshedIssues.length > 0) {
        setPendingIssues(refreshedIssues);
        setShowPendingModal(true);
      }
      setFormError(result.error || (editingPermitId ? 'Erro ao salvar alterações da APR.' : 'Erro ao submeter a Permissão de Trabalho.'));
      return;
    }

    try {
      if (!editingPermitId) {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {}

    if (onSuccessSubmit) {
      onSuccessSubmit(result.workPermitId, result.codigo);
    } else {
      setCreatedPtInfo({ id: result.workPermitId, codigo: result.codigo });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-50 min-h-screen p-2 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Banner de Modo de Edição em Andamento */}
      {editingPermitId && (
        <div className="bg-amber-500/10 border-2 border-amber-500 text-amber-950 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in">
          <div className="flex items-start gap-3">
            <span className="text-2xl sm:text-3xl">✏️</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-white font-extrabold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                  APR EM ANDAMENTO
                </span>
                <span className="font-bold text-sm sm:text-base text-slate-900">
                  Modo de Edição Operacional: {editingCodigo || `ID ${editingPermitId.slice(0, 8)}...`}
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1">
                Você está editando a APR enquanto o serviço está em execução. Pode alterar etapas, incluir novos membros ou registros e salvar as alterações.
              </p>
            </div>
          </div>
          {onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="bg-white hover:bg-amber-50 text-slate-700 hover:text-slate-900 border border-amber-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer shrink-0 shadow-2xs"
            >
              ✕ Cancelar Edição
            </button>
          )}
        </div>
      )}

      {/* Indicador de Salvamento em Tempo Real / Rascunho Recuperado (apenas novas) */}
      {!editingPermitId && draftRestored && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>💾</span>
            <span className="font-semibold">
              Rascunho recuperado automaticamente. Seus dados estão salvos continuamente no seu navegador.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearDraft}
            className="text-[11px] font-bold text-emerald-900 hover:text-red-600 underline shrink-0 transition"
          >
            Limpar Rascunho
          </button>
        </div>
      )}

      {/* Header com Branding TKE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase bg-orange-50 px-2.5 py-0.5 rounded-md border border-orange-200">
              {editingPermitId ? 'Edição Operacional' : 'TKE • Segurança em Reparos'}
            </span>
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
              {editingPermitId ? `PT: ${editingCodigo || 'Em andamento'}` : '💾 Auto-save ativo'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {editingPermitId ? `Editar APR: ${editingCodigo || ''}` : 'APR / Permissão de Trabalho (PT)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {editingPermitId
              ? 'Edite as informações e registros complementares da APR em execução.'
              : 'Versão 04 • Análise Preliminar de Risco e Autorização de Trabalho'}
          </p>
        </div>

        {/* Stepper Indicator Responsivo */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs font-semibold w-full sm:w-auto justify-between sm:justify-start">
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
            {editingPermitId
              ? `Permissão de Trabalho ${createdPtInfo.codigo} Atualizada com Sucesso!`
              : `Permissão de Trabalho ${createdPtInfo.codigo} Emitida com Sucesso!`}
          </h3>
          <p className="text-sm text-emerald-700 max-w-md mx-auto">
            {editingPermitId
              ? 'Todas as alterações, membros e registros complementares foram salvos e atualizados com sucesso.'
              : 'Todas as assinaturas digitais, dados de geolocalização e checklists de conformidade foram gravados no banco Neon Postgres com auditoria completa.'}
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
              onClick={() => {
                if (onCancelEdit) {
                  onCancelEdit();
                } else {
                  router.push('/dashboard/reparo/pt');
                }
              }}
              className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              Voltar à Lista de Permissões
            </button>
          </div>
        </div>
      )}

      {/* Erro de Validação com Atalho para o Pop-up de Pendências */}
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <span className="font-semibold">{formError}</span>
          </div>
          {pendingIssues.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPendingModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>Ver campos pendentes ({pendingIssues.length})</span>
              <span>→</span>
            </button>
          )}
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
                    id="input-contratoOrcamento"
                    value={formData.contratoOrcamento}
                    onChange={(e) =>
                      setFormData({ ...formData, contratoOrcamento: e.target.value })
                    }
                    placeholder="Ex: CT-99420/2026"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Equipamento (Nº/Edifício) *
                  </label>
                  <input
                    type="text"
                    id="input-equipamento"
                    value={formData.equipamento}
                    onChange={(e) =>
                      setFormData({ ...formData, equipamento: e.target.value })
                    }
                    placeholder="Ex: Elevador Social 01 - Torre Sul"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    3. Mão de Obra *
                  </label>
                  <select
                    id="select-tipoMaoDeObra"
                    value={formData.tipoMaoDeObra}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipoMaoDeObra: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                  >
                    {(aprPlanejamento.opcoesMaoDeObra?.filter((o) => o.ativo !== false).length > 0
                      ? aprPlanejamento.opcoesMaoDeObra.filter((o) => o.ativo !== false)
                      : [
                          { id: 'TKE', label: 'TKE (Equipe Própria)' },
                          { id: 'CONTRATADA', label: 'Empresa CONTRATADA' },
                        ]
                    ).map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(formData.tipoMaoDeObra === 'CONTRATADA' ||
                  formData.tipoMaoDeObra.toLowerCase().includes('contrat') ||
                  formData.tipoMaoDeObra.toLowerCase().includes('terceir')) && (
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
                    id="select-tipoEquipamento"
                    value={formData.tipoEquipamento}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipoEquipamento: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                  >
                    {(aprPlanejamento.tiposEquipamento?.filter((o) => o.ativo !== false).length > 0
                      ? aprPlanejamento.tiposEquipamento.filter((o) => o.ativo !== false)
                      : [
                          { id: 'COM_CASA_DE_MAQUINAS', label: 'Com casa de máquinas' },
                          { id: 'SEM_CASA_DE_MAQUINAS', label: 'Sem casa de máquinas (MRL)' },
                        ]
                    ).map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    5.4 Classificação do Reparo *
                  </label>
                  <select
                    id="select-classificacaoReparo"
                    value={formData.classificacaoReparo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        classificacaoReparo: e.target.value,
                      })
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none bg-white transition-all"
                  >
                    {(aprPlanejamento.classificacoesReparo?.filter((o) => o.ativo !== false).length > 0
                      ? aprPlanejamento.classificacoesReparo.filter((o) => o.ativo !== false)
                      : [
                          { id: 'ROTINEIRO', label: 'Rotineiro (instrução padrão)' },
                          { id: 'NAO_ROTINEIRO', label: 'Não Rotineiro (instrução específica)' },
                        ]
                    ).map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div id="section-trabalhoEmAltura">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      5.5 Trabalho em Altura (NR-35) *
                    </label>
                    <span className="text-[10px] font-bold text-slate-500">
                      {formData.trabalhoEmAltura ? 'Sim (Exige NR-35)' : 'Não'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, trabalhoEmAltura: true })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        formData.trabalhoEmAltura
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>✓</span>
                      <span>SIM</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, trabalhoEmAltura: false })}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        !formData.trabalhoEmAltura
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>✕</span>
                      <span>NÃO</span>
                    </button>
                  </div>
                  {formData.trabalhoEmAltura && (
                    <div className="mt-2 animate-in fade-in">
                      <label className="block text-[11px] font-semibold text-orange-950 mb-0.5">
                        Tipo de Supervisão em Altura:
                      </label>
                      <select
                        value={formData.tipoSupervisaoAltura || 'BASICA'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tipoSupervisaoAltura: e.target.value as 'BASICA' | 'DIRETA' | 'PT',
                          })
                        }
                        className="w-full text-xs border border-orange-300 bg-orange-50/50 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="BASICA">Supervisão Básica (Procedimento Padrão)</option>
                        <option value="DIRETA">Supervisão Direta (Presença Contínua)</option>
                        <option value="PT">Permissão de Trabalho Específica (PT)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* 5.1 Serviços a serem realizados */}
              <div id="section-servicosRealizados" className="space-y-3 rounded-xl p-2 transition-all">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900">
                    5.1 - Marque os Serviços a Serem Realizados *
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {formData.servicosRealizados.length} selecionado(s)
                  </span>
                </div>

                {/* Grid oficial dos serviços configurados pelo Administrador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {(aprPlanejamento.servicosRealizados?.length > 0
                    ? aprPlanejamento.servicosRealizados
                    : SERVICOS_LIST
                  ).map((servico) => {
                    const selected = formData.servicosRealizados.includes(servico);
                    return (
                      <button
                        key={servico}
                        type="button"
                        onClick={() => toggleArrayItem('servicosRealizados', servico)}
                        className={`text-left text-xs p-2.5 rounded-lg border transition cursor-pointer flex items-center gap-2 ${
                          selected
                            ? 'bg-red-50 border-red-500 text-red-900 font-semibold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-sm">{selected ? '☑' : '☐'}</span>
                        <span className="flex-1">{servico}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Bloco 'Outro' com Autopreenchimento de Serviços */}
                {aprPlanejamento.permiteOutroServico !== false && (
                  <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-white border border-amber-200/90 rounded-xl p-3.5 space-y-2.5 shadow-2xs mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span className="text-orange-500">➕</span> Outro Serviço (com Autopreenchimento Inteligente)
                      </label>
                      <span className="text-[10px] text-amber-800 font-medium bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200 w-fit">
                        💡 Digite ou escolha das sugestões
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        list="sugestoes-servicos-pt"
                        value={outroServicoInput}
                        onChange={(e) => setOutroServicoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOutroServico();
                          }
                        }}
                        placeholder="Digite o serviço ou selecione da lista (ex: Troca de sensor magnético)..."
                        className="flex-1 text-xs bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                      />

                      <datalist id="sugestoes-servicos-pt">
                        {[
                          ...(aprPlanejamento.sugestoesOutrosServicos || []),
                          'Troca de sensor magnético de parada',
                          'Troca de fita de posicionamento',
                          'Troca de patim de freio',
                          'Ajuste de limite de fim de curso',
                          'Substituição de soleira de pavimento',
                          'Troca de correia do operador de porta',
                          'Troca de roletes da corrediça',
                          'Ajuste de trincos de portas de pavimento',
                          'Reparo no painel de comando e inversores',
                          'Substituição de bateria de emergência',
                        ]
                          .filter((item, index, self) => self.indexOf(item) === index)
                          .map((sug, i) => (
                            <option key={i} value={sug} />
                          ))}
                      </datalist>

                      <button
                        type="button"
                        onClick={handleAddOutroServico}
                        disabled={!outroServicoInput.trim()}
                        className="btn-tke-orange px-3.5 py-2 text-xs font-bold shrink-0 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span>
                        <span>Adicionar</span>
                      </button>
                    </div>

                    {/* Tags dos serviços customizados adicionados */}
                    {formData.servicosRealizados.filter(
                      (s) =>
                        !(
                          aprPlanejamento.servicosRealizados?.length > 0
                            ? aprPlanejamento.servicosRealizados
                            : SERVICOS_LIST
                        ).includes(s)
                    ).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {formData.servicosRealizados
                          .filter(
                            (s) =>
                              !(
                                aprPlanejamento.servicosRealizados?.length > 0
                                  ? aprPlanejamento.servicosRealizados
                                  : SERVICOS_LIST
                              ).includes(s)
                          )
                          .map((custom) => (
                            <span
                              key={custom}
                              className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-950 border border-orange-300 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-2xs"
                            >
                              <span>✓ {custom}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOutroServico(custom)}
                                className="text-orange-600 hover:text-red-700 font-bold ml-1 rounded p-0.5 cursor-pointer"
                                title="Remover serviço"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 5.2 Riscos Potenciais */}
              <div id="section-riscosPotenciais" className="space-y-3 rounded-xl p-2 transition-all">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900">
                    5.2 - Riscos Potenciais Identificados *
                  </label>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {formData.riscosPotenciais.length} identificado(s)
                  </span>
                </div>

                {/* Grid oficial dos riscos configurados pelo Administrador */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(aprPlanejamento.riscosPotenciais?.length > 0
                    ? aprPlanejamento.riscosPotenciais
                    : RISCOS_LIST
                  ).map((risco) => {
                    const selected = formData.riscosPotenciais.includes(risco);
                    return (
                      <button
                        key={risco}
                        type="button"
                        onClick={() => toggleArrayItem('riscosPotenciais', risco)}
                        className={`text-left text-xs p-2 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                          selected
                            ? 'bg-amber-50 border-amber-500 text-amber-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{selected ? '⚠️' : '☐'}</span>
                        <span className="flex-1">{risco}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Bloco 'Outro' para Riscos Adicionais */}
                {aprPlanejamento.permiteOutroRisco !== false && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={outroRiscoInput}
                        onChange={(e) => setOutroRiscoInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOutroRisco();
                          }
                        }}
                        placeholder="Adicionar outro risco identificado no local (ex: piso escorregadio)..."
                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddOutroRisco}
                        disabled={!outroRiscoInput.trim()}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-white cursor-pointer disabled:opacity-50"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {/* Tags dos riscos customizados adicionados */}
                    {formData.riscosPotenciais.filter(
                      (r) =>
                        !(
                          aprPlanejamento.riscosPotenciais?.length > 0
                            ? aprPlanejamento.riscosPotenciais
                            : RISCOS_LIST
                        ).includes(r)
                    ).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {formData.riscosPotenciais
                          .filter(
                            (r) =>
                              !(
                                aprPlanejamento.riscosPotenciais?.length > 0
                                  ? aprPlanejamento.riscosPotenciais
                                  : RISCOS_LIST
                              ).includes(r)
                          )
                          .map((custom) => (
                            <span
                              key={custom}
                              className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold px-2 py-0.5 rounded-lg"
                            >
                              <span>⚠️ {custom}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOutroRisco(custom)}
                                className="text-amber-700 hover:text-red-700 font-bold ml-1 cursor-pointer"
                                title="Remover risco"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                )}
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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            formData.checklistSupervisao[
                              item.key as keyof typeof formData.checklistSupervisao
                            ] === opt
                              ? opt === 'SIM'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : opt === 'NAO'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-amber-400 text-slate-900 font-black shadow-xs border border-amber-500'
                              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {opt === 'NAO_APLICAVEL' ? 'N/A' : opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 7. Análise Preliminar de Risco (APR Dinâmica do Banco de Dados) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                        {aprTitulo}
                      </span>
                      <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                        {aprRevisao}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      7. Análise Preliminar de Risco (APR) - Verificação em Campo
                    </h3>
                  </div>
                  {aprInstrucoes && (
                    <p className="text-[11px] text-slate-500 max-w-md italic">
                      ℹ️ {aprInstrucoes}
                    </p>
                  )}
                </div>

                {/* Categorias de Risco da APR */}
                <div className="space-y-4">
                  {aprCategorias
                    .filter((cat) => cat.ativo)
                    .map((cat) => {
                      const isExistente = isRiskCategoryExistente(cat.id);

                      return (
                        <div
                          key={cat.id}
                          className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                <span>⚠️</span>
                                <span>{cat.titulo}</span>
                              </h4>
                              {cat.descricao && (
                                <p className="text-[11px] text-slate-500">{cat.descricao}</p>
                              )}
                            </div>

                            {/* Toggle de Risco Existente */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-slate-600 font-medium">
                                Risco Aplicável:
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRiskCategoryExistente(cat.id, true)}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    isExistente
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  SIM
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleRiskCategoryExistente(cat.id, false)}
                                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                    !isExistente
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  NÃO
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Perguntas da Categoria */}
                          <div className="divide-y divide-slate-100">
                            {cat.itens
                              .filter((item) => item.ativo)
                              .map((item) => {
                                const currentVal = getRiskItemCurrentVal(cat.id, item.id);

                                return (
                                  <div
                                    key={item.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between py-2 text-xs gap-2"
                                  >
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0 mt-0.5">
                                        [{item.id}]
                                      </span>
                                      <span className="text-slate-800">
                                        {item.label}
                                        {item.obrigatorio && (
                                          <span className="text-orange-600 font-bold ml-1">*</span>
                                        )}
                                      </span>
                                    </div>

                                    <div className="flex gap-1.5 shrink-0 self-end sm:self-center">
                                      {(['SIM', 'NAO', 'NAO_APLICAVEL'] as const).map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() =>
                                            handleUpdateRiskAnswer(cat.id, item.id, opt)
                                          }
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                                            currentVal === opt
                                              ? opt === 'SIM'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : opt === 'NAO'
                                                ? 'bg-rose-600 text-white shadow-xs'
                                                : 'bg-amber-400 text-slate-900 font-black shadow-xs border border-amber-500'
                                              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                                          }`}
                                        >
                                          {opt === 'NAO_APLICAVEL' ? 'N/A' : opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                </div>
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

                <div id="section-episSelecionados" className="rounded-xl p-2 transition-all">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-900">
                      10. Equipamentos de Proteção Individual (EPIs) *
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {formData.episSelecionados.length} selecionado(s)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {(aprEpis.length > 0
                      ? aprEpis.filter((e) => e.ativo).map((e) => e.nome)
                      : EPIS_LIST
                    ).map((epi) => {
                      const selected = formData.episSelecionados.includes(epi);
                      const epiConfig = aprEpis.find((e) => e.nome === epi);

                      return (
                        <button
                          key={epi}
                          type="button"
                          onClick={() => toggleArrayItem('episSelecionados', epi)}
                          className={`text-left text-xs p-2.5 rounded-xl border transition flex items-start justify-between gap-2 ${
                            selected
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div>{selected ? '🦺' : '☐'} {epi}</div>
                            {epiConfig?.ca && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                C.A. {epiConfig.ca}
                              </div>
                            )}
                          </div>
                          {epiConfig?.obrigatorioPadrao && (
                            <span className="text-[9px] font-bold bg-orange-100 text-orange-800 px-1 py-0.5 rounded shrink-0">
                              Obrigatório
                            </span>
                          )}
                        </button>
                      );
                    })}
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
              <div id="checkbox-termoCompromisso" className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2 transition-all">
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
              <div id="section-equipeReparo" className="space-y-3">
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
                  <div key={idx} id={`card-equipe-${idx}`} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 transition-all">
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
                      id={`input-equipe-nome-${idx}`}
                      value={membro.nomeCompleto}
                      onChange={(e) => {
                        const updated = [...formData.equipeReparo];
                        updated[idx].nomeCompleto = e.target.value;
                        updated[idx].assinatura.nome = e.target.value;
                        setFormData({ ...formData, equipeReparo: updated });
                      }}
                      placeholder="Nome completo do integrante"
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white transition-all"
                    />
                  </div>
                ))}
              </div>

              {/* REGISTROS COMPLEMENTARES (PREENCHER QUANDO APLICÁVEL) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-5">
                <div className="border-b border-slate-200 pb-2.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <span>📋</span>
                    <span>REGISTROS COMPLEMENTARES (PREENCHER QUANDO APLICÁVEL)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Preencha os registros adicionais de segurança, paralisações, desvios e visitas técnicas conforme modelo oficial.
                  </p>
                </div>

                {/* 15 - DIREITO DE RECUSA */}
                <div id="section-direitoRecusa" className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-amber-500">🛑</span>
                        <span>15 - DIREITO DE RECUSA</span>
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        A atividade foi paralisada por questões de segurança?
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            direitoRecusa: { ...formData.direitoRecusa, atividadeParalisada: true },
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          formData.direitoRecusa.atividadeParalisada
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            direitoRecusa: {
                              ...formData.direitoRecusa,
                              atividadeParalisada: false,
                              motivoParalisacao: '',
                            },
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          !formData.direitoRecusa.atividadeParalisada
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                  </div>

                  {formData.direitoRecusa.atividadeParalisada && (
                    <div className="animate-in fade-in space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Qual foi o motivo da paralisação? *
                      </label>
                      <input
                        type="text"
                        id="input-direitoRecusa-motivo"
                        value={formData.direitoRecusa.motivoParalisacao || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            direitoRecusa: {
                              ...formData.direitoRecusa,
                              motivoParalisacao: e.target.value,
                            },
                          })
                        }
                        placeholder="Descreva a condição de risco grave e iminente que justificou a paralisação..."
                        className="w-full text-xs border border-rose-300 rounded-lg px-3 py-2 bg-rose-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* 16 - REGISTRO DE DESVIOS (QUASE ACIDENTES) */}
                <div id="section-desvios" className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-orange-500">⚠️</span>
                        <span>16 - REGISTRO DE DESVIOS (QUASE ACIDENTES)</span>
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Você identificou algum desvio em seu local de trabalho?
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            registroDesviosQuaseAcidentes: {
                              ...formData.registroDesviosQuaseAcidentes,
                              desvioIdentificado: true,
                            },
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          formData.registroDesviosQuaseAcidentes.desvioIdentificado
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            registroDesviosQuaseAcidentes: {
                              ...formData.registroDesviosQuaseAcidentes,
                              desvioIdentificado: false,
                              descricaoDesvio: '',
                            },
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          !formData.registroDesviosQuaseAcidentes.desvioIdentificado
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                  </div>

                  {formData.registroDesviosQuaseAcidentes.desvioIdentificado && (
                    <div className="animate-in fade-in space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Descreva o desvio encontrado: *
                      </label>
                      <input
                        type="text"
                        id="input-desvio-descricao"
                        value={formData.registroDesviosQuaseAcidentes.descricaoDesvio || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            registroDesviosQuaseAcidentes: {
                              ...formData.registroDesviosQuaseAcidentes,
                              descricaoDesvio: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Falta de sinalização no pavimento, poço com umidade excessiva..."
                        className="w-full text-xs border border-amber-300 rounded-lg px-3 py-2 bg-amber-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* 17 - DIÁLOGO SEMANAL DE SEGURANÇA (DSS) */}
                <div id="section-dss" className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-blue-500">🗣️</span>
                        <span>17 - DIÁLOGO SEMANAL DE SEGURANÇA (DSS)</span>
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        Foi realizado Diálogo Semanal de Segurança antes do início da atividade?
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            dssDialogoSeguranca: { ...formData.dssDialogoSeguranca, realizado: true },
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          formData.dssDialogoSeguranca.realizado
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            dssDialogoSeguranca: {
                              ...formData.dssDialogoSeguranca,
                              realizado: false,
                              temaAbordado: '',
                            },
                          })
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          !formData.dssDialogoSeguranca.realizado
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                  </div>

                  {formData.dssDialogoSeguranca.realizado && (
                    <div className="animate-in fade-in space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Tema abordado: *
                      </label>
                      <input
                        type="text"
                        id="input-dss-tema"
                        value={formData.dssDialogoSeguranca.temaAbordado || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            dssDialogoSeguranca: {
                              ...formData.dssDialogoSeguranca,
                              temaAbordado: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Trabalho em altura NR-35, importância do uso do talabarte duplo..."
                        className="w-full text-xs border border-blue-300 rounded-lg px-3 py-2 bg-blue-50/40 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* 18 - REGISTRO DE VISITA TÉCNICA */}
                <div id="section-visitaTecnica" className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-purple-600">👷‍♂️</span>
                        <span>18 - REGISTRO DE VISITA TÉCNICA</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Preencha o nome, cargo e colha a assinatura de supervisores, TSTs ou visitantes técnicos no local.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVisitaTecnica}
                      className="text-xs text-orange-600 hover:text-orange-700 font-bold cursor-pointer self-start sm:self-auto bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition"
                    >
                      + Adicionar Linha
                    </button>
                  </div>

                  {/* Tabela de Visitas Técnicas */}
                  <div className="space-y-2">
                    {(formData.visitaTecnica && formData.visitaTecnica.length > 0
                      ? formData.visitaTecnica
                      : [
                          { nome: '', cargo: '', assinatura: undefined },
                          { nome: '', cargo: '', assinatura: undefined },
                          { nome: '', cargo: '', assinatura: undefined },
                        ]
                    ).map((visita, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 items-center text-xs"
                      >
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5 sm:hidden">
                            Nome:
                          </label>
                          <input
                            type="text"
                            placeholder={`Nome do visitante ${idx + 1}`}
                            value={visita.nome}
                            onChange={(e) => handleUpdateVisitaTecnica(idx, 'nome', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5 sm:hidden">
                            Cargo:
                          </label>
                          <input
                            type="text"
                            placeholder="Cargo (ex: Supervisor, TST)"
                            value={visita.cargo}
                            onChange={(e) => handleUpdateVisitaTecnica(idx, 'cargo', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                        <div className="sm:col-span-3 flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => setVisitaSignatureModalIdx(idx)}
                            className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                              visita.assinatura?.assinaturaBase64
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <span>{visita.assinatura?.assinaturaBase64 ? '✓' : '✍️'}</span>
                            <span>{visita.assinatura?.assinaturaBase64 ? 'Assinado' : 'Assinar'}</span>
                          </button>
                          {formData.visitaTecnica && formData.visitaTecnica.length > 3 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVisitaTecnica(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 font-bold text-xs cursor-pointer rounded"
                              title="Remover linha"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
                      id="input-inicioServico-nome"
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
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data/Hora de Início *
                    </label>
                    <input
                      type="datetime-local"
                      id="input-inicioServico-dataHora"
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
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 transition-all"
                    />
                  </div>
                </div>

                <div id="signature-inicioServico" className="rounded-xl transition-all">
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
              </div>

              {/* Assinaturas dos Integrantes da Equipe */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase">
                  13. Assinatura dos Integrantes da Equipe
                </h3>
                {formData.equipeReparo.map((membro, idx) => (
                  <div key={idx} id={`signature-equipe-${idx}`} className="rounded-xl transition-all">
                    <SignaturePad
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
                  </div>
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
                className="bg-slate-900 hover:bg-black text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
              >
                Próxima Etapa →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-6 py-3 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span> {editingPermitId ? 'Salvando Alterações na APR...' : 'Emitindo PT no Neon...'}
                  </>
                ) : (
                  editingPermitId ? '💾 Salvar Alterações na APR em Andamento' : '🔒 Emitir Permissão de Trabalho (PT)'
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pop-up / Modal Interativo de Campos Obrigatórios Pendentes */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-pendencias-titulo"
          >
            {/* Header com Alerta TKE */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 border-b border-orange-100 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                  ⚠️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-200">
                      Atenção • Campos Pendentes
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {pendingIssues.length} pendência{pendingIssues.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <h3
                    id="modal-pendencias-titulo"
                    className="text-base sm:text-lg font-bold text-slate-900 mt-1"
                  >
                    Pendências para Emissão da PT
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Preencha ou assine os itens abaixo para concluir a emissão com segurança:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPendingModal(false)}
                className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 p-1.5 rounded-xl transition cursor-pointer shrink-0"
                title="Fechar modal"
              >
                ✕
              </button>
            </div>

            {/* Lista de Itens Pendentes com Botão de Redirecionamento */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-2.5 divide-y divide-slate-100">
              {pendingIssues.map((issue, idx) => {
                const stepBadgeColors: Record<number, string> = {
                  1: 'bg-blue-50 text-blue-800 border-blue-200',
                  2: 'bg-amber-50 text-amber-800 border-amber-200',
                  3: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                  4: 'bg-rose-50 text-rose-800 border-rose-200',
                };

                return (
                  <div
                    key={issue.id || idx}
                    className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-orange-300 hover:bg-orange-50/20 transition group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            stepBadgeColors[issue.step] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          Etapa {issue.step} • {issue.stepLabel}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {issue.fieldLabel}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <span>ℹ️</span> {issue.motivo}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoToPendingIssue(issue)}
                      className="btn-tke-orange px-3.5 py-2 text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs rounded-xl"
                    >
                      <span>Ir para a pendência</span>
                      <span className="transition-transform group-hover:translate-x-0.5">→</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-xs text-slate-500 text-center sm:text-left">
                Clique no botão de cada item para ir direto ao campo.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {pendingIssues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleGoToPendingIssue(pendingIssues[0])}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Ir para 1ª pendência →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPendingModal(false)}
                  className="w-full sm:w-auto bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Assinatura Digital da Visita Técnica (Item 18) */}
      {visitaSignatureModalIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-5 space-y-4 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  Item 18 • Visita Técnica
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Assinatura do Visitante: {formData.visitaTecnica?.[visitaSignatureModalIdx]?.nome || `Visitante ${visitaSignatureModalIdx + 1}`}
                </h3>
                <p className="text-xs text-slate-500">
                  Cargo: {formData.visitaTecnica?.[visitaSignatureModalIdx]?.cargo || 'Não especificado'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVisitaSignatureModalIdx(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl border border-slate-200 transition cursor-pointer"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <SignaturePad
              label={`Assinatura: ${formData.visitaTecnica?.[visitaSignatureModalIdx]?.nome || 'Visitante Técnico'}`}
              signatarioNome={formData.visitaTecnica?.[visitaSignatureModalIdx]?.nome || 'Visitante Técnico'}
              signatarioCargo={formData.visitaTecnica?.[visitaSignatureModalIdx]?.cargo || 'Visita Técnica'}
              value={formData.visitaTecnica?.[visitaSignatureModalIdx]?.assinatura || null}
              onChange={(sig) => handleSetVisitaSignature(visitaSignatureModalIdx, sig)}
              required={false}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVisitaSignatureModalIdx(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Concluir / Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
