import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Escopos necessários para leitura, escrita e criação de pastas/arquivos no Drive
 */
const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Verifica se as credenciais do Google Drive estão configuradas no ambiente
 */
export function isGoogleDriveConfigured(): boolean {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  return Boolean(clientEmail && privateKey && clientEmail.trim().length > 0 && privateKey.trim().length > 0);
}

/**
 * Inicializa o cliente autenticado da Google Drive API via Service Account
 */
export function getGoogleDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    console.warn(
      '[GoogleDrive] Variáveis de ambiente GOOGLE_CLIENT_EMAIL ou GOOGLE_PRIVATE_KEY não configuradas. Operando com armazenamento local seguro.'
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Busca ou cria uma pasta no Google Drive dentro de uma pasta pai
 */
export async function getOrCreateFolder(
  folderName: string,
  parentId?: string
): Promise<string> {
  if (!isGoogleDriveConfigured()) {
    return `local_${folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
  }

  const drive = getGoogleDriveClient();
  const parent = parentId || process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || 'root';

  try {
    // 1. Busca se a pasta já existe
    const query = `name = '${folderName}' and '${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // 2. Se não existir, cria a nova pasta
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parent],
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    return folder.data.id!;
  } catch (error) {
    console.warn(`[GoogleDrive] Erro na API ao acessar pasta "${folderName}". Usando pasta local:`, error);
    return `local_${folderName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
  }
}

/**
 * Cria a estrutura organizada de pastas para uma Ordem de Serviço específica:
 * /OS_[CODIGO]/FOTOS_SERVICO
 * /OS_[CODIGO]/CARTAS_CONCLUSAO
 */
export async function getServiceOrderFolderStructure(osCodigo: string) {
  const sanitizedCodigo = osCodigo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const osFolderName = `OS_${sanitizedCodigo}`;

  try {
    const osFolderId = await getOrCreateFolder(osFolderName);
    const [fotosFolderId, cartasFolderId] = await Promise.all([
      getOrCreateFolder('FOTOS_SERVICO', osFolderId),
      getOrCreateFolder('CARTAS_CONCLUSAO', osFolderId),
    ]);

    return {
      osFolderId,
      fotosFolderId,
      cartasFolderId,
    };
  } catch (err) {
    console.warn('[GoogleDrive] Falha ao criar estrutura remota da OS. Usando estrutura local:', err);
    return {
      osFolderId: `local_os_${sanitizedCodigo}`,
      fotosFolderId: `local_fotos_${sanitizedCodigo}`,
      cartasFolderId: `local_cartas_${sanitizedCodigo}`,
    };
  }
}

export interface UploadFileOptions {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  targetFolderId: string;
  makePublic?: boolean;
}

export interface UploadFileResult {
  fileId: string;
  webViewLink: string;
  webContentLink?: string | null;
}

/**
 * Realiza o upload de um arquivo para o Google Drive ou armazena localmente de forma resiliente
 */
export async function uploadFileToDrive({
  buffer,
  fileName,
  mimeType,
  targetFolderId,
  makePublic = true,
}: UploadFileOptions): Promise<UploadFileResult> {
  // 1. Tenta upload oficial no Google Drive se houver credenciais
  if (isGoogleDriveConfigured()) {
    try {
      const drive = getGoogleDriveClient();
      const stream = Readable.from(buffer);

      const isLocalFolder = targetFolderId.startsWith('local_');
      const requestParents = isLocalFolder ? undefined : [targetFolderId];

      const file = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: requestParents,
        },
        media: {
          mimeType,
          body: stream,
        },
        fields: 'id, name, webViewLink, webContentLink',
      });

      const fileId = file.data.id!;

      if (makePublic) {
        try {
          await drive.permissions.create({
            fileId,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
          });
        } catch (permError) {
          console.warn('[GoogleDrive] Permissão pública não pôde ser aplicada:', permError);
        }
      }

      return {
        fileId,
        webViewLink:
          file.data.webViewLink ||
          `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`,
        webContentLink: file.data.webContentLink || null,
      };
    } catch (driveError) {
      console.warn('[GoogleDrive] Falha no upload para API do Google Drive. Acionando Fallback Local:', driveError);
    }
  }

  // 2. FALLBACK HÍBRIDO SEGURO: Grava em public/uploads/cartas
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cartas');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/cartas/${uniqueFileName}`;
    const fileId = `local_${timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    return {
      fileId,
      webViewLink: publicUrl,
      webContentLink: publicUrl,
    };
  } catch (localError) {
    console.error('[GoogleDrive / LocalStorage] Falha crítica ao salvar arquivo:', localError);
    throw new Error(`Falha no armazenamento do arquivo: ${fileName}`);
  }
}
