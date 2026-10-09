import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import {
  ModeloCartaConclusaoDigitalPdfDocument,
  type ServicoItemModelo,
} from '@/components/pt/ModeloCartaConclusaoDigitalPdfDocument';

export interface TermoCienciaRecebimentoData {
  nomeCliente: string;
  cpfCliente: string;
  funcaoCliente: string;
  dataRecebimento: string;
  telefoneCliente: string;
  assinaturaClienteBase64: string; // data:image/png;base64,...
  observacoes?: string;
  tecnicoNome?: string;
}

export interface GerarCartaConclusaoOptions extends TermoCienciaRecebimentoData {
  codigoPT: string;
  contratoOrcamento: string;
  equipamento: string;
  orcamento?: string;
  servicoDescricao?: string;
  // Campos detalhados editáveis do Modelo Digital TKE
  tkeCnpj?: string;
  tkeEndereco?: string;
  tkeCidadeUf?: string;
  clienteNome?: string;
  clienteEndereco?: string;
  clienteCidadeUf?: string;
  filial?: string;
  servicos?: ServicoItemModelo[];
  // PDF original para o caso de importação direta
  pdfOriginalBuffer?: Buffer;
}

import zlib from 'zlib';

/**
 * Detecta automaticamente as coordenadas da linha superior e da margem esquerda
 * do quadro "TERMO DE CIÊNCIA E RECEBIMENTO" no PDF importado, varrendo os streams
 * descompactados de desenho do PDF (compatível com Word, SAP e geradores TKE).
 */
function findTermoBoxCoordinates(buf: Buffer): { topY: number; leftX: number } {
  try {
    const strBuf = buf.toString('latin1');
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;
    const allStreams: string[] = [];
    while ((match = streamRegex.exec(strBuf)) !== null) {
      const raw = Buffer.from(match[1], 'latin1');
      try {
        const dec = zlib.inflateSync(raw).toString('latin1');
        allStreams.push(dec);
      } catch {
        allStreams.push(raw.toString('latin1'));
      }
    }

    let bestTopY: number | null = null;
    let bestLeftX: number | null = null;

    for (const text of allStreams) {
      let scaleX = 1;
      let scaleY = 1;
      let transY = 0;
      const cmMatch = text.match(/([0-9.-]+)\s+0\.000000\s+0\.000000\s+([0-9.-]+)\s+0\.000000\s+([0-9.-]+)\s+cm/);
      if (cmMatch) {
        scaleX = parseFloat(cmMatch[1]);
        scaleY = parseFloat(cmMatch[2]);
        transY = parseFloat(cmMatch[3]);
      }

      // 1. Procura linhas horizontais traçadas com 'm' e 'l' (largura ~350 a 450pt)
      const lines = text.split(/[\r\n]+/);
      for (let i = 0; i < lines.length - 1; i++) {
        const l1 = lines[i].trim();
        const l2 = lines[i + 1].trim();
        if (l1.endsWith(' m') && l2.endsWith(' l')) {
          const p1 = l1.split(/\s+/);
          const p2 = l2.split(/\s+/);
          const x1 = parseFloat(p1[0]) * scaleX;
          const y1 = transY + parseFloat(p1[1]) * scaleY;
          const x2 = parseFloat(p2[0]) * scaleX;
          const y2 = transY + parseFloat(p2[1]) * scaleY;
          const dx = Math.abs(x2 - x1);
          const dy = Math.abs(y2 - y1);
          // Linha horizontal superior do quadro do termo
          if (dx >= 350 && dx <= 450 && dy < 1.5 && y1 >= 100 && y1 <= 450) {
            if (bestTopY === null || y1 > bestTopY) {
              bestTopY = y1;
              bestLeftX = Math.min(x1, x2);
            }
          }
        }
      }

      // 2. Procura retângulos 're' (formato: x y w h re)
      const reMatches = text.match(/[0-9.-]+ +[0-9.-]+ +[0-9.-]+ +[0-9.-]+ +re/g);
      if (reMatches) {
        for (const re of reMatches) {
          const p = re.trim().split(/\s+/);
          const rx = parseFloat(p[0]) * scaleX;
          const ry = transY ? transY + parseFloat(p[1]) * scaleY : parseFloat(p[1]);
          const rw = parseFloat(p[2]) * Math.abs(scaleX);
          const rh = parseFloat(p[3]) * Math.abs(scaleY);
          if (rw >= 350 && rw <= 450 && rh >= 100 && rh <= 250) {
            const topY = scaleY < 0 ? ry : ry + rh;
            if (bestTopY === null || topY > bestTopY) {
              bestTopY = topY;
              bestLeftX = rx;
            }
          }
        }
      }
    }

    if (bestTopY !== null && bestLeftX !== null) {
      return { topY: bestTopY, leftX: bestLeftX };
    }
  } catch (err) {
    console.warn('[cartaConclusaoDigital] Aviso ao detectar quadro do termo:', err);
  }

  // Fallback seguro da carta oficial TKE (padrão MTR / Imagem 1)
  return { topY: 317.5, leftX: 110.2 };
}

/**
 * Remove acentuação e caracteres incompatíveis com WinAnsi (StandardFonts.Helvetica do PDF)
 */
function sanitizePdfText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

/**
 * Converte Data URI (data:image/png;base64,...) para Buffer
 */
function dataUriToBuffer(dataUri: string): Buffer {
  if (!dataUri) return Buffer.alloc(0);
  const parts = dataUri.split(';base64,');
  const base64 = parts.length > 1 ? parts[1] : parts[0];
  return Buffer.from(base64, 'base64');
}

/**
 * Gera ou atualiza uma Carta de Conclusão Digital com os campos do
 * TERMO DE CIÊNCIA E RECEBIMENTO e a assinatura digital do cliente.
 */
export async function gerarCartaConclusaoDigitalPdf(
  options: GerarCartaConclusaoOptions
): Promise<Buffer> {
  const {
    codigoPT,
    contratoOrcamento,
    equipamento,
    orcamento,
    servicoDescricao,
    tkeCnpj,
    tkeEndereco,
    tkeCidadeUf,
    clienteNome,
    clienteEndereco,
    clienteCidadeUf,
    filial,
    servicos,
    nomeCliente,
    cpfCliente,
    funcaoCliente,
    dataRecebimento,
    telefoneCliente,
    assinaturaClienteBase64,
    pdfOriginalBuffer,
  } = options;

  // --------------------------------------------------------------------------
  // CASO 1: IMPORTAÇÃO DE ARQUIVO PDF (O USUÁRIO SUBIU SEU PRÓPRIO PDF)
  // REGRA CRUCIAL: O PREENCHIMENTO DEVE PERMANECER NA PÁGINA ORIGINAL!
  // NUNCA CRIA OUTRO DOCUMENTO OU NOVA PÁGINA!
  // RESPEITA EXATAMENTE AS LINHAS DO QUADRO DA IMAGEM 1!
  // --------------------------------------------------------------------------
  if (pdfOriginalBuffer && pdfOriginalBuffer.length > 0) {
    const pdfDoc = await PDFDocument.load(pdfOriginalBuffer);
    const pages = pdfDoc.getPages();
    // Usa a página existente (a última página onde fica o termo)
    const targetPage = pages[pages.length - 1];

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Detecta as coordenadas do quadro do termo no PDF original importado
    const { topY, leftX } = findTermoBoxCoordinates(pdfOriginalBuffer);
    const baseY = topY;
    const baseX = leftX;

    // Incorpora assinatura se fornecida
    let assinaturaImage: any = null;
    if (assinaturaClienteBase64 && assinaturaClienteBase64.includes('base64')) {
      try {
        const sigBuffer = dataUriToBuffer(assinaturaClienteBase64);
        if (sigBuffer.length > 0) {
          assinaturaImage = await pdfDoc.embedPng(sigBuffer);
        }
      } catch (err) {
        console.warn('[cartaConclusaoDigital] Erro ao incorporar assinatura PNG na importação:', err);
      }
    }

    // 1. Carimba NOME COMPLETO exatamente sobre a linha correspondente
    if (nomeCliente) {
      targetPage.drawText(sanitizePdfText(nomeCliente).toUpperCase(), {
        x: baseX + 98,
        y: baseY - 34.5,
        size: 9,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // 2. Carimba CPF exatamente sobre a linha correspondente
    if (cpfCliente) {
      targetPage.drawText(sanitizePdfText(cpfCliente), {
        x: baseX + 45,
        y: baseY - 61.5,
        size: 9,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // 3. Carimba FUNÇÃO exatamente sobre a linha correspondente
    if (funcaoCliente) {
      targetPage.drawText(sanitizePdfText(funcaoCliente).toUpperCase(), {
        x: baseX + 68,
        y: baseY - 88.5,
        size: 9,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // 4. Carimba DATA exatamente sobre os traços correspondentes (DATA: ___/___/______)
    if (dataRecebimento) {
      targetPage.drawText(sanitizePdfText(dataRecebimento), {
        x: baseX + 52,
        y: baseY - 115.5,
        size: 9,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // 5. Carimba TELEFONE exatamente sobre a linha correspondente
    if (telefoneCliente) {
      targetPage.drawText(sanitizePdfText(telefoneCliente), {
        x: baseX + 78,
        y: baseY - 142.5,
        size: 9,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
    }

    // 6. Carimba ASSINATURA exatamente sobre a linha correspondente
    if (assinaturaImage) {
      targetPage.drawImage(assinaturaImage, {
        x: baseX + 86,
        y: baseY - 169.5,
        width: 140,
        height: 30,
      });
    }

    const modifiedPdfBytes = await pdfDoc.save();
    return Buffer.from(modifiedPdfBytes);
  }

  // --------------------------------------------------------------------------
  // CASO 2: MODELO DIGITAL TKE (GERAÇÃO COMPLETA EDITÁVEL IDÊNTICA À IMAGEM 1)
  // Utiliza o componente React-PDF oficial que replica com 100% de precisão:
  // - Topo direito com logo oficial TKE e dados da empresa
  // - Topo esquerdo com destinatário
  // - Título centralizado "TERMO DE CONCLUSÃO DE REPARO:"
  // - Tabela oficial de equipamentos e serviços com todas as linhas configuradas
  // - Termo de Ciência e Recebimento preenchido com a assinatura digital do cliente
  // --------------------------------------------------------------------------
  // Resolve o logo da TKE para Data URI para embutir no PDF
  let logoDataUri: string | undefined = undefined;
  try {
    const logoFilePath = path.join(process.cwd(), 'public', 'images', 'tke-symbol.png');
    if (fs.existsSync(logoFilePath)) {
      const logoBuf = fs.readFileSync(logoFilePath);
      logoDataUri = `data:image/png;base64,${logoBuf.toString('base64')}`;
    }
  } catch (err) {
    console.warn('[cartaConclusaoDigital] Aviso ao ler logo TKE:', err);
  }

  // Monta a lista de serviços
  const listaServicos: ServicoItemModelo[] =
    servicos && servicos.length > 0
      ? servicos
      : [
          {
            equipamento: equipamento || 'Elevador',
            servico: servicoDescricao || 'SERVIÇOS DE REPARO E MANUTENÇÃO',
          },
        ];

  const renderedBuffer = await renderToBuffer(
    React.createElement(ModeloCartaConclusaoDigitalPdfDocument, {
      tkeCnpj: tkeCnpj || '90.347.840/0064-00',
      tkeEndereco: tkeEndereco || 'AV ADOLFO PINHEIRO, 1000',
      tkeCidadeUf: tkeCidadeUf || 'SANTO AMARO, SP',
      clienteNome: (clienteNome || nomeCliente || 'CLIENTE').toUpperCase(),
      clienteEndereco: clienteEndereco || '',
      clienteCidadeUf: clienteCidadeUf || 'SAO PAULO - SP',
      filial: filial || '5064',
      contratoNumero: contratoOrcamento || '',
      equipamentosTexto: equipamento || '',
      orcamentoNumero: orcamento || contratoOrcamento || '',
      servicos: listaServicos,
      termoNome: nomeCliente || '',
      termoCpf: cpfCliente || '',
      termoFuncao: funcaoCliente || '',
      termoData: dataRecebimento || '',
      termoTelefone: telefoneCliente || '',
      termoAssinaturaBase64: assinaturaClienteBase64 || '',
      logoSrc: logoDataUri,
    }) as any
  );

  return Buffer.from(renderedBuffer);
}
