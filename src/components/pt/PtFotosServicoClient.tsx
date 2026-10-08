'use client';

import React, { useState, useTransition, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  uploadFotosServicoAction,
  deleteFotoServicoAction,
  type FotoServicoItem,
} from '@/actions/fotoServicoActions';

interface PtFotosServicoClientProps {
  permit: {
    id: string;
    codigo: string;
    contratoOrcamento: string;
    equipamento: string;
    tipoMaoDeObra: string;
    status: string;
    serviceOrderId?: string | null;
  };
  fotosIniciais: FotoServicoItem[];
}

// Função para compressão e otimização das fotos no navegador antes do envio
function compressImageForUpload(
  file: File,
  maxDim: number = 1920,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = (event.target?.result as string) || '';
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^.]+$/, '.jpg'),
                  { type: 'image/jpeg' }
                );
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = rawBase64;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export function PtFotosServicoClient({
  permit,
  fotosIniciais,
}: PtFotosServicoClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fotos, setFotos] = useState<FotoServicoItem[]>(fotosIniciais);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [legenda, setLegenda] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Estado do Modal Lightbox para visualização de imagem em tela cheia
  const [lightboxFoto, setLightboxFoto] = useState<FotoServicoItem | null>(null);

  // Manipula seleção de arquivos
  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...newFiles]);

    // Gera previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviews((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove arquivo selecionado antes de enviar
  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
    setPreviews((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submissão do upload com compressão automática e rota sem limite de tamanho
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'Selecione pelo menos uma foto para enviar.' });
      return;
    }

    setFeedbackMsg(null);

    startTransition(async () => {
      try {
        setFeedbackMsg({ type: 'success', text: 'Otimizando fotos para envio seguro...' });

        // 1. Otimiza/comprime todas as imagens no próprio navegador
        const compressedFiles: File[] = [];
        for (const file of selectedFiles) {
          const comp = await compressImageForUpload(file);
          compressedFiles.push(comp);
        }

        const formData = new FormData();
        formData.append('workPermitId', permit.id);
        if (legenda.trim()) {
          formData.append('legenda', legenda.trim());
        }

        compressedFiles.forEach((file) => {
          formData.append('files', file);
        });

        // 2. Envia via Route Handler dedicado HTTP Multipart
        const response = await fetch(`/api/pt/${permit.id}/fotos`, {
          method: 'POST',
          body: formData,
        });

        const res = await response.json();

        if (response.ok && res.success && res.fotos) {
          setFotos(res.fotos);
          setSelectedFiles([]);
          setPreviews([]);
          setLegenda('');
          setFeedbackMsg({
            type: 'success',
            text: res.message || 'Fotos enviadas com sucesso!',
          });
          router.refresh();
        } else {
          setFeedbackMsg({
            type: 'error',
            text: res.error || 'Erro ao enviar fotos. Tente novamente.',
          });
        }
      } catch (err: any) {
        console.error('Erro ao enviar fotos:', err);
        setFeedbackMsg({
          type: 'error',
          text: err.message || 'Erro ao processar envio das fotos.',
        });
      }
    });
  };

  // Exclusão de foto
  const handleDeleteFoto = async (fotoId: string) => {
    if (!confirm('Tem certeza de que deseja remover esta evidência fotográfica?')) {
      return;
    }

    startTransition(async () => {
      const res = await deleteFotoServicoAction(permit.id, fotoId);
      if (res.success) {
        setFotos((prev) => prev.filter((f) => f.id !== fotoId));
        if (lightboxFoto?.id === fotoId) {
          setLightboxFoto(null);
        }
        setFeedbackMsg({ type: 'success', text: 'Foto removida com sucesso.' });
        router.refresh();
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Erro ao remover foto.' });
      }
    });
  };

  const isConcluido = permit.status === 'CONCLUIDO';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* BARRA SUPERIOR DE NAVEGAÇÃO E IDENTIFICAÇÃO */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/reparo/pt"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 bg-slate-100 hover:bg-orange-50 border border-slate-300 px-3 py-2 rounded-xl transition"
            >
              <span>←</span>
              <span>Voltar às Permissões</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  Fotos do Serviço
                </span>
                <span className="bg-orange-100 text-orange-800 border border-orange-300 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                  {permit.codigo}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Galeria técnica de evidências e registros fotográficos da manutenção/reparo
              </p>
            </div>
          </div>

          {/* BOTÃO EM DESTAQUE: GERAR RELATÓRIO DE CONCLUSÃO COMPLETO (PDF) */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`/api/pt/${permit.id}/relatorio-conclusao`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition active:scale-98"
              title="Gerar Dossiê Completo juntando APR, Carta de Conclusão e Fotos do Serviço em PDF"
            >
              <span className="text-sm">📑</span>
              <span>Gerar Relatório de Conclusão (PDF)</span>
            </a>
          </div>
        </div>

        {/* METADADOS DA PT EM BARRA COMPACTA */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-600 overflow-x-auto">
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Contrato / Orçamento</span>
            <span className="font-bold text-slate-800">{permit.contratoOrcamento || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Equipamento</span>
            <span className="font-bold text-slate-800">{permit.equipamento || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Mão de Obra</span>
            <span className="font-bold text-slate-800">{permit.tipoMaoDeObra}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Status Atual</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center gap-1 ${
                isConcluido
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {isConcluido ? '✓ Concluído' : '⏳ Em Andamento'}
            </span>
          </div>
          <div className="ml-auto">
            <span className="text-slate-400 font-semibold uppercase text-[10px] block">Total de Fotos</span>
            <span className="font-bold text-slate-900 text-xs">
              📷 {fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* MENSAGEM DE FEEDBACK */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-xs font-bold opacity-75 hover:opacity-100 ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* BANNER INFORMATIVO SOBRE O RELATÓRIO UNIFICADO */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📑</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Relatório de Conclusão Unificado (Dossiê em PDF)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl leading-relaxed">
              Todas as fotos adicionadas nesta tela são automaticamente inseridas no documento oficial final,
              reunindo em um único PDF: a <strong>APR (Análise Preliminar de Risco)</strong>, a <strong>Carta de Conclusão assinada</strong> e o <strong>Relatório Fotográfico completo</strong>.
            </p>
          </div>
          <a
            href={`/api/pt/${permit.id}/relatorio-conclusao`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-blue-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-xs hover:shadow-md transition whitespace-nowrap active:scale-98"
          >
            <span>Baixar Dossiê Completo (PDF)</span>
            <span>↗</span>
          </a>
        </div>

        {/* SEÇÃO 1: FORMULÁRIO DE ENVIO DE FOTOS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>📸</span>
                <span>Adicionar Fotos do Serviço</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Fotografe o equipamento antes, durante e após o reparo para comprovação técnica.
              </p>
            </div>
            {selectedFiles.length > 0 && (
              <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                {selectedFiles.length} foto(s) pronta(s)
              </span>
            )}
          </div>

          <form onSubmit={handleUpload} className="space-y-5">
            {/* DROPZONE / BOTÃO DE SELEÇÃO */}
            <div className="border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-6 sm:p-8 text-center bg-slate-50 hover:bg-orange-50/30 transition cursor-pointer relative group">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                capture="environment"
                onChange={handleFilesChange}
                disabled={isPending}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                title="Clique ou arraste fotos aqui"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-2xl group-hover:scale-110 transition">
                  📷
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Toque para tirar foto ou selecionar fotos da galeria
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aceita fotos JPEG, PNG e HEIC • Suporte a múltiplos arquivos simultâneos
                  </p>
                </div>
              </div>
            </div>

            {/* PREVIEWS DAS FOTOS SELECIONADAS */}
            {previews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Fotos selecionadas para envio ({previews.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFiles([]);
                      setPreviews([]);
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold"
                  >
                    Limpar todas
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {previews.map((src, idx) => (
                    <div
                      key={`preview-${idx}`}
                      className="relative group rounded-xl overflow-hidden border border-slate-300 aspect-square bg-slate-100 shadow-2xs"
                    >
                      <img
                        src={src}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedFile(idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-md hover:bg-red-700 active:scale-90 transition"
                        title="Remover foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CAMPO DE LEGENDA / DESCRIÇÃO GERAL */}
            <div>
              <label
                htmlFor="legendaInput"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Legenda / Descrição das Fotos (Opcional):
              </label>
              <input
                id="legendaInput"
                type="text"
                value={legenda}
                onChange={(e) => setLegenda(e.target.value)}
                placeholder="Ex: Peças substituídas, quadro de comando revisado, teste de freio concluído..."
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition"
                disabled={isPending}
              />
            </div>

            {/* BOTÃO DE CONFIRMAR ENVIO */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending || selectedFiles.length === 0}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs hover:shadow-md transition active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Enviando fotos para a nuvem...</span>
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    <span>Enviar {selectedFiles.length > 0 ? `${selectedFiles.length} Foto(s)` : 'Fotos'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* SEÇÃO 2: GALERIA DE FOTOS REGISTRADAS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>🖼️</span>
                <span>Fotos do Serviço Anexadas</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique sobre qualquer imagem para ampliar em tela cheia com alta definição
              </p>
            </div>
            <span className="text-xs font-black text-slate-700 bg-slate-200 px-3 py-1 rounded-full">
              {fotos.length} evidência(s)
            </span>
          </div>

          {fotos.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <div className="text-4xl">📸</div>
              <p className="text-sm font-bold text-slate-700">
                Nenhuma foto do serviço registrada até o momento
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Utilize o quadro acima para capturar com a câmera do celular ou enviar fotos da galeria. Elas serão sincronizadas com o relatório oficial em PDF.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {fotos.map((foto, idx) => {
                const fotoSrc = foto.driveViewUrl || (foto as any).rawBase64 || '';
                const dataFormatada = foto.enviadoEm
                  ? new Date(foto.enviadoEm).toLocaleString('pt-BR')
                  : 'Data não informada';

                return (
                  <div
                    key={foto.id || `foto-${idx}`}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
                  >
                    {/* MINIATURA CLICÁVEL */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setLightboxFoto(foto)}
                      onKeyDown={(e) => e.key === 'Enter' && setLightboxFoto(foto)}
                      className="relative aspect-4/3 bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center"
                      title="Clique para ampliar em tela cheia"
                    >
                      <img
                        src={fotoSrc}
                        alt={foto.legenda || foto.fileName}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <span>🔍</span>
                        <span>Ampliar</span>
                      </div>
                      <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* METADADOS DA FOTO */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900 line-clamp-2" title={foto.legenda || foto.fileName}>
                          {foto.legenda || foto.fileName}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          📅 {dataFormatada}
                        </p>
                        {foto.enviadoPorNome && (
                          <p className="text-[10px] text-slate-500">
                            👤 {foto.enviadoPorNome}
                          </p>
                        )}
                      </div>

                      {/* AÇÕES DA FOTO */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setLightboxFoto(foto)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition"
                            title="Visualizar ampliada"
                          >
                            👁️ Ver
                          </button>
                          <a
                            href={foto.driveDownloadUrl || foto.driveViewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={foto.fileName}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
                            title="Baixar imagem original"
                          >
                            📥 Baixar
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteFoto(foto.id)}
                          disabled={isPending}
                          className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition disabled:opacity-50"
                          title="Excluir esta foto"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL LIGHTBOX / VISUALIZAÇÃO EM TELA CHEIA */}
      {lightboxFoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex flex-col p-4 sm:p-6 animate-fade-in"
          onClick={() => setLightboxFoto(null)}
        >
          {/* HEADER DO LIGHTBOX */}
          <div
            className="flex items-center justify-between text-white pb-3 max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-sm font-bold truncate max-w-md">
                {lightboxFoto.legenda || lightboxFoto.fileName}
              </p>
              <p className="text-[11px] text-slate-300">
                PT: {permit.codigo} • Enviado em{' '}
                {lightboxFoto.enviadoEm
                  ? new Date(lightboxFoto.enviadoEm).toLocaleString('pt-BR')
                  : '-'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={lightboxFoto.driveDownloadUrl || lightboxFoto.driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={lightboxFoto.fileName}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition"
                title="Baixar Imagem"
              >
                📥 Baixar
              </a>
              <button
                type="button"
                onClick={() => setLightboxFoto(null)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-black w-8 h-8 rounded-lg flex items-center justify-center transition"
                title="Fechar (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ÁREA DA IMAGEM AMPLIADA */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden max-w-6xl w-full mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxFoto.driveViewUrl || (lightboxFoto as any).rawBase64}
              alt={lightboxFoto.legenda || lightboxFoto.fileName}
              className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
