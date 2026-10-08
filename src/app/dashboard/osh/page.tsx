import React from 'react';
import { PermissionGate } from '@/hooks/useRBAC';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { TkeLogo } from '@/components/ui/TkeLogo';

export default function OshDashboardPage() {
  const PENDING_REVIEWS = [
    {
      os: 'OS-2026-0842',
      pt: 'PT-2026-9921',
      cliente: 'Indústrias Metalúrgicas S/A',
      atividade: 'Trabalho em Altura (NR-35) + Içamento de Carga Pesada',
      data: '07/10/2026 10:30',
      status: 'Aguardando Parecer Técnico',
    },
    {
      os: 'OS-2026-0839',
      pt: 'PT-2026-8812',
      cliente: 'Condomínio Solar das Palmeiras',
      atividade: 'Intervenção Elétrica em Quadro de Força (NR-10)',
      data: '07/10/2026 09:15',
      status: 'Aguardando Parecer Técnico',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TkeLogo variant="badge" size="sm" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Módulo OSH • Segurança do Trabalho</h1>
          <p className="text-xs text-slate-500">
            Validação de Análise Preliminar de Riscos (APR), conformidade com NR-10, NR-18, NR-35 e laudos técnicos TKE.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Permissões de Trabalho Aguardando Parecer OSH</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            {PENDING_REVIEWS.length} pendentes
          </span>
        </h2>

        <div className="space-y-3">
          {PENDING_REVIEWS.map((item) => (
            <div
              key={item.pt}
              className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/40 hover:bg-amber-50/70 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-amber-950 font-mono">{item.pt}</span>
                  <span className="text-xs text-slate-500 font-mono">({item.os})</span>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                    {item.status}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-slate-800">{item.atividade}</h3>
                <p className="text-xs text-slate-500">📍 {item.cliente} • {item.data}</p>
              </div>

              <div className="flex items-center gap-2">
                <PermissionGate
                  resource="OSH_SEGURANCA"
                  action="APPROVE_OSH"
                  fallback={
                    <span className="text-xs text-slate-400 italic">
                      Apenas Técnicos/Coordenadores OSH podem aprovar
                    </span>
                  }
                >
                  <AnimatedButton
                    variant="orange"
                    size="xs"
                    shimmer
                    lift
                    icon={<span>✓</span>}
                  >
                    Aprovar Laudo OSH
                  </AnimatedButton>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

