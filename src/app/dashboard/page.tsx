import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { TkeLogo } from '@/components/ui/TkeLogo';

export default function DashboardOverviewPage() {
  const KPIS = [
    {
      label: 'OS de Reparo Ativas',
      value: '14',
      change: '+3 hoje',
      color: 'text-orange-600',
      bg: 'border-orange-200/80 hover:border-orange-400',
      accent: 'from-orange-500 to-amber-500',
      icon: '⚙️',
    },
    {
      label: 'PTs / APRs em Campo',
      value: '8',
      change: '5 com NR-35',
      color: 'text-purple-600',
      bg: 'border-purple-200/80 hover:border-purple-400',
      accent: 'from-purple-600 to-pink-600',
      icon: '🛡️',
    },
    {
      label: 'Aguardando OSH',
      value: '3',
      change: 'Prioridade Alta',
      color: 'text-amber-600',
      bg: 'border-amber-200/80 hover:border-amber-400',
      accent: 'from-amber-500 to-orange-500',
      icon: '⚠️',
    },
    {
      label: 'Logística DLOG (Rotas)',
      value: '6',
      change: '2 em trânsito',
      color: 'text-emerald-600',
      bg: 'border-emerald-200/80 hover:border-emerald-400',
      accent: 'from-emerald-600 to-teal-600',
      icon: '🚚',
    },
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
      {/* Banner Superior com Keyvisual Oficial TKE */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-900 group">
        <div className="relative h-32 sm:h-36 w-full">
          <Image
            src="/images/brand-keyvisual-1900px_image_w1900_h450.webp"
            alt="TKE Move Beyond Banner"
            fill
            className="object-cover opacity-90 group-hover:scale-102 transition-transform duration-700"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent flex items-center justify-between p-6 sm:p-8">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                MOVE BEYOND • Operações & Manutenção
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Visão Geral Operacional TKE
              </h1>
              <p className="text-xs text-slate-200 max-w-lg hidden sm:block">
                Controle unificado de ordens de serviço, liberação de APRs digitais e monitoramento em tempo real.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <AnimatedButton
                href="/dashboard/reparo/pt"
                variant="gradient"
                size="md"
                shimmer
                glow
                lift
                icon={<span>✍️</span>}
              >
                Emitir Nova PT / APR
              </AnimatedButton>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid com Micro-Animações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => (
          <div
            key={kpi.label}
            className={`p-5 rounded-2xl border ${kpi.bg} bg-white shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between relative overflow-hidden group`}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${kpi.accent} opacity-80 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
              <span className="text-base">{kpi.icon}</span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <span className={`text-3xl font-black ${kpi.color} tracking-tight`}>{kpi.value}</span>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Ordens Recentes */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <TkeLogo variant="symbol" size="xs" />
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Ordens de Serviço em Destaque
              </h2>
              <p className="text-xs text-slate-500">Fluxo operacional com vinculação de PT e permissões de segurança</p>
            </div>
          </div>
          <Link
            href="/dashboard/reparo"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 group transition-colors"
          >
            <span>Ver todas</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {RECENT_ORDERS.map((order) => (
            <div
              key={order.id}
              className="p-4 sm:p-5 hover:bg-orange-50/20 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                    {order.codigo}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      order.prioridade === 'URGENTE'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : order.prioridade === 'ALTA'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {order.prioridade}
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-600 font-semibold">{order.cliente}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-800">{order.titulo}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <span>📍</span> {order.equipamento}
                </p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {order.temPt ? (
                  <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    PT Emitida ({order.ptCodigo})
                  </span>
                ) : (
                  <AnimatedButton
                    href={`/dashboard/reparo/pt?os=${order.codigo}`}
                    variant="orange"
                    size="xs"
                    shimmer
                    lift
                    icon={<span>✍️</span>}
                  >
                    Emitir PT
                  </AnimatedButton>
                )}

                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-mono">
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

