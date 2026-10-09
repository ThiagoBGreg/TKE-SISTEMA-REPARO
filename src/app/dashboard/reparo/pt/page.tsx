import React, { Suspense } from 'react';
import { getPtReparosAction } from '@/actions/ptReparoActions';
import { PtManagementView } from '@/components/pt/PtManagementView';

export const metadata = {
  title: 'Permissões de Trabalho & APR | TKE Elevadores',
  description: 'Módulo de Gestão de Permissão de Trabalho e Análise Preliminar de Risco para serviços de reparo.',
};

export const dynamic = 'force-dynamic';

export default async function PtReparoPage() {
  const result = await getPtReparosAction();

  return (
    <main className="py-2">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500 font-medium">Carregando permissões de trabalho e APRs...</div>}>
        <PtManagementView
          initialPermits={(result.permits || []) as any}
          isAdmin={!!result.isAdmin}
          isSubcontratado={!!result.isSubcontratado}
        />
      </Suspense>
    </main>
  );
}
