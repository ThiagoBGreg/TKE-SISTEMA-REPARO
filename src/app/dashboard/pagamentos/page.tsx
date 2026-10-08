import React from 'react';
import { PermissionGate } from '@/hooks/useRBAC';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { TkeLogo } from '@/components/ui/TkeLogo';

export default function PagamentosDashboardPage() {
  const INVOICES = [
    {
      id: 'fat-01',
      subcontratado: 'Elevatech Manutenção Técnica Ltda',
      os: 'OS-2026-0835',
      pt: 'PT-2026-3391',
      valor: 'R$ 4.850,00',
      dataConclusao: '05/10/2026',
      status: 'Aguardando Liquidação',
    },
    {
      id: 'fat-02',
      subcontratado: 'Alfa Reparos em Máquinas Eireli',
      os: 'OS-2026-0838',
      pt: 'PT-2026-4402',
      valor: 'R$ 3.200,00',
      dataConclusao: '06/10/2026',
      status: 'Aguardando Liquidação',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TkeLogo variant="badge" size="sm" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Módulo Administrativo • Pagamento de Subcontratados
          </h1>
          <p className="text-xs text-slate-500">
            Validação de OS concluídas com APR aprovada para liberação de medições e faturamento TKE.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Medições Concluídas Prontas para Pagamento</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            {INVOICES.length} medições
          </span>
        </h2>

        <div className="space-y-3">
          {INVOICES.map((inv) => (
            <div
              key={inv.id}
              className="p-4 rounded-xl border border-purple-200/80 bg-purple-50/30 hover:bg-purple-50/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-950">{inv.subcontratado}</span>
                  <span className="text-xs text-slate-500 font-mono">({inv.os} • {inv.pt})</span>
                </div>
                <div className="text-sm font-black text-slate-900">{inv.valor}</div>
                <p className="text-xs text-slate-500">Concluído em: {inv.dataConclusao}</p>
              </div>

              <div className="flex items-center gap-2">
                <PermissionGate resource="PAGAMENTOS_SUBCONTRATADOS" action="PROCESS_PAYMENT">
                  <AnimatedButton
                    variant="purple"
                    size="xs"
                    shimmer
                    lift
                    icon={<span>💳</span>}
                  >
                    Processar Pagamento
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

