import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
    nomeCliente,
    cpfCliente,
    funcaoCliente,
    dataRecebimento,
    telefoneCliente,
    assinaturaClienteBase64,
    pdfOriginalBuffer,
  } = options;

  let pdfDoc: PDFDocument;
  let isModeloOficial = false;

  // 1. Carrega o PDF original importado ou o modelo padrão oficial da raiz
  if (pdfOriginalBuffer && pdfOriginalBuffer.length > 0) {
    try {
      pdfDoc = await PDFDocument.load(pdfOriginalBuffer);
      // Se tiver 1 página e dimensões padrão A4, trata como modelo oficial ou compatível
      if (pdfDoc.getPageCount() === 1) {
        const { width, height } = pdfDoc.getPages()[0].getSize();
        if (Math.abs(width - 595.32) < 5 && Math.abs(height - 841.92) < 5) {
          isModeloOficial = true;
        }
      }
    } catch (err) {
      console.warn('[cartaConclusaoDigital] Erro ao carregar PDF fornecido, usando modelo padrão:', err);
      const defaultTemplatePath = path.join(process.cwd(), 'MODELO CARTA DE CONCLUSÃO DIGITAL.pdf');
      const defaultBytes = fs.readFileSync(defaultTemplatePath);
      pdfDoc = await PDFDocument.load(defaultBytes);
      isModeloOficial = true;
    }
  } else {
    const defaultTemplatePath = path.join(process.cwd(), 'MODELO CARTA DE CONCLUSÃO DIGITAL.pdf');
    const defaultBytes = fs.readFileSync(defaultTemplatePath);
    pdfDoc = await PDFDocument.load(defaultBytes);
    isModeloOficial = true;
  }

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  // Incorpora a imagem de assinatura do cliente se fornecida
  let assinaturaImage: any = null;
  if (assinaturaClienteBase64 && assinaturaClienteBase64.includes('base64')) {
    try {
      const sigBuffer = dataUriToBuffer(assinaturaClienteBase64);
      if (sigBuffer.length > 0) {
        assinaturaImage = await pdfDoc.embedPng(sigBuffer);
      }
    } catch (sigErr) {
      console.warn('[cartaConclusaoDigital] Erro ao incorporar assinatura PNG:', sigErr);
    }
  }

  if (isModeloOficial) {
    // ------------------------------------------------------------------------
    // CENÁRIO A: MODELO OFICIAL TKE (1 Página A4)
    // Coordenadas calibradas exatamente sobre o layout do documento TKE
    // ------------------------------------------------------------------------
    const page = pages[0];

    // Carimbo do código da PT no topo direito para rastreabilidade
    if (codigoPT) {
      page.drawText(`PT: ${sanitizePdfText(codigoPT)}`, {
        x: 430,
        y: 818,
        size: 9,
        font: helveticaBold,
        color: rgb(0.9, 0.35, 0.05), // Laranja TKE
      });
    }

    // Se estiver usando o template padrão, atualizamos os dados do serviço
    // cobrindo eventuais dados de exemplo do modelo com caixas brancas
    if (!pdfOriginalBuffer) {
      // 1. Contrato sob o Nº
      if (contratoOrcamento) {
        page.drawRectangle({
          x: 270,
          y: 642,
          width: 120,
          height: 16,
          color: rgb(1, 1, 1),
        });
        page.drawText(sanitizePdfText(contratoOrcamento), {
          x: 272,
          y: 646,
          size: 10,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.1),
        });
      }

      // 2. Equipamento e Orçamento no parágrafo
      page.drawRectangle({
        x: 100,
        y: 615,
        width: 420,
        height: 24,
        color: rgb(1, 1, 1),
      });
      const orcNum = orcamento || contratoOrcamento || 'N/A';
      const eqNum = equipamento || 'Elevador';
      page.drawText(
        sanitizePdfText(`equipamento(s) ${eqNum}, referente ao orcamento de reparo sob o no ${orcNum}.`),
        {
          x: 106,
          y: 622,
          size: 9.5,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1),
        }
      );

      // 3. Tabela: Equipamento | Serviço Executado
      page.drawRectangle({
        x: 107,
        y: 560,
        width: 400,
        height: 14,
        color: rgb(1, 1, 1),
      });
      page.drawText(sanitizePdfText(eqNum), {
        x: 110,
        y: 563,
        size: 8,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      const descrServ = servicoDescricao || 'SERVICOS ESPECIALIZADOS DE REPARO / MANUTENCAO';
      page.drawText(sanitizePdfText(descrServ).slice(0, 55), {
        x: 195,
        y: 563,
        size: 8,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    // ------------------------------------------------------------------------
    // PREENCHIMENTO DO TERMO DE CIÊNCIA E RECEBIMENTO
    // ------------------------------------------------------------------------
    // NOME COMPLETO: linha em y=371.81
    if (nomeCliente) {
      page.drawText(sanitizePdfText(nomeCliente).toUpperCase(), {
        x: 215,
        y: 372,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // CPF: linha em y=344.21
    if (cpfCliente) {
      page.drawText(sanitizePdfText(cpfCliente), {
        x: 160,
        y: 345,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // FUNÇÃO: linha em y=316.61
    if (funcaoCliente) {
      page.drawText(sanitizePdfText(funcaoCliente).toUpperCase(), {
        x: 185,
        y: 317,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // DATA: linha em y=289.01
    if (dataRecebimento) {
      page.drawText(sanitizePdfText(dataRecebimento), {
        x: 175,
        y: 290,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // TELEFONE: linha em y=261.41
    if (telefoneCliente) {
      page.drawText(sanitizePdfText(telefoneCliente), {
        x: 195,
        y: 262,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // ASSINATURA: linha em y=233.81
    if (assinaturaImage) {
      page.drawImage(assinaturaImage, {
        x: 190,
        y: 228,
        width: 170,
        height: 38,
      });
    }
  } else {
    // ------------------------------------------------------------------------
    // CENÁRIO B: PDF IMPORTADO CUSTOMIZADO OU COM MÚLTIPLAS PÁGINAS
    // Adiciona uma página anexa com o Termo Oficial de Ciência e Recebimento
    // ------------------------------------------------------------------------
    const page = pdfDoc.addPage([595.32, 841.92]); // A4 padrão
    const { width, height } = page.getSize();

    // Topo com cabeçalho TKE
    page.drawText('TK ELEVADORES BRASIL LTDA', {
      x: 50,
      y: height - 50,
      size: 14,
      font: helveticaBold,
      color: rgb(0.05, 0.1, 0.2),
    });
    page.drawText(`CARTA DE CONCLUSAO DIGITAL • PT: ${sanitizePdfText(codigoPT)}`, {
      x: 50,
      y: height - 68,
      size: 9,
      font: helveticaBold,
      color: rgb(0.9, 0.35, 0.05),
    });

    // Resumo do Serviço
    page.drawRectangle({
      x: 50,
      y: height - 145,
      width: width - 100,
      height: 65,
      borderWidth: 1,
      borderColor: rgb(0.8, 0.85, 0.9),
      color: rgb(0.97, 0.98, 1),
    });

    page.drawText('DADOS DO SERVICO EXECUTADO:', {
      x: 60,
      y: height - 95,
      size: 8,
      font: helveticaBold,
      color: rgb(0.3, 0.4, 0.5),
    });
    page.drawText(`CONTRATO / ORCAMENTO: ${sanitizePdfText(contratoOrcamento)}`, {
      x: 60,
      y: height - 110,
      size: 9,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`EQUIPAMENTO: ${sanitizePdfText(equipamento)}`, {
      x: 320,
      y: height - 110,
      size: 9,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`DESCRICAO: ${sanitizePdfText(servicoDescricao || 'Servicos de Reparo Concluidos')}`, {
      x: 60,
      y: height - 128,
      size: 8.5,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Quadro Oficial: TERMO DE CIÊNCIA E RECEBIMENTO
    const boxY = height - 440;
    const boxHeight = 265;
    const boxWidth = width - 100;

    page.drawRectangle({
      x: 50,
      y: boxY,
      width: boxWidth,
      height: boxHeight,
      borderWidth: 1.5,
      borderColor: rgb(0.1, 0.1, 0.1),
      color: rgb(1, 1, 1),
    });

    page.drawText('TERMO DE CIENCIA E RECEBIMENTO:', {
      x: 65,
      y: boxY + boxHeight - 25,
      size: 11,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Linha NOME COMPLETO
    page.drawText('NOME COMPLETO:', {
      x: 65,
      y: boxY + boxHeight - 60,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 175, y: boxY + boxHeight - 62 },
      end: { x: 50 + boxWidth - 25, y: boxY + boxHeight - 62 },
      thickness: 0.8,
      color: rgb(0.1, 0.1, 0.1),
    });
    if (nomeCliente) {
      page.drawText(sanitizePdfText(nomeCliente).toUpperCase(), {
        x: 180,
        y: boxY + boxHeight - 59,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Linha CPF
    page.drawText('CPF:', {
      x: 65,
      y: boxY + boxHeight - 95,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 105, y: boxY + boxHeight - 97 },
      end: { x: 340, y: boxY + boxHeight - 97 },
      thickness: 0.8,
      color: rgb(0.1, 0.1, 0.1),
    });
    if (cpfCliente) {
      page.drawText(sanitizePdfText(cpfCliente), {
        x: 110,
        y: boxY + boxHeight - 94,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Linha FUNÇÃO
    page.drawText('FUNCAO:', {
      x: 65,
      y: boxY + boxHeight - 130,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 130, y: boxY + boxHeight - 132 },
      end: { x: 380, y: boxY + boxHeight - 132 },
      thickness: 0.8,
      color: rgb(0.1, 0.1, 0.1),
    });
    if (funcaoCliente) {
      page.drawText(sanitizePdfText(funcaoCliente).toUpperCase(), {
        x: 135,
        y: boxY + boxHeight - 129,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Linha DATA
    page.drawText('DATA:', {
      x: 65,
      y: boxY + boxHeight - 165,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 115, y: boxY + boxHeight - 167 },
      end: { x: 230, y: boxY + boxHeight - 167 },
      thickness: 0.8,
      color: rgb(0.1, 0.1, 0.1),
    });
    if (dataRecebimento) {
      page.drawText(sanitizePdfText(dataRecebimento), {
        x: 120,
        y: boxY + boxHeight - 164,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Linha TELEFONE
    page.drawText('TELEFONE:', {
      x: 65,
      y: boxY + boxHeight - 200,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 140, y: boxY + boxHeight - 202 },
      end: { x: 380, y: boxY + boxHeight - 202 },
      thickness: 0.8,
      color: rgb(0.1, 0.1, 0.1),
    });
    if (telefoneCliente) {
      page.drawText(sanitizePdfText(telefoneCliente), {
        x: 145,
        y: boxY + boxHeight - 199,
        size: 9.5,
        font: helveticaBold,
        color: rgb(0.05, 0.1, 0.2),
      });
    }

    // Linha ASSINATURA
    page.drawText('ASSINATURA:', {
      x: 65,
      y: boxY + boxHeight - 235,
      size: 9.5,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 155, y: boxY + boxHeight - 237 },
      end: { x: 50 + boxWidth - 30, y: boxY + boxHeight - 237 },
      thickness: 0.8,
      color: rgb(0.1, 0.1, 0.1),
    });
    if (assinaturaImage) {
      page.drawImage(assinaturaImage, {
        x: 165,
        y: boxY + boxHeight - 240,
        width: 175,
        height: 38,
      });
    }

    // Texto de Rodapé Legal (15 dias)
    page.drawText(
      '*Na hipotese de ausencia de assinatura do presente termo, sem qualquer manifestacao em contrario, no prazo de',
      {
        x: 50,
        y: boxY - 16,
        size: 7.5,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      }
    );
    page.drawText(
      '15 (quinze) dias, a contar da data da entrega deste, implica em aceitacao da conclusao dos servicos.',
      {
        x: 50,
        y: boxY - 27,
        size: 7.5,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2),
      }
    );
  }

  const modifiedPdfBytes = await pdfDoc.save();
  return Buffer.from(modifiedPdfBytes);
}
