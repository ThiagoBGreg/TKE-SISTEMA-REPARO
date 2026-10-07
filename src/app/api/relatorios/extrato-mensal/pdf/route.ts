import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { and, gte, lte, eq } from 'drizzle-orm';
import React from 'react';
import { db } from '@/db';
import { serviceOrders, users, workPermits } from '@/db/schema';
import { MonthlyStatementPdf } from '@/components/reports/MonthlyStatementPdf';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subcontractId = searchParams.get('subcontractId');
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    if (!subcontractId) {
      return NextResponse.json(
        { error: 'ID do subcontratado é obrigatório' },
        { status: 400 }
      );
    }

    const [subcontractorUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, subcontractId))
      .limit(1);

    const startDate = new Date(`${month}-01T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const orders = await db
      .select()
      .from(serviceOrders)
      .where(
        and(
          eq(serviceOrders.subcontratadoId, subcontractId),
          gte(serviceOrders.createdAt, startDate),
          lte(serviceOrders.createdAt, endDate)
        )
      );

    const formattedOrders = await Promise.all(
      orders.map(async (order) => {
        const [pt] = await db
          .select({ status: workPermits.status })
          .from(workPermits)
          .where(eq(workPermits.serviceOrderId, order.id))
          .limit(1);

        return {
          codigo: order.codigo,
          data: order.createdAt.toISOString().split('T')[0],
          equipamento: `${order.equipamentoNumero || 'Elevador'} - ${order.clienteNome || ''}`,
          descricao: order.titulo,
          aprStatus: pt?.status || 'PENDENTE',
          statusFinanceiro: order.statusFinanceiro,
          valor: parseFloat(order.valorServico || '0') || 0,
        };
      })
    );

    const pdfBuffer = await renderToBuffer(
      React.createElement(MonthlyStatementPdf, {
        subcontractorName: subcontractorUser?.nome || 'Prestador Subcontratado',
        subcontractorDoc: subcontractorUser?.documento || 'Não informado',
        month,
        emissaoDate: new Date().toLocaleDateString('pt-BR'),
        orders: formattedOrders,
      }) as any
    );

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Extrato_TKE_${month}_${subcontractId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[PDF API] Erro ao gerar Extrato Mensal em PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar extrato em PDF.' },
      { status: 500 }
    );
  }
}
