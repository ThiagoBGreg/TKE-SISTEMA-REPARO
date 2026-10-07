import React from 'react';
import Link from 'next/link';

export default function ReparoPage() {
  const ORDERS = [
    {
      id: 'os-001',
      codigo: 'OS-2026-0841',
      titulo: 'Substituição de Cabos de Tração e Polia',
      equipamento: 'Elevador Social 01 - Torre Sul',
      cliente: 'Condomínio Plaza Real',
      prioridade: 'URGENTE',
      status: 'EM_EXECUCAO',
      ptCodigo: 'PT-2026-4412',
      responsavel: 'Lucas Supervisor (TKE)',
    },
    {
      id: 'os-002',
      codigo: 'OS-2026-0842',
      titulo: 'Remoção de Vazamento e Rolamento Máquina',
      equipamento: 'Elevador de Carga 02 - Fábrica',
      cliente: 'Indústrias Metalúrgicas S/A',
      prioridade: 'ALTA',
      status: 'EM_APROVACAO_OSH',
      ptCodigo: 'PT-2026-9921',
      responsavel: 'Marcos Subcontratado',
    },
    {
      id: 'os-003',
      codigo: 'OS-2026-0843',
      titulo: 'Adequação Normativa e Balanceamento',
      equipamento: 'Elevador Panorâmico 03',
      cliente: 'Shopping Metrô Paulista',
      prioridade: 'MEDIA',
      status: 'AGUARDANDO_LOGISTICA',
      ptCodigo: null,
      responsavel: 'Aguardando Atribuição',
    },
    {
      id: 'os-004',
      codigo: 'OS-2026-0844',
      titulo: 'Desacunhamento de Cabine e Ajuste de Freio',
      equipamento: 'Elevador de Serviço 01',
      cliente: 'Hospital Central',
      prioridade: 'URGENTE',
      status: 'PENDENTE',
      ptCodigo: null,
      responsavel: 'Aguardando Atribuição',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ordens de Serviço de Reparo</h1>
          <p className="text-xs text-slate-500">
            Controle de manutenções corretivas, preventivas e substituição de componentes.
          </p>
        </div>

        <Link
          href="/dashboard/reparo/pt"
          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition inline-flex items-center gap-2 self-start"
        >
          <span>✍️</span> Emitir Nova PT
        </Link>
      </div>

      {/* Tabela de Ordens */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
              <tr>
                <th className="p-4">Código / Cliente</th>
                <th className="p-4">Serviço / Equipamento</th>
                <th className="p-4">Prioridade</th>
                <th className="p-4">Responsável</th>
                <th className="p-4">Status / PT</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ORDERS.map((ordem) => (
                <tr key={ordem.id} className="hover:bg-slate-50 transition">
                  <td className="p-4 font-semibold text-slate-900">
                    <div>{ordem.codigo}</div>
                    <div className="text-[11px] font-normal text-slate-500">{ordem.cliente}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{ordem.titulo}</div>
                    <div className="text-[11px] text-slate-500">{ordem.equipamento}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ordem.prioridade === 'URGENTE'
                          ? 'bg-red-100 text-red-700'
                          : ordem.prioridade === 'ALTA'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ordem.prioridade}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{ordem.responsavel}</td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{ordem.status.replace('_', ' ')}</div>
                    {ordem.ptCodigo ? (
                      <span className="text-[10px] text-emerald-600 font-medium">
                        ✓ {ordem.ptCodigo}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium">
                        Sem PT emitida
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/dashboard/reparo/pt?os=${ordem.codigo}`}
                      className="bg-slate-900 hover:bg-black text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
                    >
                      {ordem.ptCodigo ? 'Ver / Abrir PT' : 'Emitir PT'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
