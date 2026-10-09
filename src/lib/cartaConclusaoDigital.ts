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
  // --------------------------------------------------------------------------
  if (pdfOriginalBuffer && pdfOriginalBuffer.length > 0) {
    const pdfDoc = await PDFDocument.load(pdfOriginalBuffer);
    const pages = pdfDoc.getPages();
    // Usa a página existente (a última página ou a primeira se tiver apenas 1)
    const targetPage = pages[pages.length - 1];
    const { width, height } = targetPage.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

    // Coordenadas calculadas relativas ao padrão A4 (595.32 x 841.92) ou proporcionais
    const scaleX = width / 595.32;
    const scaleY = height / 841.92;

    // Carimba NOME COMPLETO sobre a linha correspondente
    if (nomeCliente) {
      targetPage.drawText(sanitizePdfText(nomeCliente).toUpperCase(), {
        x: 212 * scaleX,
        y: 374 * scaleY,
        size: 9.5 * Math.min(scaleX, scaleY),
        font: fontBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Carimba CPF sobre a linha correspondente
    if (cpfCliente) {
      targetPage.drawText(sanitizePdfText(cpfCliente), {
        x: 160 * scaleX,
        y: 346 * scaleY,
        size: 9.5 * Math.min(scaleX, scaleY),
        font: fontBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Carimba FUNÇÃO sobre a linha correspondente
    if (funcaoCliente) {
      targetPage.drawText(sanitizePdfText(funcaoCliente).toUpperCase(), {
        x: 180 * scaleX,
        y: 318 * scaleY,
        size: 9.5 * Math.min(scaleX, scaleY),
        font: fontBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Carimba DATA sobre a linha correspondente
    if (dataRecebimento) {
      targetPage.drawText(sanitizePdfText(dataRecebimento), {
        x: 168 * scaleX,
        y: 291 * scaleY,
        size: 9.5 * Math.min(scaleX, scaleY),
        font: fontBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Carimba TELEFONE sobre a linha correspondente
    if (telefoneCliente) {
      targetPage.drawText(sanitizePdfText(telefoneCliente), {
        x: 185 * scaleX,
        y: 263 * scaleY,
        size: 9.5 * Math.min(scaleX, scaleY),
        font: fontBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Carimba ASSINATURA sobre a linha correspondente
    if (assinaturaImage) {
      targetPage.drawImage(assinaturaImage, {
        x: 195 * scaleX,
        y: 228 * scaleY,
        width: 160 * scaleX,
        height: 36 * scaleY,
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
