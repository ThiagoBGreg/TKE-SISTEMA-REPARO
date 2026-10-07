import React from 'react';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const KPIS = [
    { label: 'OS de Reparo Ativas', value: '14', change: '+3 hoje', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    { label: 'PTs / APRs em Campo', value: '8', change: '5 com NR-35', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
    { label: 'Aguardando OSH', value: '3', change: 'Prioridade Alta', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    { label: 'Logística DLOG (Rotas)', value: '6', change: '2 em trânsito', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  ];

  const RECENT_ORDERS = [
    {
      id: 'os-001',
      codigo: 'OS-2026-0841',
      titulo: 'Substituição de Cabos de Tração e Polia',
      equipamento: 'Elevador Social 01 - Torre Sul',
      cliente: 'Condomínio Plaza Real',
      prioridade: 'URGENTE',
      status: 'EM_EXECUCAO',
      temPt: true,
      ptCodigo: 'PT-2026-4412',
    },
    {
      id: 'os-002',
      codigo: 'OS-2026-0842',
      titulo: 'Remoção de Vazamento e Rolamento Máquina',
      equipamento: 'Elevador de Carga 02 - Fábrica',
      cliente: 'Indústrias Metalúrgicas S/A',
      prioridade: 'ALTA',
      status: 'EM_APROVACAO_OSH',
      temPt: true,
      ptCodigo: 'PT-2026-9921',
    },
    {
      id: 'os-003',
      codigo: 'OS-2026-0843',
      titulo: 'Adequação Normativa e Balanceamento',
      equipamento: 'Elevador Panorâmico 03',
      cliente: 'Shopping Metrô Paulista',
      prioridade: 'MEDIA',
      status: 'AGUARDANDO_LOGISTICA',
      temPt: false,
    },
    {
      id: 'os-004',
      codigo: 'OS-2026-0844',
      titulo: 'Desacunhamento de Cabine e Ajuste de Freio',
      equipamento: 'Elevador de Serviço 01',
      cliente: 'Hospital Central',
      prioridade: 'URGENTE',
      status: 'PENDENTE',
      temPt: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Visão Geral Operacional</h1>
          <p className="text-xs text-slate-500">
            Monitoramento em tempo real das Ordens de Serviço, APRs e equipes em campo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reparo/pt"
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>✍️</span> Emitir PT / APR Reparo
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className={`p-5 rounded-2xl border ${kpi.bg} bg-white shadow-xs flex flex-col justify-between`}
          >
            <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
              <span className="text-[11px] font-semibold text-slate-600">{kpi.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Ordens Recentes */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Ordens de Serviço em Destaque</h2>
            <p className="text-xs text-slate-500">Fluxo operacional com vinculação de PT e permissões</p>
          </div>
          <Link
            href="/dashboard/reparo"
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Ver todas →
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {RECENT_ORDERS.map((order) => (
            <div
              key={order.id}
              className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{order.codigo}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.prioridade === 'URGENTE'
                        ? 'bg-red-100 text-red-700'
                        : order.prioridade === 'ALTA'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {order.prioridade}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-600 font-medium">{order.cliente}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-800">{order.titulo}</h3>
                <p className="text-xs text-slate-500">📍 {order.equipamento}</p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {order.temPt ? (
                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    ✓ PT Emitida ({order.ptCodigo})
                  </span>
                ) : (
                  <Link
                    href={`/dashboard/reparo/pt?os=${order.codigo}`}
                    className="text-[11px] font-semibold bg-slate-900 hover:bg-black text-white px-3 py-1.5 rounded-lg transition"
                  >
                    Emitir PT
                  </Link>
                )}

                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                  {order.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
