import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFotosServicoAction } from '@/actions/fotoServicoActions';
import { PtFotosServicoClient } from '@/components/pt/PtFotosServicoClient';

export const dynamic = 'force-dynamic';

export default async function PtFotosServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const result = await getFotosServicoAction(id);

  if (!result.success || !result.permit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-black text-slate-900">
            Permissão de Trabalho não encontrada
          </h1>
          <p className="text-xs text-slate-500">
            A PT solicitada não foi localizada ou você não possui autorização para acessá-la.
          </p>
          <Link
            href="/dashboard/reparo/pt"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 px-4 py-2.5 rounded-xl transition"
          >
            ← Voltar para Permissões de Trabalho
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PtFotosServicoClient
      permit={result.permit}
      fotosIniciais={result.fotos || []}
    />
  );
}
