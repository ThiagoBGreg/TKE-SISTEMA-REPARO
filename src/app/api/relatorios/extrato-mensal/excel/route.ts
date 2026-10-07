import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { and, gte, lte, eq } from 'drizzle-orm';
import { db } from '@/db';
import { serviceOrders, users } from '@/db/schema';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subcontractId = searchParams.get('subcontractId');
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // Formato YYYY-MM

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

    // Busca as ordens do subcontratado no banco Neon
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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TKE Elevadores';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Extrato Mensal');

    // Título Principal
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `TKE ELEVADORES - EXTRATO MENSAL DE SERVIÇOS (${month})`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 30;

    // Dados do Prestador
    sheet.mergeCells('A2:G2');
    const subTitleCell = sheet.getCell('A2');
    subTitleCell.value = `Prestador: ${subcontractorUser?.nome || 'Subcontratado'} | Documento: ${subcontractorUser?.documento || 'Não informado'} | Emissão: ${new Date().toLocaleDateString('pt-BR')}`;
    subTitleCell.font = { name: 'Arial', size: 10, italic: true };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(2).height = 20;

    sheet.addRow([]); // Linha em branco

    // Cabeçalhos das Colunas
    const headerRow = sheet.addRow([
      'Código OS',
      'Data Execução',
      'Cliente / Edifício',
      'Equipamento',
      'Escopo do Reparo',
      'Status Financeiro',
      'Valor (R$)',
    ]);

    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
    });

    // Largura das Colunas
    sheet.columns = [
      { key: 'codigo', width: 16 },
      { key: 'data', width: 15 },
      { key: 'cliente', width: 28 },
      { key: 'equipamento', width: 24 },
      { key: 'descricao', width: 38 },
      { key: 'statusFinanceiro', width: 20 },
      { key: 'valor', width: 18 },
    ];

    let totalGeral = 0;

    // População de Linhas com Zebrado
    orders.forEach((order, index) => {
      const valorNum = parseFloat(order.valorServico || '0') || 0;
      totalGeral += valorNum;

      const row = sheet.addRow([
        order.codigo,
        order.createdAt.toISOString().split('T')[0],
        order.clienteNome || 'Cliente',
        order.equipamentoNumero || 'Elevador',
        order.titulo,
        order.statusFinanceiro,
        valorNum,
      ]);

      row.height = 20;
      const isEven = index % 2 === 1;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 7 ? 'right' : 'left' };
        if (isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
        if (colNumber === 7) {
          cell.numFmt = 'R$ #,##0.00';
          cell.font = { name: 'Arial', size: 10, bold: true };
        }
        cell.border = {
          top: { style: 'hair' },
          left: { style: 'thin' },
          bottom: { style: 'hair' },
          right: { style: 'thin' },
        };
      });
    });

    // Linha Totalizadora
    const totalRow = sheet.addRow([
      `TOTAL: ${orders.length} serviços`,
      '',
      '',
      '',
      '',
      '',
      totalGeral,
    ]);

    totalRow.height = 24;
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 11, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'medium' },
        bottom: { style: 'double' },
      };
      if (colNumber === 7) {
        cell.numFmt = 'R$ #,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Extrato_TKE_${month}_${subcontractId}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('[Excel API] Erro ao gerar planilha:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar extrato em Excel.' },
      { status: 500 }
    );
  }
}
