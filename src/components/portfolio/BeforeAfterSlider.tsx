'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

interface BeforeAfterCase {
  id: string;
  title: string;
  category: string;
  beforeImg: string;
  afterImg: string;
  beforeLabel: string;
  afterLabel: string;
  beforeDesc: string;
  afterDesc: string;
  result: string;
}

const COMPARISON_CASES: BeforeAfterCase[] = [
  {
    id: 'case-1',
    title: 'Recuperação de Conjunto de Tração e Caixa Redutora',
    category: 'MÁQUINAS & MOTORES',
    beforeImg: '/portfolio/reparo-08.jpg',
    afterImg: '/portfolio/reparo-01.jpg',
    beforeLabel: 'Antes: Desgaste Severo',
    afterLabel: 'Depois: Padrão Oficial TKE',
    beforeDesc: 'Folga excessiva nos rolamentos, vazamento de óleo e contaminação por limalha metálica, com risco iminente de travamento mecânico.',
    afterDesc: 'Substituição por rolamentos blindados de precisão SKF, usinagem micrométrica e balanceamento a laser com garantia de fábrica.',
    result: 'Zero vibração e aumento de +10 anos na vida útil do elevador.',
  },
  {
    id: 'case-2',
    title: 'Substituição Integral de Cabos de Aço e Polia',
    category: 'CABOS & POLIAS',
    beforeImg: '/portfolio/reparo-05.jpg',
    afterImg: '/portfolio/reparo-02.jpg',
    beforeLabel: 'Antes: Arames Rompidos',
    afterLabel: 'Depois: Cabos Homologados',
    beforeDesc: 'Cabo de tração com redução de diâmetro superior a 6% e múltiplos arames partidos, condenado conforme norma ABNT NBR ISO 4309.',
    afterDesc: 'Instalação de jogo de cabos alemães Drako com alma especial e equalização digital individual por célula de pesagem.',
    result: 'Segurança absoluta e marcha suave sem trancos ou estalos.',
  },
  {
    id: 'case-3',
    title: 'Recondicionamento de Lonas de Freio de Segurança',
    category: 'FREIOS & SEGURANÇA',
    beforeImg: '/portfolio/reparo-12.jpg',
    afterImg: '/portfolio/reparo-04.jpg',
    beforeLabel: 'Antes: Lonas Vitrificadas',
    afterLabel: 'Depois: Lonas Cerâmicas',
    beforeDesc: 'Lonas de atrito gastas abaixo do limite mínimo com vitrificação por calor e frenagem irregular no desnível de parada.',
    afterDesc: 'Substituição por sapatas com compostos cerâmicos de alto rendimento térmico e regulagem de folga de 0,35mm com PT/APR.',
    result: 'Parada suave e precisa nivelada perfeitamente com os andares.',
  },
];

export function BeforeAfterSlider() {
  const [activeCaseIndex, setActiveCaseIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50); // porcentagem de 0 a 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCase = COMPARISON_CASES[activeCaseIndex];

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-20">
      <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold tracking-wide uppercase">
          <span>🔍 Comparativo Interativo de Engenharia</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          O Poder da Transformação:{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-purple-400">
            Antes vs. Depois
          </span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base">
          Arraste o controle deslizante para comparar componentes desgastados com as soluções recuperadas e modernizadas pela engenharia oficial da TKE.
        </p>

        {/* Seletor de Casos */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
          {COMPARISON_CASES.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveCaseIndex(idx);
                setSliderPosition(50);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                idx === activeCaseIndex
                  ? 'bg-gradient-to-r from-purple-900 to-orange-600 border-orange-400 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {item.category}: {item.title.split(' ')[0]} {item.title.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Caixa do Slider Comparativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-900/60 border border-slate-800/80 p-6 sm:p-8 rounded-3xl backdrop-blur-xl">
        {/* Slider Visual Interativo (Coluna Esquerda/Principal) */}
        <div className="lg:col-span-7">
          <div
            ref={containerRef}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            className="relative w-full h-[340px] sm:h-[420px] rounded-2xl overflow-hidden cursor-ew-resize select-none border border-slate-700/60 shadow-2xl"
          >
            {/* Imagem "DEPOIS" (Camada de Fundo Total) */}
            <div className="absolute inset-0">
              <Image
                src={activeCase.afterImg}
                alt={activeCase.afterLabel}
                fill
                sizes="(max-width: 768px) 100vw, 600px"
                className="object-cover"
              />
              <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold backdrop-blur-md">
                ✓ {activeCase.afterLabel}
              </div>
            </div>

            {/* Imagem "ANTES" (Camada Recortada por Largura) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <div className="relative w-full h-full min-w-[320px] sm:min-w-[600px]">
                <Image
                  src={activeCase.beforeImg}
                  alt={activeCase.beforeLabel}
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="object-cover"
                />
              </div>
              <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold backdrop-blur-md">
                ⚠ {activeCase.beforeLabel}
              </div>
            </div>

            {/* Linha Divisória e Alça de Arraste */}
            <div
              className="absolute top-0 bottom-0 z-20 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center font-bold text-xs shadow-xl border-2 border-white pointer-events-auto">
                ↔
              </div>
            </div>

            {/* Dica de Uso */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
              <span className="px-3 py-1 rounded-full bg-slate-950/80 text-[11px] font-medium text-slate-300 backdrop-blur-md border border-white/10">
                Arraste para os lados para comparar
              </span>
            </div>
          </div>
        </div>

        {/* Detalhes Técnicos do Caso (Coluna Direita) */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <span className="text-xs font-black tracking-widest text-orange-400 uppercase block mb-1">
              {activeCase.category}
            </span>
            <h3 className="text-2xl font-black text-white leading-tight">
              {activeCase.title}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Bloco Antes */}
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20 space-y-1">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <span>⚠</span> Diagnóstico de Risco Inicial
              </span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeCase.beforeDesc}
              </p>
            </div>

            {/* Bloco Depois */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <span>🛡️</span> Intervenção de Engenharia TKE
              </span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {activeCase.afterDesc}
              </p>
            </div>

            {/* Resultado Final */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                <span>🏆</span> Benefício Direto ao Condomínio
              </span>
              <p className="text-xs sm:text-sm text-white font-medium">
                {activeCase.result}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <AnimatedButton
              href="/dashboard/reparo/pt"
              variant="gradient"
              size="md"
              shimmer
              glow
              className="w-full justify-center"
              icon={<span>📋</span>}
            >
              Solicitar Avaliação Deste Componente
            </AnimatedButton>
          </div>
        </div>
      </div>
    </section>
  );
}
