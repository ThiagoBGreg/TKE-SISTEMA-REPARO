'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export type TkeLogoVariant = 'claim' | 'symbol' | 'banner' | 'card' | 'badge';
export type TkeLogoTheme = 'light' | 'dark' | 'auto';

interface TkeLogoProps {
  variant?: TkeLogoVariant;
  theme?: TkeLogoTheme;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  width?: number;
  height?: number;
  className?: string;
  href?: string;
  priority?: boolean;
  withMotion?: boolean;
}

export function TkeLogo({
  variant = 'claim',
  theme = 'auto',
  size = 'md',
  width,
  height,
  className = '',
  href,
  priority = false,
  withMotion = true,
}: TkeLogoProps) {
  // Configuração por tamanho
  const sizeMap: Record<TkeLogoVariant, Record<string, { w: number; h: number; style: string }>> = {
    claim: {
      xs: { w: 100, h: 42, style: 'h-7 w-auto' },
      sm: { w: 130, h: 54, style: 'h-9 w-auto' },
      md: { w: 160, h: 66, style: 'h-11 w-auto' },
      lg: { w: 220, h: 90, style: 'h-14 w-auto' },
      xl: { w: 280, h: 115, style: 'h-18 w-auto' },
      custom: { w: width || 160, h: height || 66, style: '' },
    },
    symbol: {
      xs: { w: 24, h: 24, style: 'w-6 h-6' },
      sm: { w: 32, h: 32, style: 'w-8 h-8' },
      md: { w: 40, h: 40, style: 'w-10 h-10' },
      lg: { w: 56, h: 56, style: 'w-14 h-14' },
      xl: { w: 72, h: 72, style: 'w-18 h-18' },
      custom: { w: width || 40, h: height || 40, style: '' },
    },
    badge: {
      xs: { w: 28, h: 28, style: 'w-7 h-7' },
      sm: { w: 36, h: 36, style: 'w-9 h-9' },
      md: { w: 44, h: 44, style: 'w-11 h-11' },
      lg: { w: 60, h: 60, style: 'w-15 h-15' },
      xl: { w: 80, h: 80, style: 'w-20 h-20' },
      custom: { w: width || 44, h: height || 44, style: '' },
    },
    banner: {
      xs: { w: 320, h: 76, style: 'w-full max-w-xs h-auto' },
      sm: { w: 480, h: 114, style: 'w-full max-w-md h-auto' },
      md: { w: 640, h: 152, style: 'w-full max-w-lg h-auto' },
      lg: { w: 960, h: 227, style: 'w-full max-w-2xl h-auto' },
      xl: { w: 1200, h: 284, style: 'w-full max-w-4xl h-auto' },
      custom: { w: width || 640, h: height || 152, style: '' },
    },
    card: {
      xs: { w: 280, h: 175, style: 'w-full max-w-xs h-auto rounded-xl shadow-lg' },
      sm: { w: 400, h: 250, style: 'w-full max-w-sm h-auto rounded-2xl shadow-xl' },
      md: { w: 560, h: 350, style: 'w-full max-w-md h-auto rounded-2xl shadow-xl' },
      lg: { w: 800, h: 500, style: 'w-full max-w-2xl h-auto rounded-3xl shadow-2xl' },
      xl: { w: 1024, h: 640, style: 'w-full max-w-4xl h-auto rounded-3xl shadow-2xl' },
      custom: { w: width || 560, h: height || 350, style: '' },
    },
  };

  const currentCfg = sizeMap[variant][size] || sizeMap[variant].md;
  const finalW = width || currentCfg.w;
  const finalH = height || currentCfg.h;

  const motionClass = withMotion
    ? 'transition-all duration-300 ease-out hover:scale-105 active:scale-95'
    : '';

  let content: React.ReactNode = null;

  if (variant === 'symbol') {
    // Símbolo limpo com borda arredondada e fundo neutro de alta definição
    content = (
      <div
        className={`relative inline-flex items-center justify-center rounded-xl bg-white p-1.5 shadow-md border border-slate-200/80 ${currentCfg.style} ${motionClass} ${className}`}
      >
        <Image
          src="/images/tke-symbol.png"
          alt="TKE Símbolo Oficial"
          width={finalW}
          height={finalH}
          className="object-contain"
          priority={priority}
        />
      </div>
    );
  } else if (variant === 'badge') {
    // Badge TKE com fundo no gradiente oficial (violeta a laranja) e símbolo interno
    content = (
      <div
        className={`relative inline-flex items-center justify-center rounded-xl p-[2px] bg-gradient-to-tr from-tke-purple via-tke-magenta to-tke-orange shadow-lg shadow-orange-500/25 ${motionClass} ${className}`}
      >
        <div className="w-full h-full bg-slate-950/90 rounded-[10px] p-1.5 flex items-center justify-center backdrop-blur-xs">
          <Image
            src="/images/tke-symbol.png"
            alt="TKE Símbolo"
            width={finalW}
            height={finalH}
            className="object-contain invert brightness-200"
            priority={priority}
          />
        </div>
      </div>
    );
  } else if (variant === 'banner') {
    content = (
      <div
        className={`relative overflow-hidden rounded-2xl shadow-xl border border-white/10 ${currentCfg.style} ${className}`}
      >
        <Image
          src="/images/tke-banner-keyvisual.webp"
          alt="TKE Keyvisual Move Beyond"
          width={finalW}
          height={finalH}
          className="w-full h-auto object-cover"
          priority={priority}
        />
      </div>
    );
  } else if (variant === 'card') {
    content = (
      <div
        className={`relative overflow-hidden rounded-2xl shadow-2xl border border-white/20 ${currentCfg.style} ${className}`}
      >
        <Image
          src="/images/tke-hero-card.png"
          alt="TKE Move Beyond Card"
          width={finalW}
          height={finalH}
          className="w-full h-auto object-cover"
          priority={priority}
        />
      </div>
    );
  } else {
    // variant === 'claim' (padrão)
    // Se o tema for escuro ou auto num container escuro, usamos badge com fundo claro suave ou acabamento nítido
    content = (
      <div
        className={`relative inline-flex items-center justify-center bg-white/95 px-2.5 py-1 rounded-xl shadow-xs border border-slate-200/80 backdrop-blur-xs ${currentCfg.style} ${motionClass} ${className}`}
      >
        <Image
          src="/images/tke-logo-claim.webp"
          alt="TKE Move Beyond"
          width={finalW}
          height={finalH}
          className="object-contain h-full w-auto"
          priority={priority}
        />
      </div>
    );
  }

  if (href) {
    return (
      <Link href={href} className="inline-block focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
