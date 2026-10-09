import fs from 'fs';
import path from 'path';

/**
 * Utilitário robusto para decodificar e normalizar imagens para renderização em PDFs
 * via @react-pdf/renderer no ambiente Server-Side (Node.js).
 *
 * Suporta:
 * 1. Data URIs de imagem direta (data:image/jpeg, data:image/png, data:image/webp)
 * 2. Data URIs ou buffers de arquivos PDF (extrai a foto JPEG ou PNG embutida)
 * 3. Caminhos locais de arquivos em disco (/uploads/...)
 * 4. Links do Google Drive ou URLs externas via fetch
 */

/**
 * Extrai o fluxo de bytes de imagem JPEG ou PNG embutido dentro de um buffer de PDF
 */
export function extractImageFromPdfBuffer(pdfBuffer: Buffer): {
  buffer: Buffer;
  mimeType: 'image/jpeg' | 'image/png';
  dataUri: string;
} | null {
  if (!pdfBuffer || pdfBuffer.length === 0) return null;

  // 1. Procura fluxo JPEG (/DCTDecode)
  // Cabeçalho JPEG: FF D8 FF
  // Fim de imagem JPEG: FF D9
  const jpegHeader = [0xFF, 0xD8, 0xFF];
  let jpegStart = -1;

  for (let i = 0; i < pdfBuffer.length - 3; i++) {
    if (
      pdfBuffer[i] === jpegHeader[0] &&
      pdfBuffer[i + 1] === jpegHeader[1] &&
      pdfBuffer[i + 2] === jpegHeader[2]
    ) {
      jpegStart = i;
      break;
    }
  }

  if (jpegStart !== -1) {
    let jpegEnd = -1;
    for (let i = pdfBuffer.length - 2; i > jpegStart; i--) {
      if (pdfBuffer[i] === 0xFF && pdfBuffer[i + 1] === 0xD9) {
        jpegEnd = i + 2;
        break;
      }
    }

    if (jpegEnd !== -1) {
      const jpegBuffer = pdfBuffer.subarray(jpegStart, jpegEnd);
      return {
        buffer: jpegBuffer,
        mimeType: 'image/jpeg',
        dataUri: `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`,
      };
    }
  }

  // 2. Procura assinatura PNG
  // Cabeçalho PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  let pngStart = -1;

  for (let i = 0; i < pdfBuffer.length - 8; i++) {
    let match = true;
    for (let j = 0; j < 8; j++) {
      if (pdfBuffer[i + j] !== pngHeader[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      pngStart = i;
      break;
    }
  }

  if (pngStart !== -1) {
    // Procura chunk IEND: 49 45 4E 44 + 4 bytes de CRC
    const iend = [0x49, 0x45, 0x4E, 0x44];
    for (let i = pngStart; i < pdfBuffer.length - 8; i++) {
      if (
        pdfBuffer[i] === iend[0] &&
        pdfBuffer[i + 1] === iend[1] &&
        pdfBuffer[i + 2] === iend[2] &&
        pdfBuffer[i + 3] === iend[3]
      ) {
        const pngEnd = i + 8;
        const pngBuffer = pdfBuffer.subarray(pngStart, pngEnd);
        return {
          buffer: pngBuffer,
          mimeType: 'image/png',
          dataUri: `data:image/png;base64,${pngBuffer.toString('base64')}`,
        };
      }
    }
  }

  return null;
}

/**
 * Resolve qualquer fonte de imagem/carta (DataURI, PDF, caminho local ou URL externa)
 * para uma Data URI segura de imagem compatível com @react-pdf/renderer.
 */
export async function resolveImageToDataUri(
  source: string | null | undefined
): Promise<string | null> {
  if (!source || typeof source !== 'string') return null;
  const trimmed = source.trim();
  if (!trimmed) return null;

  try {
    // Caso 1: Data URI que já é uma imagem raster pura
    if (trimmed.startsWith('data:image/')) {
      return trimmed;
    }

    // Caso 2: Data URI que é um PDF (ex: Carta de Conclusão arquivada em PDF)
    if (
      trimmed.startsWith('data:application/pdf;') ||
      trimmed.startsWith('data:;base64,JVBER') ||
      trimmed.startsWith('data:application/octet-stream;base64,JVBER')
    ) {
      const base64Content = trimmed.includes(';base64,')
        ? trimmed.split(';base64,')[1]
        : trimmed.replace(/^data:[^,]+,/, '');
      const buffer = Buffer.from(base64Content, 'base64');
      const extracted = extractImageFromPdfBuffer(buffer);
      if (extracted) {
        return extracted.dataUri;
      }
      return null;
    }

    // Caso 3: Arquivo local em disco (/uploads/...)
    if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
      const sanitizedRel = trimmed.replace(/^\//, '');
      const fullPath = path.join(process.cwd(), 'public', sanitizedRel);

      if (fs.existsSync(fullPath)) {
        const fileBuffer = fs.readFileSync(fullPath);
        const isPdf =
          sanitizedRel.toLowerCase().endsWith('.pdf') ||
          fileBuffer.subarray(0, 4).toString() === '%PDF';

        if (isPdf) {
          const extracted = extractImageFromPdfBuffer(fileBuffer);
          return extracted ? extracted.dataUri : null;
        } else {
          const isPng = sanitizedRel.toLowerCase().endsWith('.png');
          const mime = isPng ? 'image/png' : 'image/jpeg';
          return `data:${mime};base64,${fileBuffer.toString('base64')}`;
        }
      }
    }

    // Caso 4: Link externo HTTP / HTTPS (Google Drive ou CDN)
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // Se for link do Google Drive, tenta obter via Service Account se configurada
      let fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (!fileIdMatch) {
        fileIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      }

      if (fileIdMatch && fileIdMatch[1]) {
        try {
          const { isGoogleDriveConfigured, getGoogleDriveClient } = await import(
            '@/lib/google-drive'
          );
          if (isGoogleDriveConfigured()) {
            const drive = getGoogleDriveClient();
            const res = await drive.files.get(
              { fileId: fileIdMatch[1], alt: 'media' },
              { responseType: 'arraybuffer' }
            );
            if (res.data) {
              const buf = Buffer.from(res.data as ArrayBuffer);
              if (buf.subarray(0, 4).toString() === '%PDF') {
                const extracted = extractImageFromPdfBuffer(buf);
                if (extracted) return extracted.dataUri;
              } else {
                return `data:image/jpeg;base64,${buf.toString('base64')}`;
              }
            }
          }
        } catch (driveErr) {
          console.warn('[pdfImageResolver] Falha ao baixar via Google Drive API:', driveErr);
        }
      }

      // Fallback via fetch com timeout
      try {
        const fetchUrl = fileIdMatch
          ? `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`
          : trimmed;

        const res = await fetch(fetchUrl, {
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          if (buf.subarray(0, 4).toString() === '%PDF') {
            const extracted = extractImageFromPdfBuffer(buf);
            if (extracted) return extracted.dataUri;
          } else {
            const contentType = res.headers.get('content-type') || 'image/jpeg';
            return `data:${contentType};base64,${buf.toString('base64')}`;
          }
        }
      } catch (fetchErr) {
        console.warn('[pdfImageResolver] Falha no fetch HTTP da imagem:', fetchErr);
      }
    }

    // Se começar diretamente com bytes brutos de PDF em Base64 sem cabeçalho (JVBERi...)
    if (trimmed.startsWith('JVBERi0')) {
      const buffer = Buffer.from(trimmed, 'base64');
      const extracted = extractImageFromPdfBuffer(buffer);
      if (extracted) return extracted.dataUri;
    }

    return null;
  } catch (error) {
    console.error('[pdfImageResolver] Erro ao resolver imagem para o PDF:', error);
    return null;
  }
}
