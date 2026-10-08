import React from 'react';
import { getPtReparosAction } from '@/actions/ptReparoActions';
import { PtManagementView } from '@/components/pt/PtManagementView';

export const metadata = {
  title: 'Permissões de Trabalho & APR | TKE Elevadores',
  description: 'Módulo de Gestão de Permissão de Trabalho e Análise Preliminar de Risco para serviços de reparo.',
};

export default async function PtReparoPage() {
  const result = await getPtReparosAction();

  return (
    <main className="py-2">
      <PtManagementView
        initialPermits={(result.permits || []) as any}
        isAdmin={!!result.isAdmin}
      />
    </main>
  );
}
