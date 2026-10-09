import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { serviceOrders } from '@/db/schema';
import { getAttachmentsByOrderAction } from '@/actions/attachmentActions';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';

export default async function EvidenciasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Busca detalhes da OS
  const [order] = await db
    .select()
    .from(serviceOrders)
    .where(eq(serviceOrders.id, id))
    .limit(1);

  if (!order) {
    notFound();
  }

  // Busca anexos existentes
  const attachments = await getAttachmentsByOrderAction(id);

  return (
    <div className="space-y-6">
      {/* Breadcrumb e Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/dashboard/reparo" className="hover:underline">
              Solicitação de Serviços
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">{order.codigo}</span>
            <span>/</span>
            <span>Evidências & Aceite</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Upload de Evidências Fotográficas & Carta de Conclusão
          </h1>
          <p className="text-xs text-slate-500">
            {order.titulo} • {order.clienteNome || 'Cliente'} (
            {order.equipamentoNumero || order.localizacao || 'Equipamento'})
          </p>
        </div>

        <Link
          href={`/dashboard/reparo`}
          className="bg-white border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-50 transition self-start"
        >
          ← Voltar para Solicitações
        </Link>
      </div>

      {/* Componente Uploader */}
      <AttachmentUploader
        serviceOrderId={id}
        initialFotos={attachments.fotos}
        initialCartas={attachments.cartas}
      />
    </div>
  );
}
