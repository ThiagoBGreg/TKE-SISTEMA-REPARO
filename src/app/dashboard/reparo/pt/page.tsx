import React from 'react';
import { PtReparoWizard } from '@/components/pt/PtReparoWizard';

export const metadata = {
  title: 'Emissão de PT / APR Reparo | TKE Elevadores',
  description: 'Módulo de Permissão de Trabalho e Análise Preliminar de Risco para serviços de reparo.',
};

interface PtReparoPageProps {
  searchParams?: Promise<{
    osId?: string;
    contrato?: string;
    equipamento?: string;
  }>;
}

export default async function PtReparoPage(props: PtReparoPageProps) {
  const searchParams = await props.searchParams;
  const serviceOrderId = searchParams?.osId || 'a0000000-0000-0000-0000-000000000001';
  const defaultContrato = searchParams?.contrato || 'CT-2026-99420';
  const defaultEquipamento = searchParams?.equipamento || 'Elevador Social 01 (Torre Sul)';

  return (
    <main className="py-6">
      <PtReparoWizard
        serviceOrderId={serviceOrderId}
        defaultContrato={defaultContrato}
        defaultEquipamento={defaultEquipamento}
      />
    </main>
  );
}
