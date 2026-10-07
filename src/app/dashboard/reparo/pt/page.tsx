import React from 'react';
import { PtReparoWizard } from '@/components/pt/PtReparoWizard';

export const metadata = {
  title: 'Emissão de PT / APR Reparo | TKE Elevadores',
  description: 'Módulo de Permissão de Trabalho e Análise Preliminar de Risco para serviços de reparo.',
};

export default function PtReparoPage() {
  // Mock ID ou recuperado via searchParams / Context
  const serviceOrderId = 'a0000000-0000-0000-0000-000000000001';

  return (
    <main className="py-6">
      <PtReparoWizard
        serviceOrderId={serviceOrderId}
        defaultContrato="CT-2026-99420"
        defaultEquipamento="Elevador Social 01 (Torre Sul)"
      />
    </main>
  );
}
