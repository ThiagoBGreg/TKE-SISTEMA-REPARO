'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export interface GalleryItem {
  id: string;
  title: string;
  url: string;
  type: 'image' | 'video';
  category: 'official' | 'uploaded';
}

interface MediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  mediaType?: 'image' | 'video' | 'all';
  title?: string;
  currentValue?: string;
}

export function MediaGalleryModal({
  isOpen,
  onClose,
  onSelect,
  mediaType = 'image',
  title = 'Selecionar Mídia da Galeria',
  currentValue = '',
}: MediaGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload' | 'url'>('gallery');
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState(currentValue);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carrega itens da API de galeria
  const loadGalleryItems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/upload-media');
      if (res.ok) {
        const data = await res.json();
        if (data.items) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar itens da galeria:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGalleryItems();
      setCustomUrl(currentValue);
      setUploadError(null);
    }
  }, [isOpen, currentValue]);

  if (!isOpen) return null;

  // Filtragem
  const filteredItems = items.filter((item) => {
    const matchesType =
      mediaType === 'all' ? true : mediaType === 'video' ? item.type === 'video' : item.type === 'image';
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || item.url.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Handler de Upload do Arquivo
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-media', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha no upload do arquivo');
      }

      // Sucesso: seleciona a URL e atualiza galeria
      await loadGalleryItems();
      onSelect(data.url);
      onClose();
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao enviar arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header do Modal */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{mediaType === 'video' ? '🎬' : '🖼️'}</span>
            <div>
              <h3 className="text-lg font-black text-white">{title}</h3>
              <p className="text-xs text-slate-400">
                Selecione da biblioteca oficial, envie do seu computador/celular ou digite uma URL.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-bold text-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="px-6 pt-3 border-b border-slate-800/80 flex items-center gap-2 bg-slate-900/30">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'gallery'
                ? 'border-orange-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📚</span>
            <span>Galeria & Biblioteca</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {filteredItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'upload'
                ? 'border-orange-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📤</span>
            <span>Enviar do Computador / Celular</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 text-xs font-bold rounded-t-xl transition flex items-center gap-2 border-b-2 ${
              activeTab === 'url'
                ? 'border-orange-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🔗</span>
            <span>Digitar Link / URL</span>
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ABA 1: GALERIA */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              {/* Barra de Busca */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar imagens ou vídeos por nome ou link..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-2 shrink-0 transition shadow-lg shadow-orange-600/20"
                >
                  <span>+</span>
                  <span>Enviar Novo Arquivo</span>
                </button>
              </div>

              {isLoading ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">Carregando itens da galeria...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center text-slate-500 space-y-3 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                  <span className="text-3xl">📭</span>
                  <p className="text-sm">Nenhum arquivo encontrado para este filtro.</p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="text-orange-400 hover:underline text-xs font-bold"
                  >
                    Enviar um arquivo do seu dispositivo agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredItems.map((item) => {
                    const isSelected = currentValue === item.url;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelect(item.url);
                          onClose();
                        }}
                        className={`group relative rounded-2xl overflow-hidden border cursor-pointer transition-all duration-200 hover:scale-[1.02] flex flex-col ${
                          isSelected
                            ? 'border-orange-500 ring-2 ring-orange-500/50 bg-slate-900'
                            : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                        }`}
                      >
                        {/* Preview do Item */}
                        <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                          {item.type === 'image' ? (
                            <Image
                              src={item.url}
                              alt={item.title}
                              fill
                              unoptimized
                              className="object-contain p-2 group-hover:scale-105 transition duration-300"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                              <span className="text-3xl mb-1">🎬</span>
                              <span className="text-[10px] font-mono text-orange-400">Vídeo</span>
                            </div>
                          )}

                          {/* Badge de Categoria */}
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                                item.category === 'official'
                                  ? 'bg-purple-900/80 text-purple-200 border border-purple-500/30'
                                  : 'bg-emerald-900/80 text-emerald-200 border border-emerald-500/30'
                              }`}
                            >
                              {item.category === 'official' ? 'Oficial TKE' : 'Upload'}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold shadow">
                              ✓
                            </div>
                          )}
                        </div>

                        {/* Título e link */}
                        <div className="p-2.5 flex-1 flex flex-col justify-between">
                          <span className="text-xs font-bold text-white truncate block" title={item.title}>
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
                            {item.url}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: UPLOAD DO COMPUTADOR OU CELULAR */}
          {activeTab === 'upload' && (
            <div className="space-y-6 max-w-lg mx-auto py-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-900/80 group space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center text-3xl mx-auto group-hover:scale-110 transition duration-300">
                  📱
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">
                    Clique para selecionar do Celular ou Computador
                  </h4>
                  <p className="text-xs text-slate-400">
                    No smartphone, você pode escolher da sua galeria de fotos/vídeos ou usar a câmera.
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Formatos aceitos: JPG, PNG, WEBP, SVG, GIF, MP4, WEBM
                  </p>
                </div>

                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-orange-500/25"
                >
                  <span>📁</span>
                  <span>Abrir Seletor de Arquivos</span>
                </button>
              </div>

              {isUploading && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-slate-300 font-medium">
                    Enviando arquivo e salvando na biblioteca... aguarde.
                  </span>
                </div>
              )}

              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: URL CUSTOMIZADA */}
          {activeTab === 'url' && (
            <div className="space-y-5 max-w-lg mx-auto py-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white block">
                  Endereço Direto (URL da Imagem, Vídeo ou YouTube)
                </label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://... ou /images/imagem-3.webp"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                />
                <span className="text-[11px] text-slate-400 block">
                  Você pode usar links de vídeos do YouTube, URLs externas da web ou arquivos locais do sistema.
                </span>
              </div>

              {customUrl && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[11px] text-slate-400 font-bold block">Pré-visualização:</span>
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
                    {mediaType === 'video' || customUrl.includes('youtube') || customUrl.includes('youtu.be') ? (
                      <span className="text-sm text-orange-400 font-mono">▶ Link de Vídeo Configurado</span>
                    ) : (
                      <Image
                        src={customUrl}
                        alt="Preview"
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (customUrl.trim()) {
                      onSelect(customUrl.trim());
                      onClose();
                    }
                  }}
                  disabled={!customUrl.trim()}
                  className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold text-xs transition"
                >
                  Confirmar e Usar Este Endereço
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Oculto de Arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept={mediaType === 'video' ? 'video/mp4,video/webm,video/ogg' : 'image/*,video/*'}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
