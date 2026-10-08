'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { VIDEO_SHOWCASE_SLIDES } from '@/data/portfolioData';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export function RepairVideoShowcase() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isZooming, setIsZooming] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSlide = VIDEO_SHOWCASE_SLIDES[currentSlideIndex];

  const SLIDE_DURATION = 6000; // 6 segundos por cena
  const TICK_INTERVAL = 50; // atualiza a cada 50ms para barra suave

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK_INTERVAL / SLIDE_DURATION) * 100;
        if (next >= 100) {
          // Muda para o próximo slide
          setCurrentSlideIndex((oldIdx) => (oldIdx + 1) % VIDEO_SHOWCASE_SLIDES.length);
          return 0;
        }
        return next;
      });
    }, TICK_INTERVAL);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [isPlaying, currentSlideIndex]);

  const handleSelectSlide = (idx: number) => {
    setCurrentSlideIndex(idx);
    setProgress(0);
  };

  const handleTogglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleNext = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % VIDEO_SHOWCASE_SLIDES.length);
    setProgress(0);
  };

  const handlePrev = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + VIDEO_SHOWCASE_SLIDES.length) % VIDEO_SHOWCASE_SLIDES.length);
    setProgress(0);
  };

  return (
    <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 my-16">
      {/* Header da Apresentação */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold tracking-wide uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Apresentação em Vídeo • Operações Reais TKE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Engenharia em Ação:{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-purple-400">
              Showcase de Serviços
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mt-1">
            Acompanhe o registro cinematográfico de manutenções pesadas, alinhamentos e substituições normatizadas em elevadores de alta complexidade.
          </p>
        </div>

        {/* Controles de Reprodução */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900/90 border border-slate-800 p-1.5 rounded-2xl backdrop-blur-md">
          <button
            onClick={handlePrev}
            aria-label="Cena Anterior"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ◀
          </button>
          <button
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Pausar Apresentação' : 'Iniciar Apresentação'}
            className="px-3.5 h-9 rounded-xl flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-orange-500 hover:brightness-110 shadow-md shadow-orange-500/20 transition"
          >
            <span>{isPlaying ? '⏸ Pausar' : '▶ Reproduzir'}</span>
          </button>
          <button
            onClick={handleNext}
            aria-label="Próxima Cena"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Janela Principal do Vídeo / Showcase */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl shadow-orange-500/10 group">
        {/* Barras de Progresso estilo Reels no topo */}
        <div className="absolute top-0 inset-x-0 z-30 p-4 sm:p-6 flex gap-2 pointer-events-none">
          {VIDEO_SHOWCASE_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden backdrop-blur-sm"
            >
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-pink-500 transition-all duration-75"
                style={{
                  width:
                    idx < currentSlideIndex
                      ? '100%'
                      : idx === currentSlideIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Quadro da Imagem com Efeito Ken Burns Zoom Cinemático */}
        <div className="relative w-full h-[360px] sm:h-[540px] overflow-hidden bg-black">
          <Image
            key={currentSlide.image}
            src={currentSlide.image}
            alt={currentSlide.title}
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className={`object-cover object-center transition-all duration-1000 ${
              isPlaying ? 'scale-110' : 'scale-105'
            }`}
            style={{
              transitionDuration: `${SLIDE_DURATION}ms`,
            }}
            priority
          />

          {/* Gradiente Cinematográfico de Fundo */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/40" />

          {/* Linha de Scanline Holográfica sutil */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />

          {/* Badge HUD de Gravação Técnica */}
          <div className="absolute top-12 left-4 sm:top-14 sm:left-6 z-20 flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/80 backdrop-blur-md text-[11px] font-bold text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>REGISTRO DE CAMPO TKE</span>
              <span className="text-slate-500">•</span>
              <span className="text-orange-400 font-mono">CENA 0{currentSlideIndex + 1} / 04</span>
            </div>
          </div>

          {/* Informações da Intervenção (Lower Third / Legenda de Vídeo) */}
          <div className="absolute bottom-0 inset-x-0 z-20 p-6 sm:p-10 space-y-4">
            <div className="space-y-2 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-bold uppercase tracking-wide">
                <span>{currentSlide.category}</span>
                <span>•</span>
                <span>{currentSlide.tag}</span>
              </div>

              <h3 className="text-xl sm:text-3xl font-black text-white leading-tight">
                {currentSlide.title}
              </h3>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed line-clamp-2 sm:line-clamp-none">
                "{currentSlide.quote}"
              </p>
            </div>

            {/* Painel de Telemetria e Estatísticas Técnicas */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 border-t border-white/10 max-w-2xl">
              <div className="bg-slate-900/60 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-white/5">
                <span className="block text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">
                  {currentSlide.stat1.label}
                </span>
                <span className="text-sm sm:text-lg font-black text-orange-400">
                  {currentSlide.stat1.value}
                </span>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-white/5">
                <span className="block text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">
                  {currentSlide.stat2.label}
                </span>
                <span className="text-sm sm:text-lg font-black text-white">
                  {currentSlide.stat2.value}
                </span>
              </div>

              <div className="bg-slate-900/60 backdrop-blur-md p-2.5 sm:p-3 rounded-xl border border-white/5">
                <span className="block text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">
                  {currentSlide.stat3.label}
                </span>
                <span className="text-sm sm:text-lg font-black text-purple-300">
                  {currentSlide.stat3.value}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Miniaturas de Seleção de Cenas no Rodapé da Janela */}
        <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
          <span className="hidden sm:inline-block text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">
            Cenas do Documentário:
          </span>

          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
            {VIDEO_SHOWCASE_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => handleSelectSlide(idx)}
                className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all border text-left ${
                  idx === currentSlideIndex
                    ? 'bg-slate-800 border-orange-500 shadow-lg shadow-orange-500/20 text-white'
                    : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 text-slate-400'
                }`}
              >
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="hidden md:block">
                  <span className="block text-[11px] font-bold text-white line-clamp-1">
                    0{idx + 1}. {slide.category}
                  </span>
                  <span className="block text-[10px] text-slate-400 line-clamp-1">
                    {slide.tag}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
