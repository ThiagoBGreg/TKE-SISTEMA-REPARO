import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { CartaConclusaoPdfDocument } from '@/components/pt/CartaConclusaoPdfDocument';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      codigoPT = 'PT-REPARO',
      contratoOrcamento = '',
      equipamento = '',
      tecnicoNome = '',
      dataHoraTermino = '',
      observacoes = '',
      fotoBase64,
    } = body;

    if (!fotoBase64) {
      return NextResponse.json(
        { error: 'A foto da carta de conclusão é obrigatória para gerar o PDF.' },
        { status: 400 }
      );
    }

    // Renderiza o PDF para Buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(CartaConclusaoPdfDocument, {
        codigoPT,
        contratoOrcamento,
        equipamento,
        tecnicoNome,
        dataHoraTermino,
        observacoes,
        fotoBase64,
      }) as any
    );

    const safeCodigo = codigoPT.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Carta_Conclusao_${safeCodigo}.pdf"`,
      },
    });
  } catch (error) {
    console.error('[Carta Conclusao PDF API] Erro ao gerar PDF:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar o arquivo PDF da carta de conclusão.' },
      { status: 500 }
    );
  }
}
