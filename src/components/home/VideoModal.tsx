'use client';

import React from 'react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

export function VideoModal({ isOpen, onClose, videoUrl, title = 'TKE Move Beyond Video' }: VideoModalProps) {
  if (!isOpen) return null;

  // Trata link do youtube para embed
  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return url;
  };

  const embedUrl = getEmbedUrl(videoUrl);
  const isDirectVideo = embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-orange-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/20">
        {/* Cabeçalho do Modal com branding TKE */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide uppercase">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
            aria-label="Fechar vídeo"
          >
            ✕
          </button>
        </div>

        {/* Player Container */}
        <div className="relative aspect-video w-full bg-black">
          {isDirectVideo ? (
            <video
              src={embedUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <iframe
              src={embedUrl}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <span>TK Elevator Oficial • Move Beyond Video Experience</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
