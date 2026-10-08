import React from 'react';
import { STATS_SHOWCASE } from '@/data/portfolioData';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { TkeLogo } from '@/components/ui/TkeLogo';

export function EngineeringStats() {
  const PILLARS = [
    {
      icon: '⚙️',
      title: 'Peças 100% Originais & Certificadas',
      desc: 'Componentes mecânicos, cabos de tração alemães e eletrônica com rastreabilidade total de fábrica.',
    },
    {
      icon: '🛡️',
      title: 'Controle de Risco & APR Digital',
      desc: 'Toda intervenção possui Permissão de Trabalho (PT) emitida com geolocalização e laudo OSH em conformidade com as NRs.',
    },
    {
      icon: '⏱️',
      title: 'Atendimento Rápido & Menor Parada',
      desc: 'Ferramental computadorizado in-loco que reduz em até 60% o tempo de interdição do elevador.',
    },
    {
      icon: '🏆',
      title: 'Garantia Oficial da Marca TKE',
      desc: 'Laudos periciais emitidos por engenheiros mecânicos e elétricos com recolhimento de ART/CREA.',
    },
  ];

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 my-20">
      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {STATS_SHOWCASE.map((stat, idx) => (
          <div key={idx} className="relative z-10 text-center space-y-1 p-2">
            <span className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-purple-400 tracking-tight block">
              {stat.value}
            </span>
            <span className="text-sm font-extrabold text-white block">
              {stat.label}
            </span>
            <span className="text-xs text-slate-400 block max-w-[200px] mx-auto">
              {stat.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Pilares de Excelência em Engenharia */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PILLARS.map((pillar, idx) => (
          <div
            key={idx}
            className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800/80 hover:border-orange-500/40 transition-all hover:-translate-y-1 space-y-3 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:border-orange-500/40 transition-transform">
              {pillar.icon}
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
              {pillar.title}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {pillar.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Banner de CTA Final para o Gestor / Síndico */}
      <div className="mt-16 p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-purple-950/60 via-slate-900 to-orange-950/40 border border-orange-500/30 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
        <div className="space-y-3 text-center md:text-left max-w-xl">
          <TkeLogo variant="claim" size="xs" />
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Seu Elevador Precisa de Reparo de Alta Precisão?
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Abra uma solicitação imediata, emita a Permissão de Trabalho (PT/APR) digital ou consulte nossa equipe de engenharia para laudos técnicos.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <AnimatedButton
            href="/dashboard/reparo/pt"
            variant="gradient"
            size="lg"
            shimmer
            glow
            lift
            icon={<span>✍️</span>}
          >
            Emitir Nova PT / APR
          </AnimatedButton>

          <AnimatedButton
            href="/login"
            variant="outline"
            size="lg"
            lift
          >
            Acessar Sistema
          </AnimatedButton>
        </div>
      </div>
    </section>
  );
}
