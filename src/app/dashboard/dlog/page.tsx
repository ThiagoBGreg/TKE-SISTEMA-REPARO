import React from 'react';
import { PermissionGate } from '@/hooks/useRBAC';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { TkeLogo } from '@/components/ui/TkeLogo';

export default function DlogDashboardPage() {
  const ROUTES = [
    {
      id: 'rota-01',
      motorista: 'Roberto DLOG (Frota Van 04)',
      destino: 'Condomínio Plaza Real • São Paulo/SP',
      carga: 'Cabos de Tração 1/2" + Polia 620mm',
      os: 'OS-2026-0841',
      status: 'EM_TRANSITO',
    },
    {
      id: 'rota-02',
      motorista: 'Aguardando Despacho',
      destino: 'Indústrias Metalúrgicas S/A • Guarulhos/SP',
      carga: 'Rolamentos de Alta Rotação + Óleo Sintético',
      os: 'OS-2026-0842',
      status: 'AGUARDANDO_VEICULO',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TkeLogo variant="badge" size="sm" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Módulo DLOG • Logística e Frotas</h1>
          <p className="text-xs text-slate-500">
            Despacho de peças pesadas, roteirização de motoristas e entrega de ferramentais especiais em campo.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Rotas e Despachos do Dia</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            {ROUTES.length} rotas ativas
          </span>
        </h2>

        <div className="space-y-3">
          {ROUTES.map((route) => (
            <div
              key={route.id}
              className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{route.motorista}</span>
                  <span className="text-xs text-slate-500 font-mono">({route.os})</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      route.status === 'EM_TRANSITO'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {route.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-slate-800">📦 Carga: {route.carga}</h3>
                <p className="text-xs text-slate-500">📍 Destino: {route.destino}</p>
              </div>

              <div className="flex items-center gap-2">
                <PermissionGate resource="DLOG_LOGISTICA" action="DISPATCH_DRIVER">
                  <AnimatedButton
                    variant="dark"
                    size="xs"
                    shimmer
                    lift
                    icon={<span>🚚</span>}
                  >
                    Despachar Motorista
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

