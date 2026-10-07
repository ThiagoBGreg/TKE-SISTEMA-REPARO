import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Escopos necessários para leitura, escrita e criação de pastas/arquivos no Drive
 */
const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Inicializa o cliente autenticado da Google Drive API via Service Account
 */
export function getGoogleDriveClient() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    console.warn(
      '[GoogleDrive] Variáveis de ambiente GOOGLE_CLIENT_EMAIL ou GOOGLE_PRIVATE_KEY não configuradas.'
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
    console.error(`[GoogleDrive] Erro ao obter/criar pasta "${folderName}":`, error);
    throw new Error(`Falha ao acessar ou criar pasta no Google Drive: ${folderName}`);
  }
}

/**
 * Cria a estrutura organizada de pastas para uma Ordem de Serviço específica:
 * /OS_[CODIGO]/FOTOS_SERVICO
 * /OS_[CODIGO]/CARTAS_CONCLUSAO
 */
export async function getServiceOrderFolderStructure(osCodigo: string) {
  // Normaliza o código da OS para nome seguro de pasta (ex: "OS-2026-0841" -> "OS_2026_0841")
  const sanitizedCodigo = osCodigo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const osFolderName = `OS_${sanitizedCodigo}`;

  // 1. Cria ou obtém a pasta da OS na raiz configurada
  const osFolderId = await getOrCreateFolder(osFolderName);

  // 2. Cria as subpastas específicas
  const [fotosFolderId, cartasFolderId] = await Promise.all([
    getOrCreateFolder('FOTOS_SERVICO', osFolderId),
    getOrCreateFolder('CARTAS_CONCLUSAO', osFolderId),
  ]);

  return {
    osFolderId,
    fotosFolderId,
    cartasFolderId,
  };
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
 * Realiza o upload de um arquivo para uma pasta de destino no Google Drive
 */
export async function uploadFileToDrive({
  buffer,
  fileName,
  mimeType,
  targetFolderId,
  makePublic = true,
}: UploadFileOptions): Promise<UploadFileResult> {
  const drive = getGoogleDriveClient();
  const stream = Readable.from(buffer);

  try {
    // 1. Cria o arquivo na pasta destino
    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [targetFolderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = file.data.id!;

    // 2. Opcional: Define permissão de leitura para visualização direta no painel
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
  } catch (error) {
    console.error(`[GoogleDrive] Erro ao fazer upload do arquivo "${fileName}":`, error);
    throw new Error(`Falha no upload para o Google Drive: ${fileName}`);
  }
}
