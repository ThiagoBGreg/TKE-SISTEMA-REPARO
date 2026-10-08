'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PORTFOLIO_ITEMS, PORTFOLIO_CATEGORIES, PortfolioItem } from '@/data/portfolioData';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export function PortfolioGallery() {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [activeModalItem, setActiveModalItem] = useState<PortfolioItem | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(8);

  const filteredItems = PORTFOLIO_ITEMS.filter((item) => {
    if (selectedCategory === 'todos') return true;
    return item.category === selectedCategory;
  });

  const displayedItems = filteredItems.slice(0, visibleCount);

  const handleNextModal = () => {
    if (!activeModalItem) return;
    const currentIndex = filteredItems.findIndex((i) => i.id === activeModalItem.id);
    const nextIndex = (currentIndex + 1) % filteredItems.length;
    setActiveModalItem(filteredItems[nextIndex]);
  };

  const handlePrevModal = () => {
    if (!activeModalItem) return;
    const currentIndex = filteredItems.findIndex((i) => i.id === activeModalItem.id);
    const prevIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
    setActiveModalItem(filteredItems[prevIndex]);
  };

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-20">
      {/* Título da Seção do Portfólio */}
      <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold tracking-wide uppercase">
          <span>🛠️ Acervo de Intervenções de Campo</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Portfólio de Serviços de{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-purple-400">
            Reparo & Engenharia
          </span>
        </h2>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Galeria de intervenções técnicas reais realizadas pela equipe e credenciados TKE. Soluções de alta confiabilidade para preservar a vida útil e a segurança do seu patrimônio.
        </p>

        {/* Abas de Filtro por Categoria */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {PORTFOLIO_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setVisibleCount(8);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-800 to-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20 scale-102'
                    : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grade de Cards do Portfólio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayedItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveModalItem(item)}
            className="group relative rounded-3xl overflow-hidden bg-slate-900/70 border border-slate-800/90 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/15 transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1"
          >
            {/* Foto do Reparo */}
            <div className="relative w-full h-48 overflow-hidden bg-slate-950">
              <Image
                src={item.image}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

              {/* Badges superiores */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                <span className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] font-extrabold uppercase text-orange-400 tracking-wider">
                  {item.badge}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-purple-900/80 backdrop-blur-md border border-purple-500/30 text-[9px] font-bold text-purple-200">
                  {item.tag}
                </span>
              </div>
            </div>

            {/* Conteúdo do Card */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {item.categoryLabel}
                </span>
                <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Pílulas de Especificações */}
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div className="flex flex-wrap gap-1.5">
                  {item.specs.slice(0, 2).map((spec, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] text-slate-300 font-medium line-clamp-1 border border-slate-700/50"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-orange-400 group-hover:translate-x-1 transition-transform">
                  <span>Ver Detalhes Técnicos</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botão de Ver Mais Fotos se houver mais */}
      {visibleCount < filteredItems.length && (
        <div className="text-center pt-10">
          <button
            onClick={() => setVisibleCount((prev) => prev + 8)}
            className="px-8 py-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-orange-500/50 text-white font-bold text-sm transition-all hover:bg-slate-800 shadow-lg hover:shadow-orange-500/10"
          >
            Carregar Mais Casos ({filteredItems.length - visibleCount} restantes) ▾
          </button>
        </div>
      )}

      {/* Modal / Lightbox em Alta Resolução */}
      {activeModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão de Fechar */}
            <button
              onClick={() => setActiveModalItem(null)}
              className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition z-20"
            >
              ✕
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-bold uppercase">
                {activeModalItem.categoryLabel}
              </span>
              <span className="text-xs text-slate-400">
                Intervenção Certificada TKE
              </span>
            </div>

            {/* Imagem Ampliada com Controles de Próximo e Anterior */}
            <div className="relative w-full h-[320px] sm:h-[420px] rounded-2xl overflow-hidden bg-black border border-slate-800">
              <Image
                src={activeModalItem.image}
                alt={activeModalItem.title}
                fill
                sizes="(max-width: 1024px) 100vw, 900px"
                className="object-contain"
                priority
              />

              {/* Botões de Navegação */}
              <button
                onClick={handlePrevModal}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/80 hover:bg-slate-800 border border-white/10 flex items-center justify-center text-white text-sm backdrop-blur-md transition"
              >
                ◀
              </button>
              <button
                onClick={handleNextModal}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/80 hover:bg-slate-800 border border-white/10 flex items-center justify-center text-white text-sm backdrop-blur-md transition"
              >
                ▶
              </button>
            </div>

            {/* Descrição e Especificações do Modal */}
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-white leading-tight">
                {activeModalItem.title}
              </h3>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {activeModalItem.description}
              </p>

              {/* Lista de Especificações Técnicas */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs font-extrabold text-orange-400 uppercase tracking-wider block">
                  Especificações de Engenharia & Peças:
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  {activeModalItem.specs.map((spec, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{spec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ações do Modal */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  <span>Em conformidade com as normas: </span>
                  <span className="text-white font-bold">NR-10, NR-18, NR-35 e NBR 16858-1</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveModalItem(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                  >
                    Fechar Visualização
                  </button>

                  <AnimatedButton
                    href="/dashboard/reparo/pt"
                    variant="gradient"
                    size="sm"
                    shimmer
                    glow
                    icon={<span>✍️</span>}
                  >
                    Emitir PT Deste Serviço
                  </AnimatedButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
