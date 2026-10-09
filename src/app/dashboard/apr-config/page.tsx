'use client';

import React, { useEffect, useState, useTransition } from 'react';
import {
  getAprConfigAction,
  saveAprConfigAction,
  resetAprConfigAction,
} from '@/actions/aprConfigActions';
import {
  DEFAULT_APR_CATEGORIES,
  DEFAULT_EPIS,
  DEFAULT_REGRAS_DE_OURO,
  DEFAULT_ITENS_PLANEJAMENTO,
} from '@/lib/constants/aprConstants';
import type {
  AprRiskCategoryConfig,
  AprRiskItemConfig,
  AprEpiConfig,
  AprItensPlanejamentoConfig,
  AprOpcaoConfig,
} from '@/db/schema';
import { useRBAC } from '@/hooks/useRBAC';

export default function AprConfigPage() {
  const { user } = useRBAC();
  const [isPendingTransition, startTransition] = useTransition();

  // Estados dos dados da APR
  const [titulo, setTitulo] = useState('APR Corporativa - TKE Reparos');
  const [revisao, setRevisao] = useState('REV-2026.1');
  const [instrucoesGerais, setInstrucoesGerais] = useState('');
  const [regrasDeOuro, setRegrasDeOuro] = useState<string[]>([]);
  const [categoriasRisco, setCategoriasRisco] = useState<AprRiskCategoryConfig[]>([]);
  const [episDisponiveis, setEpisDisponiveis] = useState<AprEpiConfig[]>([]);
  const [itensPlanejamento, setItensPlanejamento] = useState<AprItensPlanejamentoConfig>(DEFAULT_ITENS_PLANEJAMENTO);
  const [ultimaModificacao, setUltimaModificacao] = useState<string | null>(null);
  const [autorUltimaModificacao, setAutorUltimaModificacao] = useState<string | null>(null);

  // Navegação por abas
  const [activeTab, setActiveTab] = useState<'planejamento' | 'riscos' | 'epis' | 'regras'>('planejamento');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('ALTURA');

  // Inputs temporários para novos itens
  const [novoServicoTexto, setNovoServicoTexto] = useState('');
  const [novoRiscoTexto, setNovoRiscoTexto] = useState('');
  const [novaSugestaoTexto, setNovaSugestaoTexto] = useState('');
  const [novoTipoEquipTexto, setNovoTipoEquipTexto] = useState('');
  const [novaClassificacaoTexto, setNovaClassificacaoTexto] = useState('');
  const [novaMaoDeObraTexto, setNovaMaoDeObraTexto] = useState('');

  // Notificações
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Carrega a configuração do servidor
  const loadConfig = () => {
    startTransition(async () => {
      const res = await getAprConfigAction();
      if (res.success && res.config) {
        setTitulo(res.config.titulo || 'APR Corporativa - TKE Reparos');
        setRevisao(res.config.revisao || 'REV-2026.1');
        setInstrucoesGerais(res.config.instrucoesGerais || '');
        setRegrasDeOuro(res.config.regrasDeOuro || DEFAULT_REGRAS_DE_OURO);
        setCategoriasRisco(res.config.categoriasRisco || DEFAULT_APR_CATEGORIES);
        setEpisDisponiveis(res.config.episDisponiveis || DEFAULT_EPIS);
        setItensPlanejamento(res.config.itensPlanejamento || DEFAULT_ITENS_PLANEJAMENTO);
        if (res.config.updatedAt) {
          setUltimaModificacao(new Date(res.config.updatedAt).toLocaleString('pt-BR'));
        }
        setAutorUltimaModificacao(res.config.atualizadoPorNome || null);

        if (res.config.categoriasRisco && res.config.categoriasRisco.length > 0) {
          setActiveCategoryTab(res.config.categoriasRisco[0].id);
        }
      }
    });
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Salvar no Banco Neon
  const handleSaveAll = () => {
    startTransition(async () => {
      const res = await saveAprConfigAction({
        titulo,
        revisao,
        instrucoesGerais,
        regrasDeOuro,
        categoriasRisco,
        episDisponiveis,
        itensPlanejamento,
        autorNome: user?.nome || 'Administrador',
      });

      if (res.success) {
        notify('success', 'Configurações da APR salvas e publicadas com sucesso!');
        if (res.config?.updatedAt) {
          setUltimaModificacao(new Date(res.config.updatedAt).toLocaleString('pt-BR'));
        }
        setAutorUltimaModificacao(user?.nome || 'Administrador');
      } else {
        notify('error', res.error || 'Erro ao salvar alterações no banco de dados.');
      }
    });
  };

  // Restaurar Padrões TKE
  const handleResetToDefault = () => {
    startTransition(async () => {
      const res = await resetAprConfigAction(user?.nome || 'Administrador');
      if (res.success) {
        notify('success', 'A APR foi restaurada para o padrão oficial de fábrica da TKE!');
        setShowResetConfirm(false);
        loadConfig();
      } else {
        notify('error', res.error || 'Erro ao restaurar APR padrão.');
      }
    });
  };

  // Modificadores de Categorias e Perguntas
  const handleUpdateCategoryTitle = (catId: string, novoTitulo: string) => {
    setCategoriasRisco((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, titulo: novoTitulo } : c))
    );
  };

  const handleUpdateCategoryDesc = (catId: string, novaDesc: string) => {
    setCategoriasRisco((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, descricao: novaDesc } : c))
    );
  };

  const handleToggleCategoryActive = (catId: string) => {
    setCategoriasRisco((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, ativo: !c.ativo } : c))
    );
  };

  const handleUpdateQuestion = (
    catId: string,
    questionId: string,
    field: keyof AprRiskItemConfig,
    value: any
  ) => {
    setCategoriasRisco((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
        return {
          ...c,
          itens: c.itens.map((item) => (item.id === questionId ? { ...item, [field]: value } : item)),
        };
      })
    );
  };

  const handleAddQuestion = (catId: string) => {
    setCategoriasRisco((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
        const nextNum = c.itens.length + 1;
        const newId = `${c.id.toLowerCase()}_${Date.now()}`;
        const newItem: AprRiskItemConfig = {
          id: newId,
          label: `Nova verificação de segurança #${nextNum}`,
          obrigatorio: true,
          ativo: true,
        };
        return {
          ...c,
          itens: [...c.itens, newItem],
        };
      })
    );
  };

  const handleDeleteQuestion = (catId: string, questionId: string) => {
    setCategoriasRisco((prev) =>
      prev.map((c) => {
        if (c.id !== catId) return c;
        return {
          ...c,
          itens: c.itens.filter((item) => item.id !== questionId),
        };
      })
    );
  };

  const handleAddCategory = () => {
    const newId = `CAT_${Date.now()}`;
    const newCategory: AprRiskCategoryConfig = {
      id: newId,
      titulo: 'Nova Categoria de Risco Adicional',
      descricao: 'Descrição dos riscos específicos e normas regulamentadoras aplicáveis.',
      ativo: true,
      itens: [
        {
          id: `${newId}_1`,
          label: 'Pergunta de inspeção inicial obrigatória?',
          obrigatorio: true,
          ativo: true,
        },
      ],
    };
    setCategoriasRisco((prev) => [...prev, newCategory]);
    setActiveCategoryTab(newId);
  };

  const handleDeleteCategory = (catId: string) => {
    if (confirm('Tem certeza que deseja remover esta categoria de risco inteira da APR?')) {
      setCategoriasRisco((prev) => prev.filter((c) => c.id !== catId));
      if (activeCategoryTab === catId && categoriasRisco.length > 1) {
        const nextCat = categoriasRisco.find((c) => c.id !== catId);
        if (nextCat) setActiveCategoryTab(nextCat.id);
      }
    }
  };

  // Modificadores de EPIs
  const handleUpdateEpi = (epiId: string, field: keyof AprEpiConfig, value: any) => {
    setEpisDisponiveis((prev) =>
      prev.map((epi) => (epi.id === epiId ? { ...epi, [field]: value } : epi))
    );
  };

  const handleAddEpi = () => {
    const newEpi: AprEpiConfig = {
      id: `epi_${Date.now()}`,
      nome: 'Novo EPI Protetor',
      obrigatorioPadrao: false,
      ca: '',
      categoria: 'Geral',
      ativo: true,
    };
    setEpisDisponiveis((prev) => [...prev, newEpi]);
  };

  const handleDeleteEpi = (epiId: string) => {
    setEpisDisponiveis((prev) => prev.filter((epi) => epi.id !== epiId));
  };

  // Modificadores de Regras de Ouro
  const handleUpdateRegra = (index: number, value: string) => {
    setRegrasDeOuro((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleAddRegra = () => {
    setRegrasDeOuro((prev) => [...prev, 'Nova Diretriz de Segurança Operacional Obrigatória']);
  };

  const handleDeleteRegra = (index: number) => {
    setRegrasDeOuro((prev) => prev.filter((_, i) => i !== index));
  };

  // =========================================================================
  // Modificadores de Itens 1 a 5 (Identificação & Planejamento)
  // =========================================================================
  const handleUpdateServico = (index: number, val: string) => {
    setItensPlanejamento((prev) => {
      const copy = [...prev.servicosRealizados];
      copy[index] = val;
      return { ...prev, servicosRealizados: copy };
    });
  };

  const handleAddServico = () => {
    if (!novoServicoTexto.trim()) return;
    setItensPlanejamento((prev) => ({
      ...prev,
      servicosRealizados: [...prev.servicosRealizados, novoServicoTexto.trim()],
    }));
    setNovoServicoTexto('');
  };

  const handleDeleteServico = (index: number) => {
    setItensPlanejamento((prev) => ({
      ...prev,
      servicosRealizados: prev.servicosRealizados.filter((_, i) => i !== index),
    }));
  };

  const handleTogglePermiteOutro = (key: 'permiteOutroServico' | 'permiteOutroRisco') => {
    setItensPlanejamento((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleAddSugestao = () => {
    if (!novaSugestaoTexto.trim()) return;
    setItensPlanejamento((prev) => ({
      ...prev,
      sugestoesOutrosServicos: [
        ...(prev.sugestoesOutrosServicos || []),
        novaSugestaoTexto.trim(),
      ],
    }));
    setNovaSugestaoTexto('');
  };

  const handleDeleteSugestao = (index: number) => {
    setItensPlanejamento((prev) => ({
      ...prev,
      sugestoesOutrosServicos: (prev.sugestoesOutrosServicos || []).filter((_, i) => i !== index),
    }));
  };

  const handleUpdateRisco = (index: number, val: string) => {
    setItensPlanejamento((prev) => {
      const copy = [...prev.riscosPotenciais];
      copy[index] = val;
      return { ...prev, riscosPotenciais: copy };
    });
  };

  const handleAddRisco = () => {
    if (!novoRiscoTexto.trim()) return;
    setItensPlanejamento((prev) => ({
      ...prev,
      riscosPotenciais: [...prev.riscosPotenciais, novoRiscoTexto.trim()],
    }));
    setNovoRiscoTexto('');
  };

  const handleDeleteRisco = (index: number) => {
    setItensPlanejamento((prev) => ({
      ...prev,
      riscosPotenciais: prev.riscosPotenciais.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateTipoEquipamento = (index: number, label: string) => {
    setItensPlanejamento((prev) => {
      const copy = [...prev.tiposEquipamento];
      copy[index] = { ...copy[index], label };
      return { ...prev, tiposEquipamento: copy };
    });
  };

  const handleToggleTipoEquipamentoAtivo = (index: number) => {
    setItensPlanejamento((prev) => {
      const copy = [...prev.tiposEquipamento];
      copy[index] = { ...copy[index], ativo: !copy[index].ativo };
      return { ...prev, tiposEquipamento: copy };
    });
  };

  const handleAddTipoEquipamento = () => {
    if (!novoTipoEquipTexto.trim()) return;
    const id = novoTipoEquipTexto.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    setItensPlanejamento((prev) => ({
      ...prev,
      tiposEquipamento: [
        ...prev.tiposEquipamento,
        { id, label: novoTipoEquipTexto.trim(), ativo: true },
      ],
    }));
    setNovoTipoEquipTexto('');
  };

  const handleDeleteTipoEquipamento = (index: number) => {
    setItensPlanejamento((prev) => ({
      ...prev,
      tiposEquipamento: prev.tiposEquipamento.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateClassificacao = (index: number, label: string) => {
    setItensPlanejamento((prev) => {
      const copy = [...prev.classificacoesReparo];
      copy[index] = { ...copy[index], label };
      return { ...prev, classificacoesReparo: copy };
    });
  };

  const handleToggleClassificacaoAtivo = (index: number) => {
    setItensPlanejamento((prev) => {
      const copy = [...prev.classificacoesReparo];
      copy[index] = { ...copy[index], ativo: !copy[index].ativo };
      return { ...prev, classificacoesReparo: copy };
    });
  };

  const handleAddClassificacao = () => {
    if (!novaClassificacaoTexto.trim()) return;
    const id = novaClassificacaoTexto.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    setItensPlanejamento((prev) => ({
      ...prev,
      classificacoesReparo: [
        ...prev.classificacoesReparo,
        { id, label: novaClassificacaoTexto.trim(), ativo: true },
      ],
    }));
    setNovaClassificacaoTexto('');
  };

  const handleDeleteClassificacao = (index: number) => {
    setItensPlanejamento((prev) => ({
      ...prev,
      classificacoesReparo: prev.classificacoesReparo.filter((_, i) => i !== index),
    }));
  };

  const handleUpdateMaoDeObra = (index: number, label: string) => {
    setItensPlanejamento((prev) => {
      const copy = [...prev.opcoesMaoDeObra];
      copy[index] = { ...copy[index], label };
      return { ...prev, opcoesMaoDeObra: copy };
    });
  };

  const handleAddMaoDeObra = () => {
    if (!novaMaoDeObraTexto.trim()) return;
    const id = novaMaoDeObraTexto.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    setItensPlanejamento((prev) => ({
      ...prev,
      opcoesMaoDeObra: [
        ...prev.opcoesMaoDeObra,
        { id, label: novaMaoDeObraTexto.trim(), ativo: true },
      ],
    }));
    setNovaMaoDeObraTexto('');
  };

  const handleDeleteMaoDeObra = (index: number) => {
    setItensPlanejamento((prev) => ({
      ...prev,
      opcoesMaoDeObra: prev.opcoesMaoDeObra.filter((_, i) => i !== index),
    }));
  };

  const currentCategory = categoriasRisco.find((c) => c.id === activeCategoryTab);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              Segurança do Trabalho • Gestão da APR
            </span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
              {revisao}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            🛡️ Editor Oficial da APR (Análise Preliminar de Risco)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Altere perguntas das NRs, adicione novas categorias de risco, gerencie o catálogo de EPIs e edite regras de ouro diretamente pela plataforma.
          </p>
          {ultimaModificacao && (
            <p className="text-[11px] text-slate-400 mt-1">
              Última publicação em: <strong>{ultimaModificacao}</strong> {autorUltimaModificacao && `por ${autorUltimaModificacao}`}
            </p>
          )}
        </div>

        {/* Botões de Ação Global */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isPendingTransition}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            title="Restaurar parâmetros padrão da TKE"
          >
            <span>↺</span>
            <span>Restaurar Padrão</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isPendingTransition}
            className="btn-tke-orange px-5 py-2.5 text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <span>{isPendingTransition ? '⏳' : '💾'}</span>
            <span>{isPendingTransition ? 'Publicando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notification.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Identificação Geral da APR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <span>📋</span> Identificação e Cabeçalho do Documento
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Título Principal da APR
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Código de Revisão
            </label>
            <input
              type="text"
              value={revisao}
              onChange={(e) => setRevisao(e.target.value)}
              className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Abas Principais de Edição */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Barra de Abas Superiores */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 p-2 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('planejamento')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'planejamento'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span>📝</span>
            <span>Itens 1 a 5 (Identificação & Serviços)</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === 'planejamento' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {itensPlanejamento.servicosRealizados.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('riscos')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'riscos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span>⚠️</span>
            <span>Riscos & Perguntas das NRs</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === 'riscos' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {categoriasRisco.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('epis')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'epis'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span>🦺</span>
            <span>Catálogo de EPIs</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === 'epis' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {episDisponiveis.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('regras')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'regras'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <span>⭐</span>
            <span>Regras de Ouro & Instruções</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeTab === 'regras' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {regrasDeOuro.length}
            </span>
          </button>
        </div>

        {/* CONTEÚDO DA ABA 0: ITENS 1 A 5 (IDENTIFICAÇÃO & SERVIÇOS) */}
        {activeTab === 'planejamento' && (
          <div className="p-5 sm:p-6 space-y-8">
            {/* Bloco Explicativo do Administrador */}
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/30 border border-orange-200/80 rounded-2xl p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🛠️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Gerenciamento dos Itens de 1 a 5 da APR
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Personalize os serviços disponíveis para seleção no campo, cadastre sugestões para <strong>autopreenchimento do campo &quot;Outro&quot;</strong>, edite os riscos potenciais identificados e controle as opções dos seletores de Mão de Obra, Tipo de Equipamento e Classificação do Reparo.
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 5.1: SERVIÇOS A SEREM REALIZADOS */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>🔧</span> 5.1 Marque os Serviços a Serem Realizados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lista oficial de serviços exibidos em checkboxes na etapa 1 da APR.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold bg-orange-100 text-orange-800 px-2.5 py-1 rounded-lg w-fit">
                  {itensPlanejamento.servicosRealizados.length} serviços cadastrados
                </span>
              </div>

              {/* Adicionar Novo Serviço */}
              <div className="flex flex-col sm:flex-row gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <input
                  type="text"
                  placeholder="Nome do novo serviço (ex: Ajuste do freio de emergência)..."
                  value={novoServicoTexto}
                  onChange={(e) => setNovoServicoTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddServico();
                    }
                  }}
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddServico}
                  disabled={!novoServicoTexto.trim()}
                  className="btn-tke-orange px-4 py-2 text-xs font-bold shrink-0 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>+</span>
                  <span>Adicionar Serviço</span>
                </button>
              </div>

              {/* Grid de Serviços */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {itensPlanejamento.servicosRealizados.map((servico, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-orange-300 transition group"
                  >
                    <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={servico}
                      onChange={(e) => handleUpdateServico(idx, e.target.value)}
                      className="w-full text-xs text-slate-800 font-medium bg-transparent border border-transparent hover:border-slate-200 focus:border-orange-500 rounded px-1.5 py-1 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteServico(idx)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded transition opacity-60 group-hover:opacity-100 cursor-pointer shrink-0"
                      title="Excluir serviço"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              {/* CARD DESTAQUE: OPÇÃO 'OUTRO' E AUTOPREENCHIMENTO INTELIGENTE */}
              <div className="mt-4 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/60 border border-amber-300/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">✨</span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900">
                        Opção &quot;Outro&quot; & Autopreenchimento de Serviços
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Permite que o técnico informe serviços não listados acima com sugestões inteligentes.
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
                    <input
                      type="checkbox"
                      checked={itensPlanejamento.permiteOutroServico}
                      onChange={() => handleTogglePermiteOutro('permiteOutroServico')}
                      className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Habilitar opção &quot;Outro&quot; na APR</span>
                  </label>
                </div>

                {itensPlanejamento.permiteOutroServico && (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span>💡</span> Sugestões para Autopreenchimento no Formulário
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        O técnico verá essas sugestões ao começar a digitar no campo &quot;Outro&quot;.
                      </span>
                    </div>

                    {/* Input para adicionar nova sugestão de autopreenchimento */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Digite um termo para autopreenchimento (ex: Troca de sensor magnético de parada)..."
                        value={novaSugestaoTexto}
                        onChange={(e) => setNovaSugestaoTexto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSugestao();
                          }
                        }}
                        className="flex-1 text-xs bg-white border border-amber-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddSugestao}
                        disabled={!novaSugestaoTexto.trim()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        + Adicionar Sugestão
                      </button>
                    </div>

                    {/* Chips com as sugestões cadastradas */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {(itensPlanejamento.sugestoesOutrosServicos || []).map((sugestao, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center gap-1.5 bg-white border border-amber-300 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-2xs hover:bg-amber-50/50 transition"
                        >
                          <span>{sugestao}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteSugestao(sIdx)}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-1 rounded-full p-0.5 transition cursor-pointer"
                            title="Remover sugestão"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      {(itensPlanejamento.sugestoesOutrosServicos || []).length === 0 && (
                        <p className="text-xs text-slate-400 italic">
                          Nenhuma sugestão cadastrada. O campo &quot;Outro&quot; aceitará digitação livre.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO 5.2: RISCOS POTENCIAIS IDENTIFICADOS */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>⚡</span> 5.2 Riscos Potenciais Identificados
                  </h3>
                  <p className="text-xs text-slate-500">
                    Riscos operacionais preliminares selecionáveis na etapa 1 da APR.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                    <input
                      type="checkbox"
                      checked={itensPlanejamento.permiteOutroRisco}
                      onChange={() => handleTogglePermiteOutro('permiteOutroRisco')}
                      className="rounded text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                    <span>Permitir &quot;Outro&quot; em Riscos</span>
                  </label>
                  <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg">
                    {itensPlanejamento.riscosPotenciais.length} riscos
                  </span>
                </div>
              </div>

              {/* Adicionar Novo Risco */}
              <div className="flex flex-col sm:flex-row gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <input
                  type="text"
                  placeholder="Nome do novo risco (ex: Trabalho em espaço confinado)..."
                  value={novoRiscoTexto}
                  onChange={(e) => setNovoRiscoTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRisco();
                    }
                  }}
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddRisco}
                  disabled={!novoRiscoTexto.trim()}
                  className="btn-tke-orange px-4 py-2 text-xs font-bold shrink-0 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>+</span>
                  <span>Adicionar Risco</span>
                </button>
              </div>

              {/* Grid de Riscos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {itensPlanejamento.riscosPotenciais.map((risco, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-amber-300 transition group"
                  >
                    <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] flex items-center justify-center shrink-0 border border-amber-200/50">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={risco}
                      onChange={(e) => handleUpdateRisco(idx, e.target.value)}
                      className="w-full text-xs text-slate-800 font-medium bg-transparent border border-transparent hover:border-slate-200 focus:border-orange-500 rounded px-1.5 py-1 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteRisco(idx)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded transition opacity-60 group-hover:opacity-100 cursor-pointer shrink-0"
                      title="Excluir risco"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÕES 4, 5.4 E 3: SELECTS DE EQUIPAMENTO, CLASSIFICAÇÃO E MÃO DE OBRA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
              {/* 4. TIPO DE EQUIPAMENTO */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🛗</span> 4. Tipo de Equipamento
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Opções disponíveis no seletor de equipamento.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova opção..."
                    value={novoTipoEquipTexto}
                    onChange={(e) => setNovoTipoEquipTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTipoEquipamento();
                      }
                    }}
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTipoEquipamento}
                    disabled={!novoTipoEquipTexto.trim()}
                    className="btn-tke-orange px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {itensPlanejamento.tiposEquipamento.map((op, idx) => (
                    <div
                      key={op.id || idx}
                      className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={op.ativo}
                        onChange={() => handleToggleTipoEquipamentoAtivo(idx)}
                        className="rounded text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
                        title="Ativo / Inativo"
                      />
                      <input
                        type="text"
                        value={op.label}
                        onChange={(e) => handleUpdateTipoEquipamento(idx, e.target.value)}
                        className={`flex-1 text-xs bg-transparent border-none focus:outline-none ${
                          !op.ativo ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteTipoEquipamento(idx)}
                        className="text-slate-300 hover:text-rose-600 p-0.5 cursor-pointer"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5.4 CLASSIFICAÇÃO DO REPARO */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏷️</span> 5.4 Classificação do Reparo
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Categorias operacionais do reparo.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova classificação..."
                    value={novaClassificacaoTexto}
                    onChange={(e) => setNovaClassificacaoTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddClassificacao();
                      }
                    }}
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddClassificacao}
                    disabled={!novaClassificacaoTexto.trim()}
                    className="btn-tke-orange px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {itensPlanejamento.classificacoesReparo.map((op, idx) => (
                    <div
                      key={op.id || idx}
                      className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={op.ativo}
                        onChange={() => handleToggleClassificacaoAtivo(idx)}
                        className="rounded text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
                        title="Ativo / Inativo"
                      />
                      <input
                        type="text"
                        value={op.label}
                        onChange={(e) => handleUpdateClassificacao(idx, e.target.value)}
                        className={`flex-1 text-xs bg-transparent border-none focus:outline-none ${
                          !op.ativo ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteClassificacao(idx)}
                        className="text-slate-300 hover:text-rose-600 p-0.5 cursor-pointer"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. MÃO DE OBRA */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👷</span> 3. Opções de Mão de Obra
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Modalidades de execução da equipe técnica.
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova modalidade..."
                    value={novaMaoDeObraTexto}
                    onChange={(e) => setNovaMaoDeObraTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddMaoDeObra();
                      }
                    }}
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddMaoDeObra}
                    disabled={!novaMaoDeObraTexto.trim()}
                    className="btn-tke-orange px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {itensPlanejamento.opcoesMaoDeObra.map((op, idx) => (
                    <div
                      key={op.id || idx}
                      className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={op.ativo}
                        onChange={() => {
                          setItensPlanejamento((prev) => {
                            const copy = [...prev.opcoesMaoDeObra];
                            copy[idx] = { ...copy[idx], ativo: !copy[idx].ativo };
                            return { ...prev, opcoesMaoDeObra: copy };
                          });
                        }}
                        className="rounded text-orange-500 focus:ring-orange-500 w-3.5 h-3.5"
                        title="Ativo / Inativo"
                      />
                      <input
                        type="text"
                        value={op.label}
                        onChange={(e) => handleUpdateMaoDeObra(idx, e.target.value)}
                        className={`flex-1 text-xs bg-transparent border-none focus:outline-none ${
                          !op.ativo ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteMaoDeObra(idx)}
                        className="text-slate-300 hover:text-rose-600 p-0.5 cursor-pointer"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 1: RISCOS & PERGUNTAS */}
        {activeTab === 'riscos' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Seletor de Categorias (Sub-abas) */}
            <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                {categoriasRisco.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryTab(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
                      activeCategoryTab === cat.id
                        ? 'bg-orange-500 text-white shadow-xs'
                        : cat.ativo
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-slate-100 text-slate-400 line-through'
                    }`}
                  >
                    <span>{cat.titulo.split('(')[0] || cat.titulo}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        activeCategoryTab === cat.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {cat.itens.length}
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3 py-1.5 rounded-xl border border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <span>+</span>
                <span>Nova Categoria</span>
              </button>
            </div>

            {/* Categoria Ativa */}
            {currentCategory ? (
              <div className="space-y-6">
                {/* Cabeçalho da Categoria */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Editando Categoria:
                      </span>
                      <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                        {currentCategory.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentCategory.ativo}
                          onChange={() => handleToggleCategoryActive(currentCategory.id)}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span>Categoria Ativa na APR</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(currentCategory.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 hover:bg-rose-50 rounded-lg transition"
                      >
                        Excluir Categoria
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Título da Categoria / Norma Regulamentadora
                      </label>
                      <input
                        type="text"
                        value={currentCategory.titulo}
                        onChange={(e) => handleUpdateCategoryTitle(currentCategory.id, e.target.value)}
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Descrição Resumida do Risco
                      </label>
                      <input
                        type="text"
                        value={currentCategory.descricao || ''}
                        onChange={(e) => handleUpdateCategoryDesc(currentCategory.id, e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Lista de Perguntas desta Categoria */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span>❓</span> Perguntas e Itens de Checagem ({currentCategory.itens.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion(currentCategory.id)}
                      className="btn-tke-orange px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>+</span>
                      <span>Adicionar Pergunta</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {currentCategory.itens.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white hover:border-orange-200 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5"
                      >
                        <div className="flex items-start sm:items-center gap-3 flex-1">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                            {idx + 1}
                          </span>

                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) =>
                                handleUpdateQuestion(currentCategory.id, item.id, 'label', e.target.value)
                              }
                              className="w-full text-xs font-medium text-slate-900 border border-transparent hover:border-slate-300 focus:border-orange-500 rounded-lg px-2 py-1.5 bg-slate-50/60 focus:bg-white focus:outline-none transition"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono px-2">
                              <span>ID: {item.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Controles do Item */}
                        <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.obrigatorio}
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  currentCategory.id,
                                  item.id,
                                  'obrigatorio',
                                  e.target.checked
                                )
                              }
                              className="rounded text-orange-500 focus:ring-orange-500"
                            />
                            <span>Obrigatória</span>
                          </label>

                          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.ativo}
                              onChange={(e) =>
                                handleUpdateQuestion(
                                  currentCategory.id,
                                  item.id,
                                  'ativo',
                                  e.target.checked
                                )
                              }
                              className="rounded text-emerald-500 focus:ring-emerald-500"
                            />
                            <span>Ativa</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(currentCategory.id, item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                            title="Remover pergunta"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Selecione ou crie uma categoria acima para editar as perguntas.
              </div>
            )}
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: CATÁLOGO DE EPIS */}
        {activeTab === 'epis' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>🦺</span> Equipamentos de Proteção Individual (EPIs Cadastrados)
                </h3>
                <p className="text-xs text-slate-500">
                  Defina os EPIs disponíveis para seleção no checklist e marque quais são de uso obrigatório por padrão.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddEpi}
                className="btn-tke-orange px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>+</span>
                <span>Adicionar EPI</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {episDisponiveis.map((epi) => (
                <div
                  key={epi.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-orange-200 hover:shadow-xs transition space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={epi.nome}
                      onChange={(e) => handleUpdateEpi(epi.id, 'nome', e.target.value)}
                      className="font-bold text-xs text-slate-900 border border-slate-200 rounded-lg px-2.5 py-1.5 w-full bg-slate-50/50 focus:bg-white focus:outline-none focus:border-orange-500"
                    />

                    <button
                      type="button"
                      onClick={() => handleDeleteEpi(epi.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Excluir EPI"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        C.A. (Certificado)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: C.A. 12345"
                        value={epi.ca || ''}
                        onChange={(e) => handleUpdateEpi(epi.id, 'ca', e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-full bg-slate-50/50 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Categoria
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Altura, Elétrica"
                        value={epi.categoria || ''}
                        onChange={(e) => handleUpdateEpi(epi.id, 'categoria', e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-full bg-slate-50/50 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <label className="flex items-center gap-1.5 text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={epi.obrigatorioPadrao}
                        onChange={(e) => handleUpdateEpi(epi.id, 'obrigatorioPadrao', e.target.checked)}
                        className="rounded text-orange-500 focus:ring-orange-500"
                      />
                      <span>Obrigatório por Padrão</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-slate-700 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={epi.ativo}
                        onChange={(e) => handleUpdateEpi(epi.id, 'ativo', e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Ativo</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: REGRAS DE OURO & INSTRUÇÕES */}
        {activeTab === 'regras' && (
          <div className="p-5 sm:p-6 space-y-6">
            {/* Instruções Gerais */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                📄 Instruções Gerais da APR (Exibidas no Formulário e no Relatório)
              </label>
              <textarea
                rows={3}
                value={instrucoesGerais}
                onChange={(e) => setInstrucoesGerais(e.target.value)}
                placeholder="Insira as diretrizes gerais de preenchimento obrigatório para a equipe de campo..."
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Regras de Ouro TKE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>⭐</span> Regras de Ouro da Segurança TKE
                  </h3>
                  <p className="text-xs text-slate-500">
                    Diretrizes invioláveis de tolerância zero que o técnico deve confirmar antes de iniciar a atividade.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddRegra}
                  className="btn-tke-orange px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <span>+</span>
                  <span>Nova Regra de Ouro</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {regrasDeOuro.map((regra, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-orange-200 transition"
                  >
                    <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
                      {idx + 1}
                    </span>

                    <input
                      type="text"
                      value={regra}
                      onChange={(e) => handleUpdateRegra(idx, e.target.value)}
                      className="w-full text-xs font-semibold text-slate-800 border border-transparent hover:border-slate-300 focus:border-orange-500 rounded-lg px-2.5 py-1.5 bg-slate-50 focus:bg-white focus:outline-none transition"
                    />

                    <button
                      type="button"
                      onClick={() => handleDeleteRegra(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                      title="Excluir regra"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE RESTAURAÇÃO */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <span className="text-4xl block">⚠️</span>
            <h3 className="text-base font-black text-slate-900">Restaurar Padrão de Fábrica?</h3>
            <p className="text-xs text-slate-500">
              Todas as modificações e novas perguntas serão substituídas pelo modelo corporativo padrão oficial da TKE.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isPendingTransition}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                {isPendingTransition ? 'Restaurando...' : 'Sim, Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
