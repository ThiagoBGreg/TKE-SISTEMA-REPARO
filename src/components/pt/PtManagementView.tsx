'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PtReparoWizard } from '@/components/pt/PtReparoWizard';
import { SignaturePad } from '@/components/pt/SignaturePad';
import {
  deletePtReparoAction,
  updatePtReparoAction,
  concluirTerminoPtReparoAction,
} from '@/actions/ptReparoActions';
import type { DigitalSignature, PtReparoFormData } from '@/lib/validations/ptReparoSchema';

export interface WorkPermitItem {
  id: string;
  codigo: string;
  status: string;
  contratoOrcamento: string;
  equipamento: string;
  tipoMaoDeObra: string;
  tipoEquipamento: string;
  classificacaoReparo: string;
  trabalhoEmAltura: boolean;
  serviceOrderId: string | null;
  criadoPorId: string | null;
  dadosCompletos: PtReparoFormData;
  createdAt: Date;
}

interface PtManagementViewProps {
  initialPermits: WorkPermitItem[];
  isAdmin: boolean;
  isSubcontratado?: boolean;
}

export function PtManagementView({ initialPermits, isAdmin, isSubcontratado = false }: PtManagementViewProps) {
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [permits, setPermits] = useState<WorkPermitItem[]>(initialPermits);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'EM_ANDAMENTO' | 'CONCLUIDO'>('ALL');

  // Modais de Visualização e Administração
  const [viewingPermit, setViewingPermit] = useState<WorkPermitItem | null>(null);
  const [editingPermit, setEditingPermit] = useState<WorkPermitItem | null>(null);
  const [deletingPermitId, setDeletingPermitId] = useState<string | null>(null);

  // Modal de Preenchimento do Término de Serviço (Item 14)
  const [concludingPermit, setConcludingPermit] = useState<WorkPermitItem | null>(null);
  const [terminoDataHora, setTerminoDataHora] = useState('');
  const [terminoNome, setTerminoNome] = useState('');
  const [terminoAssinatura, setTerminoAssinatura] = useState<DigitalSignature | null>(null);
  const [terminoObservacoes, setTerminoObservacoes] = useState('');
  const [terminoErro, setTerminoErro] = useState<string | null>(null);

  // Estados de loading e mensagens
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtros de busca e status
  const filteredPermits = permits.filter((item) => {
    const matchesSearch =
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.contratoOrcamento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.equipamento.toLowerCase().includes(searchTerm.toLowerCase());

    const isConcluido = item.status === 'CONCLUIDO' || item.status === 'FINALIZADA';
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'CONCLUIDO' ? isConcluido : item.status === statusFilter);

    return matchesSearch && matchesStatus;
  });

  // Abre o modal de término de serviço
  const handleOpenTerminoModal = (permit: WorkPermitItem) => {
    setConcludingPermit(permit);
    setTerminoDataHora(new Date().toISOString().slice(0, 16));
    setTerminoNome('');
    setTerminoAssinatura(null);
    setTerminoObservacoes('');
    setTerminoErro(null);
  };

  // Submissão do Término de Serviço
  const handleConcluirTermino = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concludingPermit) return;

    if (!terminoNome.trim()) {
      setTerminoErro('Por favor, informe o nome do responsável pelo término.');
      return;
    }

    if (!terminoAssinatura || !terminoAssinatura.assinaturaBase64) {
      setTerminoErro('Por favor, colete a assinatura digital gráfica do responsável pelo término.');
      return;
    }

    setIsProcessing(true);
    setTerminoErro(null);

    try {
      const res = await concluirTerminoPtReparoAction({
        workPermitId: concludingPermit.id,
        dataHoraTermino: terminoDataHora,
        emitenteNome: terminoNome,
        emitenteAssinaturaBase64: terminoAssinatura.assinaturaBase64,
        geolocalizacao: terminoAssinatura.geolocalizacao || null,
        observacoesFinais: terminoObservacoes,
      });

      if (res.success) {
        // Atualiza a lista local com status CONCLUIDO e os dados do término
        setPermits((prev) =>
          prev.map((p) => {
            if (p.id === concludingPermit.id) {
              const updatedItem: WorkPermitItem = {
                ...p,
                status: 'CONCLUIDO',
                dadosCompletos: {
                  ...p.dadosCompletos,
                  terminoServico: {
                    dataHoraTermino: terminoDataHora,
                    emitenteAssinatura: terminoAssinatura,
                  },
                  observacoesGerais: terminoObservacoes
                    ? `${p.dadosCompletos?.observacoesGerais || ''}\n[Término]: ${terminoObservacoes}`.trim()
                    : p.dadosCompletos?.observacoesGerais,
                },
              };
              return updatedItem;
            }
            return p;
          })
        );

        // Se o modal de visualização estiver aberto para a mesma PT, atualiza-o
        if (viewingPermit && viewingPermit.id === concludingPermit.id) {
          setViewingPermit((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'CONCLUIDO',
                  dadosCompletos: {
                    ...prev.dadosCompletos,
                    terminoServico: {
                      dataHoraTermino: terminoDataHora,
                      emitenteAssinatura: terminoAssinatura,
                    },
                  },
                }
              : null
          );
        }

        setActionMessage({
          type: 'success',
          text: `Término do serviço registrado com sucesso para a PT ${concludingPermit.codigo}! Status atualizado para Concluído.`,
        });
        setConcludingPermit(null);
      } else {
        setTerminoErro(res.error || 'Erro ao registrar o término do serviço.');
      }
    } catch {
      setTerminoErro('Erro inesperado ao registrar o término do serviço.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler para Exclusão (Admin)
  const handleDeleteConfirm = async (id: string) => {
    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await deletePtReparoAction(id);
      if (res.success) {
        setPermits((prev) => prev.filter((p) => p.id !== id));
        setActionMessage({
          type: 'success',
          text: 'Permissão de Trabalho excluída com sucesso do banco de dados.',
        });
        setDeletingPermitId(null);
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Erro ao excluir a Permissão.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Erro inesperado ao excluir.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler para Salvar Edição (Admin)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermit) return;

    setIsProcessing(true);
    setActionMessage(null);
    try {
      const res = await updatePtReparoAction(editingPermit.id, {
        contratoOrcamento: editingPermit.contratoOrcamento,
        equipamento: editingPermit.equipamento,
        classificacaoReparo: editingPermit.classificacaoReparo as any,
        observacoesGerais: editingPermit.dadosCompletos?.observacoesGerais || '',
      });

      if (res.success) {
        setPermits((prev) =>
          prev.map((p) => (p.id === editingPermit.id ? editingPermit : p))
        );
        setActionMessage({ type: 'success', text: 'Permissão de Trabalho atualizada com sucesso!' });
        setEditingPermit(null);
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Erro ao atualizar a Permissão.' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Erro ao salvar alterações.' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Principal */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-red-600 tracking-wider uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
              Módulo de Segurança e Auditoria
            </span>
            {isAdmin && (
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Acesso Total (Administrador)
              </span>
            )}
            {isSubcontratado && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                🔒 Visão do Prestador (Suas APRs)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            Permissões de Trabalho & APR - Reparos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isSubcontratado
              ? 'Visualize exclusivamente as Permissões de Trabalho & APRs preenchidas por você ou atribuídas à sua equipe, baixe o PDF oficial e registre o término de serviços.'
              : 'Visualize o histórico de autorizações, faça download do PDF oficial assinado, registre o término de serviços ou emita novas permissões de trabalho.'}
          </p>
        </div>

        {/* Botões das Abas */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('LIST')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'LIST'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📋</span>
            <span>{isSubcontratado ? `Suas APRs Salvas (${permits.length})` : `Permissões Salvas (${permits.length})`}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CREATE')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'CREATE'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>✍️</span>
            <span>Nova Emissão (Em Branco)</span>
          </button>
        </div>
      </div>

      {/* Alertas de Ação */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-2xs ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>{actionMessage.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{actionMessage.text}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ABA 1: LISTAGEM DE PERMISSÕES SALVAS */}
      {activeTab === 'LIST' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-96 relative">
              <input
                type="text"
                placeholder="Buscar por código, contrato ou equipamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs sm:text-sm pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="ALL">Todos os Status</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Concluídos</option>
              </select>

              <button
                type="button"
                onClick={() => setActiveTab('CREATE')}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-xs transition flex items-center gap-1.5 whitespace-nowrap ml-auto"
              >
                <span>+</span> Emitir PT
              </button>
            </div>
          </div>

          {/* Tabela de Permissões */}
          {filteredPermits.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="text-4xl">📄</div>
              <h3 className="text-base font-bold text-slate-800">
                {isSubcontratado ? 'Nenhuma APR Emitida por Você' : 'Nenhuma Permissão de Trabalho Encontrada'}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {isSubcontratado
                  ? 'Você ainda não preencheu nenhuma Permissão de Trabalho / APR ou não há registros com os filtros informados. Clique no botão abaixo para emitir sua APR.'
                  : 'Não há registros de PT / APR que correspondam aos filtros selecionados. Clique no botão abaixo para emitir uma nova permissão com campos em branco.'}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('CREATE')}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
              >
                Emitir Nova PT / APR
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Código / PT</th>
                      <th className="py-3.5 px-4">Data Emissão</th>
                      <th className="py-3.5 px-4">Contrato / Orçamento</th>
                      <th className="py-3.5 px-4">Equipamento</th>
                      <th className="py-3.5 px-4">Mão de Obra</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-center">Baixar PDF</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredPermits.map((permit) => {
                      const isConcluido =
                        permit.status === 'CONCLUIDO' || permit.status === 'FINALIZADA';

                      return (
                        <tr key={permit.id} className="hover:bg-slate-50/80 transition">
                          {/* Código */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {permit.codigo}
                          </td>

                          {/* Data */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                            {new Date(permit.createdAt).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          {/* Contrato */}
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {permit.contratoOrcamento}
                          </td>

                          {/* Equipamento */}
                          <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={permit.equipamento}>
                            {permit.equipamento}
                          </td>

                          {/* Mão de Obra */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                permit.tipoMaoDeObra === 'TKE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {permit.tipoMaoDeObra}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                isConcluido
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              <span>{isConcluido ? '✓' : '⏳'}</span>
                              <span>{isConcluido ? 'Concluído' : 'Em Andamento'}</span>
                            </span>
                          </td>

                          {/* CAMPO DE BAIXAR EM PDF */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <a
                              href={`/api/pt/${permit.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs transition"
                              title="Baixar PDF Oficial da Permissão"
                            >
                              <span>📄</span>
                              <span>Baixar PDF</span>
                            </a>
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                            {/* BOTÃO DE PREENCHIMENTO DO TÉRMINO DO SERVIÇO */}
                            {!isConcluido && (
                              <button
                                type="button"
                                onClick={() => handleOpenTerminoModal(permit)}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1.5 rounded-lg transition text-xs border border-emerald-300 shadow-2xs inline-flex items-center gap-1"
                                title="Preencher Término do Serviço de Reparo e Mudar Status para Concluído"
                              >
                                <span>🏁</span>
                                <span>Término</span>
                              </button>
                            )}

                            {/* Visualizar */}
                            <button
                              type="button"
                              onClick={() => setViewingPermit(permit)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2.5 py-1.5 rounded-lg transition text-xs"
                              title="Visualizar Detalhes da APT"
                            >
                              👁️ Ver
                            </button>

                            {/* Se for Admin: Editar */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setEditingPermit({ ...permit })}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-2.5 py-1.5 rounded-lg transition text-xs border border-blue-200"
                                title="Editar Permissão de Trabalho"
                              >
                                ✏️ Editar
                              </button>
                            )}

                            {/* Se for Admin: Excluir */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeletingPermitId(permit.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 font-semibold px-2.5 py-1.5 rounded-lg transition text-xs border border-red-200"
                                title="Excluir Permissão de Trabalho"
                              >
                                🗑️ Excluir
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: FORMULÁRIO WIZARD (EM BRANCO) */}
      {activeTab === 'CREATE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <span className="text-xs text-slate-600">
              Preencha todos os campos da Análise Preliminar de Risco e Permissão de Trabalho. Todos os campos iniciam em branco.
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('LIST')}
              className="text-xs font-bold text-slate-700 hover:text-black underline"
            >
              ← Voltar para Permissões Salvas
            </button>
          </div>

          <PtReparoWizard
            serviceOrderId=""
            defaultContrato=""
            defaultEquipamento=""
          />
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO COMPLETA DA APT */}
      {viewingPermit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-6 p-6">
            {/* Header do Modal */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                  Detalhamento da Permissão de Trabalho
                </span>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  {viewingPermit.codigo}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      viewingPermit.status === 'CONCLUIDO' || viewingPermit.status === 'FINALIZADA'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {viewingPermit.status === 'CONCLUIDO' || viewingPermit.status === 'FINALIZADA'
                      ? '✓ Concluído'
                      : '⏳ Em Andamento'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Emitida em:{' '}
                  {new Date(viewingPermit.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>

              {/* Botão de Fechar e Botão de Baixar PDF */}
              <div className="flex items-center gap-2">
                <a
                  href={`/api/pt/${viewingPermit.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition"
                >
                  <span>📄</span>
                  <span>Baixar PDF Oficial</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingPermit(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo Detalhado */}
            <div className="space-y-6 text-xs text-slate-700">
              {/* 1 - 4: Dados Cadastrais */}
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
                <h3 className="font-bold text-slate-900 uppercase">1 a 4. Identificação do Serviço</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  <div>
                    <span className="text-slate-500 block">Contrato / Orçamento:</span>
                    <span className="font-bold text-slate-900">{viewingPermit.contratoOrcamento}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Equipamento:</span>
                    <span className="font-bold text-slate-900">{viewingPermit.equipamento}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mão de Obra:</span>
                    <span className="font-bold text-slate-900">{viewingPermit.tipoMaoDeObra}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Tipo de Equipamento:</span>
                    <span className="font-bold text-slate-900">
                      {viewingPermit.tipoEquipamento === 'COM_CASA_DE_MAQUINAS'
                        ? 'Com Casa de Máquinas'
                        : 'Sem Casa de Máquinas (MRL)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5: Serviços e Riscos */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 uppercase">5. Serviços & Riscos Identificados</h3>
                <div>
                  <span className="text-slate-500 block mb-1">Serviços Selecionados:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingPermit.dadosCompletos?.servicosRealizados?.length ? (
                      viewingPermit.dadosCompletos.servicosRealizados.map((s, idx) => (
                        <span key={idx} className="bg-red-50 text-red-800 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                          ✓ {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Nenhum serviço listado</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">Riscos Potenciais:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingPermit.dadosCompletos?.riscosPotenciais?.length ? (
                      viewingPermit.dadosCompletos.riscosPotenciais.map((r, idx) => (
                        <span key={idx} className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                          ⚠️ {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">Nenhum risco apontado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 6: Supervisão Técnica */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h3 className="font-bold text-slate-900 uppercase">
                  6. Supervisão Técnica (Opcional)
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-500 block">Supervisor Responsável:</span>
                    <span className="font-bold text-slate-900">
                      {viewingPermit.dadosCompletos?.assinaturaSupervisao?.nome || 'Assinatura Dispensada / Opcional'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Data de Autorização:</span>
                    <span className="font-semibold text-slate-800">
                      {viewingPermit.dadosCompletos?.dataAutorizacaoSupervisao || '-'}
                    </span>
                  </div>
                </div>
                {viewingPermit.dadosCompletos?.assinaturaSupervisao?.assinaturaBase64 && (
                  <div className="pt-2">
                    <span className="text-slate-500 block mb-1">Assinatura Gráfica:</span>
                    <div className="bg-white border border-slate-200 rounded-lg p-2 inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={viewingPermit.dadosCompletos.assinaturaSupervisao.assinaturaBase64}
                        alt="Assinatura Supervisor"
                        className="h-16 max-w-xs object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 10: EPIs e EPCs */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900 uppercase">EPIs e Equipamentos</h3>
                <div className="flex flex-wrap gap-1.5">
                  {viewingPermit.dadosCompletos?.episSelecionados?.length ? (
                    viewingPermit.dadosCompletos.episSelecionados.map((epi, idx) => (
                      <span key={idx} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                        🦺 {epi}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 italic">Nenhum EPI registrado</span>
                  )}
                </div>
              </div>

              {/* 12 e 13: Assinaturas de Campo (Início e Integrantes) */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 uppercase">Assinaturas de Início & Equipe Técnica</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Responsável Início */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 block font-semibold">12. Responsável pelo Início:</span>
                    <span className="font-bold text-slate-900 block">
                      {viewingPermit.dadosCompletos?.inicioServico?.emitenteAssinatura?.nome || 'Não informado'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Data/Hora: {viewingPermit.dadosCompletos?.inicioServico?.dataHoraInicio || '-'}
                    </span>
                    {viewingPermit.dadosCompletos?.inicioServico?.emitenteAssinatura?.assinaturaBase64 && (
                      <div className="bg-white border border-slate-200 rounded p-1 inline-block mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewingPermit.dadosCompletos.inicioServico.emitenteAssinatura.assinaturaBase64}
                          alt="Assinatura Início"
                          className="h-12 max-w-xs object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Integrantes da Equipe */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-slate-500 block font-semibold">13. Integrantes da Equipe:</span>
                    {viewingPermit.dadosCompletos?.equipeReparo?.map((m, idx) => (
                      <div key={idx} className="border-b border-slate-200 pb-1 last:border-none">
                        <span className="font-bold text-slate-800 block">{m.nomeCompleto || `Integrante ${idx + 1}`}</span>
                        {m.assinatura?.assinaturaBase64 && (
                          <div className="bg-white border border-slate-200 rounded p-1 inline-block mt-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.assinatura.assinaturaBase64}
                              alt={`Assinatura ${m.nomeCompleto}`}
                              className="h-10 max-w-xs object-contain"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 14: TÉRMINO DO SERVIÇO DE REPARO */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                    <span>14. Término do Serviço de Reparo</span>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        viewingPermit.dadosCompletos?.terminoServico
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {viewingPermit.dadosCompletos?.terminoServico ? '✓ Concluído' : '⏳ Em Andamento'}
                    </span>
                  </h3>
                  {!viewingPermit.dadosCompletos?.terminoServico && (
                    <button
                      type="button"
                      onClick={() => handleOpenTerminoModal(viewingPermit)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-2xs transition flex items-center gap-1"
                    >
                      <span>🏁</span>
                      <span>Registrar Término</span>
                    </button>
                  )}
                </div>

                {viewingPermit.dadosCompletos?.terminoServico ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <span className="text-slate-500 block">Responsável pelo Término:</span>
                      <span className="font-bold text-slate-900 block text-sm">
                        {viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura?.nome}
                      </span>
                      <span className="text-slate-500 block mt-1">Data e Hora do Término:</span>
                      <span className="font-semibold text-emerald-800 block">
                        {new Date(viewingPermit.dadosCompletos.terminoServico.dataHoraTermino).toLocaleString('pt-BR')}
                      </span>
                      {viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura?.geolocalizacao && (
                        <span className="text-[11px] text-slate-500 block mt-1">
                          📍 Coordenadas:{' '}
                          {viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura.geolocalizacao.latitude.toFixed(5)},{' '}
                          {viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura.geolocalizacao.longitude.toFixed(5)}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block mb-1">Assinatura Gráfica de Conclusão:</span>
                      <div className="bg-white border border-slate-200 rounded-lg p-2 inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewingPermit.dadosCompletos.terminoServico.emitenteAssinatura.assinaturaBase64}
                          alt="Assinatura Término"
                          className="h-14 max-w-xs object-contain"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-600 bg-white/70 p-3 rounded-lg border border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="font-medium">O serviço de reparo ainda está em andamento.</p>
                      <p className="text-[11px] text-slate-500">
                        Clique no botão ao lado para preencher o término e alterar o status para Concluído.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenTerminoModal(viewingPermit)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-xs transition whitespace-nowrap ml-2"
                    >
                      Preencher Término
                    </button>
                  </div>
                )}
              </div>

              {/* Observações Gerais */}
              {viewingPermit.dadosCompletos?.observacoesGerais && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">Observações Gerais:</span>
                  <p className="text-slate-600 whitespace-pre-wrap">{viewingPermit.dadosCompletos.observacoesGerais}</p>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-xs text-slate-400">TKE Brasil • Sistema de Reparo & APR</span>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/pt/${viewingPermit.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                >
                  📄 Baixar PDF
                </a>
                <button
                  type="button"
                  onClick={() => setViewingPermit(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs px-4 py-2 rounded-xl transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PREENCHIMENTO DO TÉRMINO DO SERVIÇO DE REPARO (ITEM 14) */}
      {concludingPermit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  Encerramento da Atividade
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  14 - Término do Serviço de Reparo
                </h3>
                <p className="text-xs text-slate-500">
                  PT: <span className="font-bold text-slate-800">{concludingPermit.codigo}</span> • Contrato: {concludingPermit.contratoOrcamento}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConcludingPermit(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {terminoErro && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{terminoErro}</span>
              </div>
            )}

            <form onSubmit={handleConcluirTermino} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Data e Hora do Término *
                </label>
                <input
                  type="datetime-local"
                  value={terminoDataHora}
                  onChange={(e) => setTerminoDataHora(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome do Responsável pelo Término (Técnico Emitente) *
                </label>
                <input
                  type="text"
                  placeholder="Nome completo do responsável..."
                  value={terminoNome}
                  onChange={(e) => setTerminoNome(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Pad de Assinatura Digital com GPS */}
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Assinatura Digital de Término *
                </label>
                <p className="text-[11px] text-slate-500 pb-1">
                  Desenhe sua assinatura no quadro abaixo. Ela será vinculada às coordenadas GPS e carimbo auditável UTC.
                </p>
                <SignaturePad
                  label="Assinatura do Responsável pelo Término"
                  signatarioNome={terminoNome || 'Responsável pelo Término'}
                  signatarioCargo="Técnico de Reparo"
                  value={terminoAssinatura}
                  onChange={(sig) => setTerminoAssinatura(sig)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações Finais de Encerramento (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações sobre testes de funcionamento, limpeza da área, entrega do equipamento..."
                  value={terminoObservacoes}
                  onChange={(e) => setTerminoObservacoes(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setConcludingPermit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Gravando Término...</span>
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>Confirmar Término e Mudar para Concluído</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DA APT (ADMINISTRADOR) */}
      {editingPermit && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Administração</span>
                <h3 className="text-lg font-bold text-slate-900">Editar Permissão {editingPermit.codigo}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPermit(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contrato / Orçamento</label>
                <input
                  type="text"
                  value={editingPermit.contratoOrcamento}
                  onChange={(e) =>
                    setEditingPermit({ ...editingPermit, contratoOrcamento: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Identificação do Equipamento</label>
                <input
                  type="text"
                  value={editingPermit.equipamento}
                  onChange={(e) =>
                    setEditingPermit({ ...editingPermit, equipamento: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Classificação do Reparo</label>
                <select
                  value={editingPermit.classificacaoReparo}
                  onChange={(e) =>
                    setEditingPermit({ ...editingPermit, classificacaoReparo: e.target.value })
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                >
                  <option value="ROTINEIRO">Rotineiro</option>
                  <option value="NAO_ROTINEIRO">Não Rotineiro</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações Gerais</label>
                <textarea
                  rows={3}
                  value={editingPermit.dadosCompletos?.observacoesGerais || ''}
                  onChange={(e) =>
                    setEditingPermit({
                      ...editingPermit,
                      dadosCompletos: {
                        ...editingPermit.dadosCompletos,
                        observacoesGerais: e.target.value,
                      },
                    })
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPermit(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isProcessing ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (ADMINISTRADOR) */}
      {deletingPermitId && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-base font-bold text-slate-900">Confirmar Exclusão de PT?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja excluir esta Permissão de Trabalho do banco de dados? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPermitId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deletingPermitId)}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
              >
                {isProcessing ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
