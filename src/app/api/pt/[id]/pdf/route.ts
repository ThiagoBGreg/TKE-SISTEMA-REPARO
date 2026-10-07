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
