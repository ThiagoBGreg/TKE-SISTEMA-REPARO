import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { QuickRepairRequestDialog } from '@/components/home/QuickRepairRequestDialog';
import { TkeLogo } from '@/components/ui/TkeLogo';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-x-hidden">
      {/* Luz ambiente de fundo (Glows da marca TKE) */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[30rem] h-[30rem] bg-orange-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-magenta-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-4 sm:px-8 py-3.5 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <TkeLogo variant="badge" size="sm" withMotion priority />
            <div>
              <span className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                TKE <span className="text-[11px] font-mono text-orange-400 font-semibold px-1.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/30">REPAROS</span>
              </span>
              <span className="text-[11px] text-slate-400 block -mt-1 font-medium tracking-wide">
                Move Beyond • Gestão de APR
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/subcontratado/historico"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-xl transition hover:bg-slate-900 border border-transparent hover:border-slate-800"
          >
            <span>💼</span> Portal do Prestador
          </Link>

          <AnimatedButton
            href="/login"
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white"
          >
            Entrar
          </AnimatedButton>

          <AnimatedButton
            href="/dashboard"
            variant="gradient"
            size="sm"
            shimmer
            glow
            icon={<span>→</span>}
            iconPosition="right"
          >
            Acessar Painel
          </AnimatedButton>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16 text-center space-y-10 my-auto">
        {/* Badge TKE Move Beyond */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-orange-500/30 text-orange-400 text-xs font-bold shadow-lg shadow-orange-500/10">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>TKE MOVE BEYOND</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 font-medium">Plataforma Operacional de Reparo & APR</span>
        </div>

        {/* Título Principal com Gradiente TKE */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Gestão Inteligente & Monitoramento de{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-rose-500 to-purple-400">
              Serviços de Reparo
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Fluxo digital completo e integrado: emissão de Permissão de Trabalho (PT/APR), assinaturas digitais com geolocalização em tempo real, anexos no Google Drive e extratos de medição.
          </p>
        </div>

        {/* Action Buttons Animados */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          {/* Modal Rápido de Abertura com RBAC */}
          <QuickRepairRequestDialog />

          <AnimatedButton
            href="/dashboard/reparo/pt"
            variant="dark"
            size="lg"
            shimmer
            lift
            icon={<span>✍️</span>}
          >
            Emitir PT / APR Digital
          </AnimatedButton>

          <AnimatedButton
            href="/dashboard/subcontratado/historico"
            variant="outline"
            size="lg"
            lift
            icon={<span>💼</span>}
          >
            Portal do Prestador
          </AnimatedButton>
        </div>

        {/* Keyvisual Banner da Marca TKE com Glassmorphism */}
        <div className="pt-6 relative max-w-4xl mx-auto group">
          <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl shadow-orange-500/10 transition-all duration-500 group-hover:border-orange-500/40 group-hover:shadow-orange-500/20">
            <Image
              src="/images/brand-keyvisual-1900px_image_w1900_h450.webp"
              alt="TKE Keyvisual Move Beyond"
              width={1200}
              height={284}
              className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-102"
              priority
            />
            {/* Overlay sutil com informações e slogan */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex items-end justify-between p-6">
              <div className="text-left">
                <span className="text-[11px] font-bold tracking-widest uppercase text-orange-400 block">
                  Padrão Global de Engenharia & Segurança
                </span>
                <span className="text-sm sm:text-base font-extrabold text-white">
                  Controle Rigoroso de Riscos • NR-10, NR-18 e NR-35
                </span>
              </div>
              <div className="hidden sm:block">
                <TkeLogo variant="claim" size="xs" withMotion />
              </div>
            </div>
          </div>
        </div>

        {/* Departamentos Grid com Cores TKE */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6 text-left">
          {[
            {
              tag: 'REPARO',
              desc: 'Ordens de Serviço e Manutenção',
              color: 'border-orange-500/30 bg-orange-950/20 text-orange-300',
              badge: 'bg-orange-500/20 text-orange-400',
            },
            {
              tag: 'SERVIÇOS',
              desc: 'Comercial e Engenharia',
              color: 'border-purple-500/30 bg-purple-950/20 text-purple-300',
              badge: 'bg-purple-500/20 text-purple-400',
            },
            {
              tag: 'OSH',
              desc: 'Segurança e Laudos NR',
              color: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
              badge: 'bg-amber-500/20 text-amber-400',
            },
            {
              tag: 'DLOG',
              desc: 'Logística e Motoristas',
              color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
              badge: 'bg-emerald-500/20 text-emerald-400',
            },
            {
              tag: 'ADM',
              desc: 'Pagamento Subcontratados',
              color: 'border-rose-500/30 bg-rose-950/20 text-rose-300',
              badge: 'bg-rose-500/20 text-rose-400',
            },
          ].map((item) => (
            <div
              key={item.tag}
              className={`p-4 rounded-2xl border ${item.color} backdrop-blur-md flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs tracking-wider">{item.tag}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.badge}`}>Ativo</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">{item.desc}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer com Logo TKE */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <TkeLogo variant="symbol" size="xs" />
          <span className="text-slate-400 font-medium">
            © {new Date().getFullYear()} TKE Elevadores • Sistema de Gestão de Reparos
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Move Beyond • Arquitetura Neon Serverless + Vercel
        </div>
      </footer>
    </div>
  );
}

