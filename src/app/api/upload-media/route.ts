import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

// GET: Retorna a lista de itens da galeria de imagens e vídeos
export async function GET() {
  try {
    const imagesDir = path.join(process.cwd(), 'public', 'images');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

    const galleryItems: Array<{
      id: string;
      title: string;
      url: string;
      type: 'image' | 'video';
      category: 'official' | 'uploaded';
    }> = [];

    // 1. Imagens oficiais do sistema
    if (fs.existsSync(imagesDir)) {
      const files = fs.readdirSync(imagesDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const isImg = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext);
        const isVid = ['.mp4', '.webm', '.ogg'].includes(ext);

        if (isImg) {
          galleryItems.push({
            id: `official_${file}`,
            title: file.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''),
            url: `/images/${file}`,
            type: 'image',
            category: 'official',
          });
        } else if (isVid) {
          galleryItems.push({
            id: `official_${file}`,
            title: file.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''),
            url: `/images/${file}`,
            type: 'video',
            category: 'official',
          });
        }
      }
    }

    // 2. Uploads recentes
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const isImg = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].includes(ext);
        const isVid = ['.mp4', '.webm', '.ogg', '.mov'].includes(ext);

        if (isImg) {
          galleryItems.push({
            id: `upload_${file}`,
            title: file.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''),
            url: `/uploads/${file}`,
            type: 'image',
            category: 'uploaded',
          });
        } else if (isVid) {
          galleryItems.push({
            id: `upload_${file}`,
            title: file.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, ''),
            url: `/uploads/${file}`,
            type: 'video',
            category: 'uploaded',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      items: galleryItems,
    });
  } catch (error: any) {
    console.error('[upload-media] Erro ao listar galeria:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao carregar galeria de mídia' },
      { status: 500 }
    );
  }
}

// POST: Recebe arquivo do celular ou computador e salva em public/uploads
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Nenhum arquivo enviado.' },
        { status: 400 }
      );
    }

    const mimeType = file.type || '';
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType) || mimeType.startsWith('image/');
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType) || mimeType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Formato de arquivo não suportado. Envie imagem ou vídeo válido.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawExt = path.extname(file.name) || (isImage ? '.jpg' : '.mp4');
    const cleanExt = rawExt.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const fileName = `${isImage ? 'img' : 'vid'}_${timestamp}_${randomHex}${cleanExt}`;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      type: isImage ? 'image' : 'video',
      size: buffer.length,
    });
  } catch (error: any) {
    console.error('[upload-media] Erro ao fazer upload:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Falha ao processar arquivo.' },
      { status: 500 }
    );
  }
}
