import React from 'react';
import { PermissionGate } from '@/hooks/useRBAC';

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
      <div>
        <h1 className="text-xl font-bold text-slate-900">Módulo DLOG • Logística e Frotas</h1>
        <p className="text-xs text-slate-500">
          Despacho de peças pesadas, roteirização de motoristas e entrega de ferramentais especiais em campo.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Rotas e Despachos do Dia</h2>

        <div className="space-y-3">
          {ROUTES.map((route) => (
            <div
              key={route.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{route.motorista}</span>
                  <span className="text-xs text-slate-500 font-mono">({route.os})</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      route.status === 'EM_TRANSITO'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
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
                  <button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition"
                  >
                    🚚 Despachar Motorista
                  </button>
                </PermissionGate>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
