import React from 'react';
import { getAcompanhamentoServicosAction } from '@/actions/acompanhamentoActions';
import { AcompanhamentoMapaView } from '@/components/acompanhamento/AcompanhamentoMapaView';

export const metadata = {
  title: 'Acompanhamento de Serviços & APR em Tempo Real | TKE Elevadores',
  description: 'Mapa interativo de localização exata de preenchimento das APRs e técnicos em campo.',
};

export const dynamic = 'force-dynamic';

export default async function AcompanhamentoServicosPage() {
  const result = await getAcompanhamentoServicosAction();

  return (
    <main className="py-2">
      <AcompanhamentoMapaView
        pontos={result.pontos || []}
        totalSemCoordenadas={result.totalSemCoordenadas || 0}
        isAdmin={!!result.isAdmin}
        isSubcontratado={!!result.isSubcontratado}
      />
    </main>
  );
}
