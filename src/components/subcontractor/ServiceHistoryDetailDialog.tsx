'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { SubcontractorHistoryItem } from '@/actions/subcontractorActions';

interface ServiceHistoryDetailDialogProps {
  order: SubcontractorHistoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceHistoryDetailDialog({
  order,
  isOpen,
  onClose,
}: ServiceHistoryDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<'resumo' | 'apr' | 'galeria' | 'timeline'>('resumo');

  if (!isOpen || !order) return null;

  const fotos = order.anexos.filter((a) => a.category === 'FOTO_SERVICO');
  const cartas = order.anexos.filter((a) => a.category === 'CARTA_CONCLUSAO');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header do Modal com Identidade TKE */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-tke-purple to-tke-orange p-0.5 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center p-1">
                <img src="/images/tke-symbol.png" alt="TKE" className="invert brightness-200" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-400 font-mono tracking-wide">
                  {order.codigo}
                </span>
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5 truncate max-w-xl">
                {order.titulo}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'resumo', label: '📋 Resumo do Reparo' },
            { id: 'apr', label: '🛡️ Segurança & APR' },
            { id: 'galeria', label: `📸 Evidências (${order.anexos.length})` },
            { id: 'timeline', label: '⏱️ Linha do Tempo' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`text-xs font-bold py-3 px-3.5 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* ================================================================
              ABA 1: RESUMO DO REPARO
              ================================================================ */}
          {activeTab === 'resumo' && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 font-semibold block">Cliente / Edifício</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {order.clienteNome || 'Não informado'}
                  </span>
                  <span className="text-slate-500 block">{order.clienteUnidade || ''}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Equipamento</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {order.equipamentoNumero || order.localizacao || 'Elevador Padrão'}
                  </span>
                  <span className="text-slate-500 block">
                    {order.temCasaDeMaquinas ? 'Com casa de máquinas' : 'Sem casa de máquinas (MRL)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Categoria do Reparo</span>
                  <span className="text-slate-800 font-semibold">
                    {order.categoriaReparo || 'Manutenção Corretiva Geral'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block">Prioridade</span>
                  <span className="font-bold text-red-600">{order.prioridade}</span>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <span className="font-bold text-slate-800 block mb-1">Escopo do Serviço</span>
                <p className="text-slate-600 bg-white border border-slate-200 p-3 rounded-xl leading-relaxed">
                  {order.descricao}
                </p>
              </div>

              {/* Financeiro */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-emerald-800 font-semibold block">Valor do Serviço</span>
                  <span className="text-lg font-black text-emerald-950">
                    R$ {parseFloat(order.valorServico || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-emerald-800 font-semibold block text-right">
                    Status Financeiro
                  </span>
                  <span className="inline-block px-2.5 py-1 bg-white text-emerald-700 font-bold rounded-lg border border-emerald-300">
                    {order.statusFinanceiro}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              ABA 2: SEGURANÇA & APR
              ================================================================ */}
          {activeTab === 'apr' && (
            <div className="space-y-4">
              {order.permissaoTrabalho ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold">Código da APR</span>
                      <h3 className="text-sm font-bold text-slate-900">
                        {order.permissaoTrabalho.codigo}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                      ✓ {order.permissaoTrabalho.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                    <div>
                      <span className="text-slate-500">Trabalho em Altura (NR-35):</span>
                      <span className="font-bold text-slate-800 block">
                        {order.permissaoTrabalho.trabalhoEmAltura ? 'Sim (Capacitado)' : 'Não'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Assinaturas Digitais:</span>
                      <span className="font-bold text-emerald-700 block">Auditadas e Válidas</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={`/api/pt/${order.permissaoTrabalho.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
                    >
                      📄 Baixar PDF Oficial Assinado da APR
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-2xl">⚠️</span>
                  <p className="text-xs text-slate-600 font-semibold">
                    Nenhuma Permissão de Trabalho (PT) emitida para esta OS ainda.
                  </p>
                  <Link
                    href={`/dashboard/reparo/pt?os=${order.codigo}`}
                    className="inline-block bg-slate-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-lg transition mt-2"
                  >
                    Emitir APR Agora
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              ABA 3: GALERIA DE EVIDÊNCIAS
              ================================================================ */}
          {activeTab === 'galeria' && (
            <div className="space-y-5">
              {/* Fotos de Serviço */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800">
                    Fotos da Execução do Serviço ({fotos.length})
                  </h3>
                  <Link
                    href={`/dashboard/reparo/${order.id}/evidencias`}
                    className="text-xs text-red-600 hover:underline font-semibold"
                  >
                    + Adicionar Fotos
                  </Link>
                </div>

                {fotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {fotos.map((foto) => (
                      <a
                        key={foto.id}
                        href={foto.driveViewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-white transition flex flex-col justify-between text-xs group"
                      >
                        <span className="truncate font-semibold text-slate-800 group-hover:text-red-600">
                          📷 {foto.fileName}
                        </span>
                        <span className="text-[10px] text-blue-600 mt-2 font-medium">
                          Abrir no Google Drive ↗
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-lg">
                    Nenhuma foto de serviço enviada.
                  </p>
                )}
              </div>

              {/* Carta de Conclusão */}
              <div className="space-y-2 border-t border-slate-200 pt-4">
                <h3 className="text-xs font-bold text-slate-800">
                  Carta de Conclusão / Aceite do Cliente ({cartas.length})
                </h3>
                {cartas.length > 0 ? (
                  <div className="space-y-2">
                    {cartas.map((carta) => (
                      <div
                        key={carta.id}
                        className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-emerald-950 truncate pr-2">
                          📄 {carta.fileName}
                        </span>
                        <a
                          href={carta.driveViewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-emerald-700 bg-white border border-emerald-300 px-3 py-1 rounded-lg shrink-0"
                        >
                          Visualizar Carta ↗
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    Carta de conclusão ainda não foi anexada.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ================================================================
              ABA 4: TIMELINE / HISTÓRICO
              ================================================================ */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {order.historico.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {order.historico.map((item, idx) => (
                    <div key={item.id || idx} className="relative text-xs space-y-0.5">
                      <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-4 ring-white" />
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </span>
                      <div className="font-bold text-slate-800">{item.acao}</div>
                      <p className="text-slate-600">{item.descricao}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Sem eventos registrados.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <Link
            href={`/dashboard/reparo`}
            className="text-xs font-bold text-orange-600 hover:text-orange-700 transition"
          >
            📸 Acessar Central de Ordens
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn-tke-dark text-xs px-4 py-2"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
