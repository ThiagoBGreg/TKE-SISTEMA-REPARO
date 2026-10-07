'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  getSubcontractorHistory,
  type SubcontractorHistoryItem,
  type SubcontractorMetrics,
} from '@/actions/subcontractorActions';
import { ServiceHistoryDetailDialog } from '@/components/subcontractor/ServiceHistoryDetailDialog';
import { useRBAC } from '@/hooks/useRBAC';

export default function SubcontractorHistoryPage() {
  const { user } = useRBAC();
  const [isPending, startTransition] = useTransition();

  // Estados de Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // Estados de Dados
  const [orders, setOrders] = useState<SubcontractorHistoryItem[]>([]);
  const [metrics, setMetrics] = useState<SubcontractorMetrics>({
    totalExecutado: 0,
    emAnalise: 0,
    concluidosAprovados: 0,
    pagamentosLiberados: 0,
    valorTotalLiquidar: 0,
    valorTotalLiquidado: 0,
  });

  // Modal de Detalhes
  const [selectedOrder, setSelectedOrder] = useState<SubcontractorHistoryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Estados de Exportação
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ID do subcontratado (usa o ID autenticado ou ID de demonstração)
  const subcontractorId = user?.id || 'a0000000-0000-0000-0000-000000000001';

  // Busca dados ao alterar filtros
  useEffect(() => {
    startTransition(async () => {
      const result = await getSubcontractorHistory(subcontractorId, {
        search: searchTerm,
        status: selectedStatus,
        month: selectedMonth,
      });

      if (result.success) {
        setOrders(result.orders);
        setMetrics(result.metrics);
      }
    });
  }, [subcontractorId, searchTerm, selectedStatus, selectedMonth]);

  const handleOpenDetail = (order: SubcontractorHistoryItem) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    const url = `/api/relatorios/extrato-mensal/excel?subcontractId=${subcontractorId}&month=${selectedMonth}`;
    window.open(url, '_blank');
    setTimeout(() => setIsExportingExcel(false), 1500);
  };

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    const url = `/api/relatorios/extrato-mensal/pdf?subcontractId=${subcontractorId}&month=${selectedMonth}`;
    window.open(url, '_blank');
    setTimeout(() => setIsExportingPdf(false), 1500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header com Branding e Exportação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-red-600 tracking-wider uppercase">
            Portal do Prestador • TKE
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Histórico de Serviços & Extrato Mensal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe suas ordens de reparo executadas, vistorias técnicas e valores liberados.
          </p>
        </div>

        {/* Botões de Exportação */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition"
          >
            {isExportingExcel ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>📊</span>
            )}
            Baixar Excel (.xlsx)
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition"
          >
            {isExportingPdf ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>📄</span>
            )}
            Extrato em PDF
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 block">Total Atendido</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {metrics.totalExecutado}
          </span>
          <span className="text-[10px] text-slate-400">serviços no mês</span>
        </div>

        <div className="bg-white border border-amber-200 bg-amber-50/20 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-medium text-amber-700 block">Em Andamento</span>
          <span className="text-2xl font-black text-amber-900 mt-1 block">
            {metrics.emAnalise}
          </span>
          <span className="text-[10px] text-amber-600">aguardando validação</span>
        </div>

        <div className="bg-white border border-blue-200 bg-blue-50/20 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-medium text-blue-700 block">Concluídos / Aprovados</span>
          <span className="text-2xl font-black text-blue-900 mt-1 block">
            {metrics.concluidosAprovados}
          </span>
          <span className="text-[10px] text-blue-600">laudos validados</span>
        </div>

        <div className="bg-white border border-emerald-200 bg-emerald-50/30 p-4 rounded-2xl shadow-xs">
          <span className="text-[11px] font-medium text-emerald-700 block">Valor Liquidado</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-950 mt-1 block">
            R$ {metrics.valorTotalLiquidado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-emerald-600">
            A receber: R$ {metrics.valorTotalLiquidar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Campo de Busca com debounce */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por OS, Edifício, Equipamento ou Descrição..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Filtro de Status */}
        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="EM_EXECUCAO">Em Execução</option>
            <option value="EM_APROVACAO_OSH">Aguardando OSH</option>
            <option value="VALIDACAO_TECNICA">Validação Técnica</option>
            <option value="CONCLUIDA">Concluída</option>
          </select>

          {/* Seletor de Mês */}
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
          />
        </div>
      </div>

      {/* Lista Mobile e Tabela Desktop */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isPending ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold space-y-2">
            <span className="animate-spin text-2xl block">⏳</span>
            <span>Carregando histórico do subcontratado...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <span className="text-3xl block">📋</span>
            <h3 className="text-sm font-bold text-slate-800">Nenhum serviço encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Não foram localizadas ordens de serviço para os filtros selecionados. Tente ajustar o mês de referência ou o termo de busca.
            </p>
          </div>
        ) : (
          <>
            {/* Tabela Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-4">Código / Data</th>
                    <th className="p-4">Cliente / Equipamento</th>
                    <th className="p-4">Status da OS</th>
                    <th className="p-4 text-center">APR Digital</th>
                    <th className="p-4 text-center">Carta de Aceite</th>
                    <th className="p-4 text-right">Valor (R$)</th>
                    <th className="p-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order) => {
                    const hasCarta = order.anexos.some((a) => a.category === 'CARTA_CONCLUSAO');
                    const hasFotos = order.anexos.some((a) => a.category === 'FOTO_SERVICO');

                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <span className="font-bold text-slate-900 block">{order.codigo}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 truncate max-w-xs">
                            {order.clienteNome || 'Cliente Não Informado'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            📍 {order.equipamentoNumero || order.localizacao || 'Elevador'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              order.status === 'CONCLUIDA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'EM_EXECUCAO'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'EM_APROVACAO_OSH'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {order.permissaoTrabalho ? (
                            <span className="text-emerald-600 font-bold" title="APR Emitida">
                              ✓ {order.permissaoTrabalho.codigo}
                            </span>
                          ) : (
                            <span className="text-slate-300">Pendente</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {hasCarta ? (
                            <span className="text-emerald-600 font-bold" title="Carta Anexada">
                              ✓ Anexada
                            </span>
                          ) : (
                            <span className="text-amber-500 font-medium">Aguardando</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold text-slate-900">
                          R$ {parseFloat(order.valorServico || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(order)}
                            className="bg-slate-900 hover:bg-black text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            Ver Detalhes
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards Empilhados no Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {orders.map((order) => {
                const hasCarta = order.anexos.some((a) => a.category === 'CARTA_CONCLUSAO');

                return (
                  <div key={order.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        {order.codigo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'CONCLUIDA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{order.titulo}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        📍 {order.clienteNome} • {order.equipamentoNumero || 'Elevador'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-lg">
                      <span>
                        APR: {order.permissaoTrabalho ? '✓ Assinada' : 'Pendente'}
                      </span>
                      <span>
                        Carta: {hasCarta ? '✓ Anexada' : 'Pendente'}
                      </span>
                      <span className="font-bold text-slate-900">
                        R$ {parseFloat(order.valorServico || '0').toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(order)}
                        className="flex-1 bg-slate-900 hover:bg-black text-white text-xs font-bold py-2 rounded-xl text-center transition"
                      >
                        Ver Ficha Completa
                      </button>
                      <Link
                        href={`/dashboard/reparo/${order.id}/evidencias`}
                        className="bg-red-50 text-red-600 font-bold text-xs px-3 py-2 rounded-xl border border-red-200 hover:bg-red-100 transition flex items-center justify-center"
                      >
                        📸 Fotos
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Drawer / Dialog de Detalhes da OS */}
      <ServiceHistoryDetailDialog
        order={selectedOrder}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
