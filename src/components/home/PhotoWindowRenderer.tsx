'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PhotoWindowConfig, PhotoWindowPosition, PhotoWindowSize } from '@/types/homeConfig';

interface PhotoWindowRendererProps {
  windows?: PhotoWindowConfig[];
  position: PhotoWindowPosition;
  isDark?: boolean;
}

export function PhotoWindowRenderer({
  windows,
  position,
  isDark = false,
}: PhotoWindowRendererProps) {
  if (!windows || windows.length === 0) return null;

  const filtered = windows.filter(
    (w) => (w.position || 'middle') === position && w.enabled !== false
  );

  if (filtered.length === 0) return null;

  // Renderizador específico para Janelas Flutuantes (Direita ou Esquerda)
  if (position === 'floating-right' || position === 'floating-left') {
    return (
      <FloatingPhotoWindows
        windows={filtered}
        side={position === 'floating-right' ? 'right' : 'left'}
        isDark={isDark}
      />
    );
  }

  // Renderizador para seções no fluxo da página (top, hero, middle, bottom)
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 space-y-6 my-4">
      {filtered.map((w) => (
        <StandardPhotoWindowCard key={w.id} config={w} isDark={isDark} />
      ))}
    </div>
  );
}

/**
 * Card de Janela de Foto Padrão (incorporada no layout da página)
 */
function StandardPhotoWindowCard({
  config,
  isDark,
}: {
  config: PhotoWindowConfig;
  isDark: boolean;
}) {
  const getSizeClass = (size: PhotoWindowSize) => {
    switch (size) {
      case 'sm':
        return 'max-w-sm mx-auto';
      case 'md':
        return 'max-w-xl mx-auto';
      case 'lg':
        return 'max-w-3xl mx-auto';
      case 'full':
        return 'max-w-5xl mx-auto w-full';
      case 'banner':
        return 'w-full max-w-6xl mx-auto';
      default:
        return 'max-w-3xl mx-auto';
    }
  };

  const getAspectClass = (ratio?: string) => {
    switch (ratio) {
      case '16/9':
        return 'aspect-video';
      case '4/3':
        return 'aspect-[4/3]';
      case '1/1':
        return 'aspect-square';
      case '21/9':
        return 'aspect-[21/9]';
      case '3/4':
        return 'aspect-[3/4]';
      default:
        return 'aspect-video';
    }
  };

  const borderStyle = config.borderStyle || 'modern';

  const cardContent = (
    <div
      className={`group relative rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${getSizeClass(
        config.size
      )} ${
        isDark
          ? 'bg-slate-900/90 border border-slate-800 shadow-xl shadow-black/40 hover:border-orange-500/40'
          : 'bg-white/95 border border-slate-200/90 shadow-xl shadow-slate-200/50 hover:border-orange-500/40 hover:shadow-2xl hover:shadow-orange-500/10'
      } ${borderStyle === 'glass' ? 'backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-white/40' : ''} ${
        borderStyle === 'neon' ? 'border-2 border-orange-500/70 shadow-lg shadow-orange-500/25' : ''
      }`}
    >
      {/* Colchetes TKE opcionais (┌ e ┘) */}
      {borderStyle === 'brackets' && (
        <>
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-orange-500 z-20 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-purple-600 z-20 pointer-events-none" />
        </>
      )}

      {/* Imagem */}
      <div className={`relative w-full overflow-hidden ${getAspectClass(config.aspectRatio)}`}>
        <Image
          src={config.imageUrl}
          alt={config.title || 'Foto TKE'}
          fill
          unoptimized={config.imageUrl.startsWith('data:')}
          className="object-cover group-hover:scale-103 transition-transform duration-700 ease-out"
        />

        {/* Gradiente sutil na base da foto se houver legenda ou título */}
        {(config.title || config.caption) && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
            {config.title && (
              <h4 className="font-extrabold text-base sm:text-lg tracking-tight drop-shadow-md">
                {config.title}
              </h4>
            )}
            {config.caption && (
              <p className="text-xs sm:text-sm text-slate-200 font-medium line-clamp-2 mt-0.5 drop-shadow">
                {config.caption}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Barra de rodapé elegante quando não estiver sobre a foto */}
      {config.title && !config.caption && (
        <div
          className={`px-5 py-3 flex items-center justify-between text-xs font-bold ${
            isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-800'
          }`}
        >
          <span>{config.title}</span>
          <span className="text-[10px] uppercase font-mono text-orange-500 font-extrabold px-2 py-0.5 rounded bg-orange-500/10">
            TKE Janela
          </span>
        </div>
      )}
    </div>
  );

  if (config.linkUrl) {
    return (
      <Link href={config.linkUrl} className="block transition-transform hover:-translate-y-0.5">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}

/**
 * Janela Flutuante Interativa (Estilo Widget com Minimizar e Fechar)
 */
function FloatingPhotoWindows({
  windows,
  side,
  isDark,
}: {
  windows: PhotoWindowConfig[];
  side: 'right' | 'left';
  isDark: boolean;
}) {
  const [minimizedMap, setMinimizedMap] = useState<Record<string, boolean>>({});
  const [closedMap, setClosedMap] = useState<Record<string, boolean>>({});

  const activeWindows = windows.filter((w) => !closedMap[w.id]);
  if (activeWindows.length === 0) return null;

  return (
    <aside
      aria-label="Janelas Flutuantes de Fotos"
      className={`fixed bottom-6 ${
        side === 'right' ? 'right-6' : 'left-6'
      } z-40 flex flex-col gap-4 max-w-sm pointer-events-auto`}
    >
      {activeWindows.map((w) => {
        const isMinimized = !!minimizedMap[w.id];

        if (isMinimized) {
          return (
            <div
              key={w.id}
              onClick={() => setMinimizedMap((prev) => ({ ...prev, [w.id]: false }))}
              className={`cursor-pointer flex items-center gap-2.5 px-3.5 py-2 rounded-2xl shadow-xl border backdrop-blur-xl transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'bg-slate-900/90 border-slate-700 text-white shadow-black/50'
                  : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50'
              }`}
            >
              <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700">
                <Image
                  src={w.imageUrl}
                  alt={w.title || 'Foto'}
                  fill
                  unoptimized={w.imageUrl.startsWith('data:')}
                  className="object-cover"
                />
              </div>
              <span className="text-xs font-bold truncate max-w-[150px]">
                {w.title || 'Janela de Foto'}
              </span>
              <span className="text-xs text-orange-500 font-bold ml-1">↗ Expandir</span>
            </div>
          );
        }

        return (
          <div
            key={w.id}
            className={`w-72 sm:w-80 rounded-2xl overflow-hidden shadow-2xl border backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
              isDark
                ? 'bg-slate-900/95 border-slate-800 text-white shadow-black/70'
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-400/30'
            }`}
          >
            {/* Header da Janela com Controles */}
            <div
              className={`px-3 py-2 border-b flex items-center justify-between text-xs font-bold ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                <span className="truncate text-[11px] font-bold">
                  {w.title || 'Janela TKE'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Botão Minimizar */}
                <button
                  type="button"
                  onClick={() => setMinimizedMap((prev) => ({ ...prev, [w.id]: true }))}
                  title="Minimizar Janela"
                  className="w-5 h-5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white transition"
                >
                  ─
                </button>
                {/* Botão Fechar */}
                <button
                  type="button"
                  onClick={() => setClosedMap((prev) => ({ ...prev, [w.id]: true }))}
                  title="Fechar Janela"
                  className="w-5 h-5 rounded-md hover:bg-rose-500/20 hover:text-rose-500 flex items-center justify-center text-slate-400 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Imagem da Janela */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
              <Image
                src={w.imageUrl}
                alt={w.title || 'Foto TKE'}
                fill
                unoptimized={w.imageUrl.startsWith('data:')}
                className="object-cover"
              />
              {w.caption && (
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent text-white text-[11px] font-medium">
                  {w.caption}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </aside>
  );
}
