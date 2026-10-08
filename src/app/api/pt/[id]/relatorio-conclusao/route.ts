import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { eq, or, and } from 'drizzle-orm';
import React from 'react';
import { db } from '@/db';
import { workPermits, serviceOrders, serviceOrderAttachments } from '@/db/schema';
import { RelatorioConclusaoUnificadoPdfDocument } from '@/components/pt/RelatorioConclusaoUnificadoPdfDocument';
import type { FotoServicoItem } from '@/actions/fotoServicoActions';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'Identificador da PT não informado.' },
        { status: 400 }
      );
    }

    // 1. Busca a PT por UUID ou por Código público
    const [permit] = await db
      .select()
      .from(workPermits)
      .where(or(eq(workPermits.id, id), eq(workPermits.codigo, id)))
      .limit(1);

    if (!permit) {
      return NextResponse.json(
        { error: 'Permissão de Trabalho não encontrada.' },
        { status: 404 }
      );
    }

    // 2. Validação de acesso para Subcontratados
    const sessionCookie = request.cookies.get('tke_session')?.value;
    if (sessionCookie) {
      try {
        const user = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) as any;
        const { isSuperAdmin } = await import('@/lib/permissions');
        const isAdmin = isSuperAdmin(user);
        const isSubcontratado = !isAdmin && user?.cargo === 'SUBCONTRATADO';

        if (isSubcontratado && user?.id) {
          let isOwner = permit.criadoPorId === user.id;

          if (!isOwner && permit.serviceOrderId) {
            const [order] = await db
              .select({ subcontratadoId: serviceOrders.subcontratadoId })
              .from(serviceOrders)
              .where(eq(serviceOrders.id, permit.serviceOrderId))
              .limit(1);

            if (order?.subcontratadoId === user.id) {
              isOwner = true;
            }
          }

          if (!isOwner) {
            return NextResponse.json(
              { error: 'Acesso negado: Subcontratados somente podem baixar os próprios relatórios.' },
              { status: 403 }
            );
          }
        }
      } catch {
        // Ignora erro de cookie
      }
    }

    // 3. Coleta fotos do serviço (dadosCompletos + serviceOrderAttachments)
    const fotosFromDados: FotoServicoItem[] =
      ((permit.dadosCompletos as any)?.fotosServico as FotoServicoItem[]) || [];

    let fotosFromAttachments: FotoServicoItem[] = [];
    if (permit.serviceOrderId) {
      try {
        const attachments = await db
          .select({
            id: serviceOrderAttachments.id,
            fileName: serviceOrderAttachments.fileName,
            driveViewUrl: serviceOrderAttachments.driveViewUrl,
            driveDownloadUrl: serviceOrderAttachments.driveDownloadUrl,
            fileSize: serviceOrderAttachments.fileSize,
            createdAt: serviceOrderAttachments.createdAt,
          })
          .from(serviceOrderAttachments)
          .where(
            and(
              eq(serviceOrderAttachments.serviceOrderId, permit.serviceOrderId),
              eq(serviceOrderAttachments.category, 'FOTO_SERVICO')
            )
          )
          .orderBy(serviceOrderAttachments.createdAt);

        fotosFromAttachments = attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          driveViewUrl: a.driveViewUrl,
          driveDownloadUrl: a.driveDownloadUrl || a.driveViewUrl,
          enviadoEm: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
          fileSize: a.fileSize || undefined,
        }));
      } catch (attErr) {
        console.warn('[RelatorioConclusao API] Erro ao carregar fotos dos anexos:', attErr);
      }
    }

    // Remove duplicatas de fotos
    const mapaFotos = new Map<string, FotoServicoItem>();
    fotosFromDados.forEach((f) => mapaFotos.set(f.id, f));
    fotosFromAttachments.forEach((f) => {
      if (!mapaFotos.has(f.id)) {
        mapaFotos.set(f.id, f);
      }
    });
    const fotosServico = Array.from(mapaFotos.values());

    // 4. Coleta carta de conclusão
    let cartaConclusaoData: {
      fotoBase64?: string;
      tecnicoNome?: string;
      dataHoraTermino?: string;
      observacoes?: string;
    } | null = null;

    const cartaRaw = (permit.dadosCompletos as any)?.cartaConclusao;
    if (cartaRaw) {
      cartaConclusaoData = {
        fotoBase64: cartaRaw.rawBase64 || cartaRaw.driveViewUrl || '',
        tecnicoNome: cartaRaw.tecnicoNome || (permit.dadosCompletos as any)?.terminoServico?.emitenteAssinatura?.nome || '',
        dataHoraTermino: cartaRaw.dataHoraTermino || (permit.dadosCompletos as any)?.terminoServico?.dataHoraTermino || '',
        observacoes: cartaRaw.observacoes || (permit.dadosCompletos as any)?.terminoServico?.observacoesGerais || '',
      };
    } else if (permit.serviceOrderId) {
      // Tenta buscar no serviceOrderAttachments
      try {
        const [cartaAtt] = await db
          .select({
            id: serviceOrderAttachments.id,
            driveViewUrl: serviceOrderAttachments.driveViewUrl,
            createdAt: serviceOrderAttachments.createdAt,
          })
          .from(serviceOrderAttachments)
          .where(
            and(
              eq(serviceOrderAttachments.serviceOrderId, permit.serviceOrderId),
              eq(serviceOrderAttachments.category, 'CARTA_CONCLUSAO')
            )
          )
          .limit(1);

        if (cartaAtt) {
          cartaConclusaoData = {
            fotoBase64: cartaAtt.driveViewUrl,
            tecnicoNome: (permit.dadosCompletos as any)?.terminoServico?.emitenteAssinatura?.nome || '',
            dataHoraTermino: (permit.dadosCompletos as any)?.terminoServico?.dataHoraTermino || '',
            observacoes: (permit.dadosCompletos as any)?.terminoServico?.observacoesGerais || '',
          };
        }
      } catch (cartaErr) {
        console.warn('[RelatorioConclusao API] Erro ao carregar carta dos anexos:', cartaErr);
      }
    }

    // 5. Renderiza o Dossiê Completo para PDF Buffer
    const pdfBuffer = await renderToBuffer(
      React.createElement(RelatorioConclusaoUnificadoPdfDocument, {
        data: permit.dadosCompletos,
        codigoPT: permit.codigo,
        cartaConclusao: cartaConclusaoData,
        fotosServico: fotosServico,
      }) as any
    );

    const safeCodigo = permit.codigo.replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Relatorio_Conclusao_PT_${safeCodigo}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[RelatorioConclusao API] Erro ao gerar Relatório Unificado:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar o documento de Relatório de Conclusão.' },
      { status: 500 }
    );
  }
}
