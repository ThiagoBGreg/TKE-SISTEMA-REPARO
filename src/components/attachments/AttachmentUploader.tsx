'use client';

import React, { useRef, useState } from 'react';
import { uploadAttachmentsAction } from '@/actions/attachmentActions';

interface UploadedFileItem {
  id: string;
  fileName: string;
  driveViewUrl: string;
  category: 'FOTO_SERVICO' | 'CARTA_CONCLUSAO';
}

interface AttachmentUploaderProps {
  serviceOrderId: string;
  initialFotos?: UploadedFileItem[];
  initialCartas?: UploadedFileItem[];
  currentUserId?: string;
}

/**
 * Função utilitária para compressão leve de imagens no Client-Side
 */
async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export function AttachmentUploader({
  serviceOrderId,
  initialFotos = [],
  initialCartas = [],
  currentUserId,
}: AttachmentUploaderProps) {
  // Estado Fotos de Serviço
  const [selectedFotos, setSelectedFotos] = useState<Array<{ file: File; preview: string }>>([]);
  const [uploadedFotos, setUploadedFotos] = useState<UploadedFileItem[]>(initialFotos);
  const [isUploadingFotos, setIsUploadingFotos] = useState(false);
  const [fotosError, setFotosError] = useState<string | null>(null);

  // Estado Carta de Conclusão
  const [selectedCarta, setSelectedCarta] = useState<{ file: File; preview: string } | null>(null);
  const [uploadedCartas, setUploadedCartas] = useState<UploadedFileItem[]>(initialCartas);
  const [isUploadingCarta, setIsUploadingCarta] = useState(false);
  const [cartaError, setCartaError] = useState<string | null>(null);

  const fotosInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFotosInputRef = useRef<HTMLInputElement | null>(null);
  const cartaCameraInputRef = useRef<HTMLInputElement | null>(null);
  const cartaFileInputRef = useRef<HTMLInputElement | null>(null);

  // =========================================================================
  // HANDLERS: FOTOS DE SERVIÇO
  // =========================================================================
  const handleFotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    const newItems = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFotos((prev) => [...prev, ...newItems]);
    setFotosError(null);
  };

  const handleRemoveSelectedFoto = (index: number) => {
    setSelectedFotos((prev) => {
      const itemToRemove = prev[index];
      if (itemToRemove?.preview) URL.revokeObjectURL(itemToRemove.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUploadFotos = async () => {
    if (selectedFotos.length === 0) return;
    setIsUploadingFotos(true);
    setFotosError(null);

    try {
      const formData = new FormData();
      formData.append('serviceOrderId', serviceOrderId);
      formData.append('category', 'FOTO_SERVICO');
      if (currentUserId) formData.append('uploadedById', currentUserId);

      // Comprime antes de enviar
      for (const item of selectedFotos) {
        const compressed = await compressImage(item.file);
        formData.append('files', compressed);
      }

      const result = await uploadAttachmentsAction(formData);

      if (!result.success || !result.attachments) {
        setFotosError(result.error || 'Erro no envio das fotos.');
        return;
      }

      setUploadedFotos((prev) => [...prev, ...result.attachments!]);
      setSelectedFotos([]);
    } catch (err) {
      console.error(err);
      setFotosError('Falha ao comunicar com o servidor.');
    } finally {
      setIsUploadingFotos(false);
    }
  };

  // =========================================================================
  // HANDLERS: CARTA DE CONCLUSÃO
  // =========================================================================
  const handleCartaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setSelectedCarta({
      file,
      preview: URL.createObjectURL(file),
    });
    setCartaError(null);
  };

  const handleUploadCarta = async () => {
    if (!selectedCarta) return;
    setIsUploadingCarta(true);
    setCartaError(null);

    try {
      const formData = new FormData();
      formData.append('serviceOrderId', serviceOrderId);
      formData.append('category', 'CARTA_CONCLUSAO');
      if (currentUserId) formData.append('uploadedById', currentUserId);

      const compressed = await compressImage(selectedCarta.file, 2400, 0.9);
      formData.append('files', compressed);

      const result = await uploadAttachmentsAction(formData);

      if (!result.success || !result.attachments) {
        setCartaError(result.error || 'Erro no envio da carta de conclusão.');
        return;
      }

      setUploadedCartas((prev) => [...prev, ...result.attachments!]);
      setSelectedCarta(null);
    } catch (err) {
      console.error(err);
      setCartaError('Falha ao comunicar com o servidor.');
    } finally {
      setIsUploadingCarta(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* ====================================================================
          CARD 1: FOTOS DO SERVIÇO (MÚLTIPLAS IMAGENS)
          ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              📸 Evidências Fotográficas do Serviço
            </h2>
            <p className="text-xs text-slate-500">
              Fotografe os componentes antes, durante e após a conclusão do reparo.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg self-start">
            {uploadedFotos.length} enviada(s)
          </span>
        </div>

        {/* Inputs Ocultos */}
        <input
          ref={fotosInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFotosChange}
          className="hidden"
        />
        <input
          ref={cameraFotosInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotosChange}
          className="hidden"
        />

        {/* Botões de Ação Mobile Friendly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraFotosInputRef.current?.click()}
            className="btn-tke-orange py-3 px-4 text-xs font-bold"
          >
            📷 Abrir Câmera de Campo
          </button>
          <button
            type="button"
            onClick={() => fotosInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 px-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            🖼️ Selecionar da Galeria
          </button>
        </div>

        {/* Miniaturas Selecionadas para Envio */}
        {selectedFotos.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Prontas para envio ({selectedFotos.length}):
              </span>
              <button
                type="button"
                onClick={() => setSelectedFotos([])}
                className="text-[11px] text-orange-600 hover:underline font-semibold"
              >
                Limpar seleção
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {selectedFotos.map((item, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.preview}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSelectedFoto(idx)}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleUploadFotos}
              disabled={isUploadingFotos}
              className="btn-tke-gradient w-full py-3 text-xs uppercase tracking-wide font-bold"
            >
              {isUploadingFotos ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin text-sm">⏳</span> Enviando para o Google Drive...
                </span>
              ) : (
                `☁️ Salvar ${selectedFotos.length} foto(s) no Google Drive`
              )}
            </button>
          </div>
        )}

        {fotosError && (
          <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            ⚠️ {fotosError}
          </div>
        )}

        {/* Galeria de Fotos Já Salvas */}
        {uploadedFotos.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700">Evidências Gravadas no Google Drive:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {uploadedFotos.map((foto) => (
                <a
                  key={foto.id}
                  href={foto.driveViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-xs"
                >
                  <span className="truncate font-medium text-slate-800 pr-2">
                    📁 {foto.fileName}
                  </span>
                  <span className="text-[11px] font-semibold text-blue-600 shrink-0">
                    Ver no Drive ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          CARD 2: CARTA DE CONCLUSÃO / ACEITE (ALTA NITIDEZ)
          ==================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              📝 Carta de Conclusão / Aceite do Cliente
            </h2>
            <p className="text-xs text-slate-500">
              Fotografe ou anexe a folha física com o carimbo e assinatura de aceite do condomínio/cliente.
            </p>
          </div>
          {uploadedCartas.length > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg self-start">
              ✓ Documento Aceito
            </span>
          )}
        </div>

        {/* Inputs Ocultos */}
        <input
          ref={cartaCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCartaChange}
          className="hidden"
        />
        <input
          ref={cartaFileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleCartaChange}
          className="hidden"
        />

        {/* Botões de Ação */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cartaCameraInputRef.current?.click()}
            className="btn-tke-gradient py-3 px-4 text-xs font-bold"
          >
            📷 Escanear Carta com a Câmera
          </button>
          <button
            type="button"
            onClick={() => cartaFileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs py-3 px-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            📄 Selecionar Arquivo / PDF
          </button>
        </div>

        {/* Pré-visualização de Nitidez */}
        {selectedCarta && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Conferência de Nitidez & Legibilidade:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCarta(null)}
                className="text-[11px] text-orange-600 hover:underline font-semibold"
              >
                Cancelar
              </button>
            </div>

            <div className="w-full max-h-96 bg-slate-50 border-2 border-dashed border-orange-300 rounded-2xl overflow-hidden flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedCarta.preview}
                alt="Prévia da Carta de Conclusão"
                className="max-h-88 max-w-full object-contain rounded-xl shadow-xs"
              />
            </div>

            <p className="text-[11px] text-slate-500 italic text-center">
              Certifique-se de que a assinatura do cliente, data e carimbo estejam 100% legíveis antes de confirmar.
            </p>

            <button
              type="button"
              onClick={handleUploadCarta}
              disabled={isUploadingCarta}
              className="btn-tke-gradient w-full py-3.5 text-xs uppercase tracking-wide font-extrabold"
            >
              {isUploadingCarta ? (
                <span className="inline-flex items-center gap-2">
                  <span className="animate-spin text-sm">⏳</span> Enviando Carta ao Google Drive...
                </span>
              ) : (
                '🔒 Confirmar e Gravar Carta de Conclusão'
              )}
            </button>
          </div>
        )}

        {cartaError && (
          <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            ⚠️ {cartaError}
          </div>
        )}

        {/* Cartas Já Salvas */}
        {uploadedCartas.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700">Carta de Conclusão Arquivada:</h3>
            <div className="space-y-2">
              {uploadedCartas.map((carta) => (
                <div
                  key={carta.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-base">📄</span>
                    <span className="font-semibold text-slate-900 truncate">
                      {carta.fileName}
                    </span>
                  </div>
                  <a
                    href={carta.driveViewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-700 hover:underline shrink-0 bg-white px-3 py-1.5 rounded-lg border border-emerald-300"
                  >
                    Visualizar Carta ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
