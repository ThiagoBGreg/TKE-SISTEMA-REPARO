import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { eq } from 'drizzle-orm';
import React from 'react';
import { db } from '@/db';
import { workPermits } from '@/db/schema';
import { PtReparoPdfDocument } from '@/components/pt/PtReparoPdfDocument';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [permit] = await db
      .select()
      .from(workPermits)
      .where(eq(workPermits.id, id))
      .limit(1);

    if (!permit) {
      return NextResponse.json(
        { error: 'Permissão de Trabalho não encontrada.' },
        { status: 404 }
      );
    }

    // Validação de acesso para Subcontratados
    const sessionCookie = request.cookies.get('tke_session')?.value;
    if (sessionCookie) {
      try {
        const user = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as any;
        const { isSuperAdmin } = await import('@/lib/permissions');
        const isAdmin = isSuperAdmin(user);
        const isSubcontratado = !isAdmin && user?.cargo === 'SUBCONTRATADO';

        if (isSubcontratado && user?.id) {
          const { serviceOrders } = await import('@/db/schema');
          const [order] = await db
            .select({ subcontratadoId: serviceOrders.subcontratadoId })
            .from(serviceOrders)
            .where(eq(serviceOrders.id, permit.serviceOrderId))
            .limit(1);

          const isOwner =
            permit.criadoPorId === user.id ||
            order?.subcontratadoId === user.id;

          if (!isOwner) {
            return NextResponse.json(
              { error: 'Acesso negado: Subcontratados somente podem baixar as próprias APRs.' },
              { status: 403 }
            );
          }
        }
      } catch {
        // Ignora erro de parse de cookie
      }
    }

    // Renderiza o PDF para Buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(PtReparoPdfDocument, {
        data: permit.dadosCompletos,
        codigoPT: permit.codigo,
      }) as any
    );

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="PT_REPARO_${permit.codigo}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[PDF API] Erro ao gerar PDF da PT:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar o arquivo PDF para download.' },
      { status: 500 }
    );
  }
}
