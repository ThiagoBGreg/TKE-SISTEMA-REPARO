'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HomeConfig, NavButtonConfig, CustomHomeBlock } from '@/types/homeConfig';
import { DEFAULT_HOME_CONFIG } from '@/data/defaultHomeConfig';
import { DEFAULT_THEME_CONFIG, applySystemTheme } from '@/data/colorPalettes';
import { HomeDevPlatform } from './HomeDevPlatform';
import { UserRegisterDialog } from './UserRegisterDialog';
import { VideoModal } from './VideoModal';
import { QuickRepairRequestDialog } from './QuickRepairRequestDialog';
import { PhotoWindowRenderer } from './PhotoWindowRenderer';
import { AuthUser } from '@/types/auth';
import { isThiagoDev } from '@/lib/permissions';

const STORAGE_KEY = 'tke_home_config_v1';

export function EditableHomePage() {
  const router = useRouter();

  // Estado da Configuração da Home
  const [config, setConfig] = useState<HomeConfig>(DEFAULT_HOME_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Usuário autenticado
  const [user, setUser] = useState<AuthUser | null>(null);

  // Modais e Plataforma DEV
  const [isDevPlatformOpen, setIsDevPlatformOpen] = useState(false);
  const [isUserRegisterOpen, setIsUserRegisterOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [isDevAuthModalOpen, setIsDevAuthModalOpen] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [devAuthError, setDevAuthError] = useState<string | null>(null);
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);

  // 1. Carrega configuração da API online (Neon DB) ou do LocalStorage e aplica tema global
  useEffect(() => {
    async function loadConfig() {
      // 1.1 Lê do localStorage para renderização instantânea
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local) as HomeConfig;
          setConfig(parsed);
          if (parsed.themeConfig) {
            applySystemTheme(parsed.themeConfig);
          }
        }
      } catch (err) {
        console.warn('[EditableHomePage] Falha no localStorage:', err);
      }

      // 1.2 Busca a versão oficial mais recente ONLINE do banco de dados Neon
      try {
        const res = await fetch('/api/home-config', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.config) {
            setConfig(data.config);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
            if (data.config.themeConfig) {
              applySystemTheme(data.config.themeConfig);
            }
            setIsLoadingConfig(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[EditableHomePage] Falha ao carregar config da API online:', err);
      } finally {
        setIsLoadingConfig(false);
      }
    }

    loadConfig();
  }, []);

  // 2. Identifica sessão do usuário
  useEffect(() => {
    try {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies
        .find((c) => c.trim().startsWith('tke_session='))
        ?.split('=')[1];

      if (sessionCookie) {
        const decoded = JSON.parse(atob(sessionCookie)) as AuthUser;
        setUser(decoded);
        if (isThiagoDev(decoded)) {
          setIsDevUnlocked(true);
        }
      }
    } catch {
      setUser(null);
    }
  }, []);

  // Salva no backend online e sincroniza com o banco Neon
  const handleSaveToBackend = async (configToSave?: HomeConfig) => {
    const targetConfig = configToSave || config;
    try {
      const res = await fetch('/api/home-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetConfig),
      });
      if (!res.ok) {
        throw new Error('Erro ao salvar no servidor online');
      }
      const data = await res.json();
      const saved = data.config || targetConfig;
      setConfig(saved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      if (saved.themeConfig) {
        applySystemTheme(saved.themeConfig);
      }
      return saved;
    } catch (err) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targetConfig));
      throw err;
    }
  };

  const handleResetToDefault = () => {
    setConfig(DEFAULT_HOME_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    applySystemTheme(DEFAULT_THEME_CONFIG);
    fetch('/api/home-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_HOME_CONFIG),
    });
  };

  // Autenticação rápida do DEV Thiago Gregorio
  const handleDevUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPasswordInput === 'ManuLinda' || devPasswordInput === 'thiago' || devPasswordInput === 'dev') {
      setIsDevUnlocked(true);
      setIsDevAuthModalOpen(false);
      setIsDevPlatformOpen(true);
      setDevPasswordInput('');
      setDevAuthError(null);
    } else {
      setDevAuthError('Senha incorreta para acesso de desenvolvedor.');
    }
  };

  const handleOpenDevClick = () => {
    if (isDevUnlocked || isThiagoDev(user)) {
      setIsDevPlatformOpen(true);
    } else {
      setIsDevAuthModalOpen(true);
    }
  };

  // Disparo de ações de botões
  const handleButtonClick = (btn: NavButtonConfig, e?: React.MouseEvent) => {
    if (btn.actionType === 'registerUser') {
      e?.preventDefault();
      setIsUserRegisterOpen(true);
    } else if (btn.actionType === 'emitirPt') {
      e?.preventDefault();
      router.push('/dashboard/reparo/pt');
    } else if (btn.actionType === 'openDev') {
      e?.preventDefault();
      handleOpenDevClick();
    }
  };

  // Renderizador de Estilo dos Botões
  const getButtonClass = (variant: NavButtonConfig['variant']) => {
    switch (variant) {
      case 'gradient':
        return 'bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 hover:brightness-110 text-white shadow-lg shadow-orange-500/25';
      case 'purple':
        return 'bg-[#791E88] hover:bg-[#9124A3] text-white shadow-lg shadow-purple-900/30';
      case 'dark':
        return isDark
          ? 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 hover:border-orange-500/50 shadow-md'
          : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 shadow-md hover:shadow-lg';
      case 'outline':
        return isDark
          ? 'border border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10'
          : 'border-2 border-orange-500 hover:border-orange-600 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10';
      case 'secondary':
        return isDark
          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200';
      default:
        return isDark
          ? 'text-slate-300 hover:text-white hover:bg-slate-900'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100';
    }
  };

  const isDark = config.themeConfig?.isDark ?? false;

  return (
    <div
      className="min-h-screen flex flex-col justify-between selection:bg-orange-500 selection:text-white relative overflow-x-hidden font-sans transition-colors duration-200"
      style={{
        backgroundColor: 'var(--sys-bg, #ffffff)',
        color: 'var(--sys-text, #0f172a)',
      }}
    >
      {/* Luz ambiente de fundo (Glows da marca TKE) */}
      {isDark ? (
        <>
          <div className="absolute top-0 left-1/4 w-[32rem] h-[32rem] bg-purple-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-1/3 right-10 w-[35rem] h-[35rem] bg-orange-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
        </>
      ) : (
        <>
          <div className="absolute top-0 left-1/4 w-[36rem] h-[36rem] bg-purple-500/6 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-1/3 right-10 w-[38rem] h-[38rem] bg-orange-500/6 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute bottom-10 left-10 w-[32rem] h-[32rem] bg-rose-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
        </>
      )}

      {/* ==================================================================== */}
      {/* 1. TOP UTILITY BAR (Inspirada no Modelo de Referência 1) */}
      {/* ==================================================================== */}
      <div
        className={`border-b px-4 sm:px-8 py-1.5 text-[11px] flex items-center justify-between transition-colors ${
          isDark
            ? 'border-slate-900 bg-black/90 text-slate-400'
            : 'border-slate-200/90 bg-slate-50/95 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-4">
          <span className={`font-semibold tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            TK ELEVATOR GLOBAL
          </span>
          <span className={`hidden sm:inline ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
          <span className="hidden sm:inline text-orange-600 dark:text-orange-400 font-semibold">
            Padrão Move Beyond de Engenharia e Reparo
          </span>
        </div>
        <div className="flex items-center gap-3">
          {config.topBar.utilityLinks?.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className={`transition hidden md:inline font-medium ${
                isDark ? 'hover:text-white' : 'hover:text-slate-900'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {/* Botão de Acesso DEV Thiago Gregorio */}
          <button
            onClick={handleOpenDevClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black tracking-wide transition-all ${
              isDark
                ? 'bg-gradient-to-r from-purple-950/70 to-orange-950/70 border-orange-500/40 text-orange-300 hover:text-white hover:border-orange-400'
                : 'bg-white border-orange-500/50 text-orange-600 hover:bg-orange-500 hover:text-white shadow-xs'
            }`}
            title="Abrir Plataforma de Desenvolvimento da Home para Thiago Gregorio"
          >
            <span>🛠️</span>
            <span>MODO DEV: THIAGO GREGORIO</span>
            {isDevUnlocked && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. HEADER PRINCIPAL COM IMAGEM 3 NO CANTO SUPERIOR ESQUERDO */}
      {/* ==================================================================== */}
      <header
        className={`border-b px-4 sm:px-8 py-3 sticky top-0 z-40 flex items-center justify-between backdrop-blur-xl transition-colors ${
          isDark
            ? 'border-slate-800/80 bg-slate-950/85'
            : 'border-slate-200/80 bg-white/90 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            {/* Imagem 3 Oficial da Pasta "Imagens logos": TKE Move Beyond */}
            <div className="relative inline-flex items-center justify-center bg-white px-2.5 py-1 rounded-xl shadow-md border border-slate-200 transition-all duration-300 group-hover:scale-105">
              <Image
                src={config.topBar.logoUrl || '/images/imagem-3.webp'}
                alt={config.topBar.logoAlt || 'TKE Move Beyond Oficial'}
                width={130}
                height={54}
                className="h-8 sm:h-9 w-auto object-contain"
                priority
              />
            </div>

            {/* Identificação de Departamento e Sistema */}
            <div className="hidden sm:block">
              <span
                className={`font-black text-sm tracking-tight flex items-center gap-1.5 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                SISTEMA REPARO{' '}
                <span className="text-[10px] font-mono text-orange-500 font-bold px-1.5 py-0.2 rounded bg-orange-500/10 border border-orange-500/30">
                  {config.topBar.systemTag || 'TKE'}
                </span>
              </span>
              <span
                className={`text-[10px] block font-medium tracking-wide ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {config.topBar.subTitle || 'Move Beyond • Gestão de APR'}
              </span>
            </div>
          </Link>
        </div>

        {/* Links e Botões de Navegação do Topo */}
        <div className="flex items-center gap-2 sm:gap-3">
          {config.topBar.navButtons?.map((btn) => {
            if (btn.actionType === 'quickRepair') {
              return <QuickRepairRequestDialog key={btn.id} />;
            }

            return (
              <Link
                key={btn.id}
                href={btn.href}
                onClick={(e) => handleButtonClick(btn, e)}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition ${getButtonClass(
                  btn.variant
                )}`}
              >
                {btn.icon && <span>{btn.icon}</span>}
                <span>{btn.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* JANELAS DE FOTOS NO TOPO (Abaixo do Header) */}
      <PhotoWindowRenderer
        windows={config.photoWindows}
        position="top"
        isDark={isDark}
      />

      {/* ==================================================================== */}
      {/* 3. HERO SECTION (Com Colchetes TKE ┌ e ┘ do Modelo de Referência 1) */}
      {/* ==================================================================== */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14 text-center space-y-10 my-auto w-full">
        {/* Badge TKE Move Beyond */}
        <div
          className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-colors ${
            isDark
              ? 'bg-slate-900/90 border border-orange-500/30 text-orange-400 shadow-orange-500/10'
              : 'bg-white border border-slate-200 text-slate-800 shadow-slate-200/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span>{config.hero.badgeText}</span>
        </div>

        {/* Caixa de Texto Emoldurada com Colchetes Angulares TKE (┌ e ┘) */}
        <div className="relative max-w-4xl mx-auto py-6 px-6 sm:px-12">
          {/* Colchete Superior Esquerdo ┌ */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500 pointer-events-none" />
          {/* Colchete Inferior Direito ┘ */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-600 pointer-events-none" />

          {/* Subtítulo Superior (Ex: WELCOME TO TKE) */}
          <span
            className={`text-xs sm:text-sm font-black tracking-widest uppercase block mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {config.hero.bracketTopText}
          </span>

          {/* Título Principal em Caixa Alta TKE */}
          <h1
            className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight uppercase ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {config.hero.bracketHeadline}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 block mt-1">
              {config.hero.titleHighlight}
            </span>
          </h1>

          <p
            className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mt-4 font-normal ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {config.hero.subtitle}
          </p>
        </div>

        {/* Botões de Ação Principais (CTA) */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
          {/* Botão de Abertura de Chamado Rápido */}
          <QuickRepairRequestDialog />

          {config.hero.ctaButtons?.map((btn) => {
            if (btn.actionType === 'quickRepair') {
              return null; // Já renderizado acima com o componente completo
            }

            return (
              <button
                key={btn.id}
                onClick={(e) => handleButtonClick(btn, e)}
                className={`inline-flex items-center gap-2 text-sm font-extrabold px-5 py-3 rounded-2xl transition hover:scale-102 active:scale-98 ${getButtonClass(
                  btn.variant
                )}`}
              >
                {btn.icon && <span>{btn.icon}</span>}
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* JANELAS DE FOTOS NO HERO (Abaixo dos botões) */}
        <PhotoWindowRenderer
          windows={config.photoWindows}
          position="hero"
          isDark={isDark}
        />

        {/* Keyvisual Banner da Marca TKE com Glassmorphism e Moldura */}
        <div className="pt-4 relative max-w-4xl mx-auto group">
          <div
            className={`relative rounded-3xl overflow-hidden border shadow-2xl transition-all duration-500 group-hover:border-orange-500/40 ${
              isDark
                ? 'border-slate-800 shadow-orange-500/10'
                : 'border-slate-200/90 shadow-slate-300/60'
            }`}
          >
            <Image
              src={config.hero.bannerImageUrl || '/images/brand-keyvisual-1900px_image_w1900_h450.webp'}
              alt="TKE Keyvisual Move Beyond"
              width={1200}
              height={284}
              className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-102"
              priority
            />
            {/* Overlay institucional */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end justify-between p-6">
              <div className="text-left">
                <span className="text-[11px] font-bold tracking-widest uppercase text-orange-400 block drop-shadow-md">
                  {config.hero.bannerLabel}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-white drop-shadow-md">
                  {config.hero.bannerSub}
                </span>
              </div>
              <div className="hidden sm:block bg-white px-2.5 py-1 rounded-xl shadow-md border border-slate-200">
                <Image
                  src="/images/imagem-3.webp"
                  alt="TKE Símbolo"
                  width={90}
                  height={38}
                  className="h-6 w-auto object-contain"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* 4. SUB-BAR HORIZONTAL (Links rápidos de categorias) */}
        {/* ================================================================== */}
        {config.subBar.enabled && (
          <div
            className={`rounded-2xl p-2 max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs border shadow-md transition-colors ${
              isDark
                ? 'bg-slate-900/90 border-slate-800/80 text-slate-300'
                : 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {config.subBar.items?.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-xl transition font-medium ${
                    isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {config.subBar.ctaButton && (
              <QuickRepairRequestDialog />
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* 5. MANIFESTO / STATEMENT TKE (Modelo Referência 1) */}
        {/* ================================================================== */}
        {config.statement?.enabled && (
          <div className="max-w-3xl mx-auto space-y-3 py-4 text-center">
            <h2
              className={`text-lg sm:text-2xl font-black leading-snug ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {config.statement.headline}
            </h2>
            <p
              className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {config.statement.text}
            </p>
          </div>
        )}

        {/* JANELAS DE FOTOS NO MEIO DA PÁGINA (Antes dos Cards/Vídeo) */}
        <PhotoWindowRenderer
          windows={config.photoWindows}
          position="middle"
          isDark={isDark}
        />

        {/* ================================================================== */}
        {/* 6. VÍDEO OFICIAL "MOVE BEYOND" (Baseado em Modelo Referência 1) */}
        {/* ================================================================== */}
        {config.videoSection?.enabled && (
          <div className="relative max-w-4xl mx-auto pt-4">
            <div
              className={`relative rounded-3xl overflow-hidden border group shadow-2xl ${
                isDark ? 'border-slate-800' : 'border-slate-200 shadow-slate-200/50'
              }`}
            >
              {/* Imagem de Capa do Vídeo */}
              <div className="relative aspect-video sm:aspect-[21/9] w-full bg-slate-900 overflow-hidden">
                <Image
                  src={config.videoSection.posterUrl || '/images/modelo-referencia-1.png'}
                  alt={config.videoSection.title}
                  fill
                  className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/30" />

                {/* Colchetes Angulares TKE no Card de Vídeo */}
                <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-white pointer-events-none" />
                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-white pointer-events-none" />

                {/* Conteúdo Central do Vídeo com Botão Play Circular Estilo Modelo 1 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <span className="text-xs font-black tracking-widest text-orange-400 uppercase mb-2">
                    {config.videoSection.bracketTitle || 'MOVE BEYOND VIDEO'}
                  </span>

                  <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase mb-4">
                    {config.videoSection.title}
                  </h3>

                  {/* Botão de Play Circular Oficial */}
                  <button
                    onClick={() => {
                      setActiveVideoUrl(config.videoSection.videoUrl);
                      setIsVideoModalOpen(true);
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 hover:bg-orange-500 text-slate-950 hover:text-white flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group/btn"
                    aria-label="Reproduzir vídeo"
                  >
                    <span className="text-2xl sm:text-3xl font-black translate-x-0.5">▶</span>
                  </button>

                  <span className="text-xs sm:text-sm font-bold text-slate-200 mt-3 tracking-wide">
                    {config.videoSection.subtitle}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* 7. CARDS DE DESTAQUE / SOLUÇÕES DE ENGENHARIA & REPARO */}
        {/* ================================================================== */}
        {config.featuresGrid?.enabled && (
          <div className="space-y-6 pt-6">
            <div className="relative max-w-4xl mx-auto text-left pl-6">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-orange-500" />
              <h2
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {config.featuresGrid.title}
              </h2>
              {config.featuresGrid.subtitle && (
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {config.featuresGrid.subtitle}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto text-left">
              {config.featuresGrid.cards?.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  className={`p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between ${
                    isDark
                      ? 'bg-slate-900/60 border-slate-800 hover:border-orange-500/50 shadow-md'
                      : 'bg-white border-slate-200/90 hover:border-orange-500/50 shadow-md shadow-slate-100 hover:shadow-xl'
                  }`}
                >
                  <div className="space-y-3">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded border inline-block ${card.badgeColor}`}
                    >
                      {card.tag}
                    </span>
                    <h3
                      className={`font-bold text-sm transition group-hover:text-orange-500 ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {card.title}
                    </h3>
                    <p
                      className={`text-xs line-clamp-3 leading-relaxed ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {card.description}
                    </p>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-bold text-orange-500 group-hover:translate-x-1 transition-transform">
                    <span>Acessar</span>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* 8. BLOCOS CUSTOMIZADOS ADICIONADOS PELO DEV THIAGO GREGORIO */}
        {/* ================================================================== */}
        {config.customBlocks && config.customBlocks.length > 0 && (
          <div className="space-y-8 pt-6 max-w-4xl mx-auto">
            {config.customBlocks.map((blk) => {
              if (blk.type === 'text') {
                return (
                  <div
                    key={blk.id}
                    className={`relative p-6 rounded-2xl text-${blk.align} border ${
                      isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-md'
                    }`}
                  >
                    {blk.showBrackets && (
                      <>
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-orange-500" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-purple-600" />
                      </>
                    )}
                    {blk.subtitle && (
                      <span className="text-[11px] font-bold text-orange-500 uppercase tracking-widest block mb-1">
                        {blk.subtitle}
                      </span>
                    )}
                    <h3
                      className={`text-xl sm:text-2xl font-black ${
                        blk.gradientTitle
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-purple-600'
                          : isDark
                          ? 'text-white'
                          : 'text-slate-900'
                      }`}
                    >
                      {blk.title}
                    </h3>
                    <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {blk.content}
                    </p>
                  </div>
                );
              }

              if (blk.type === 'image') {
                return (
                  <div
                    key={blk.id}
                    className={`relative rounded-2xl overflow-hidden border ${
                      isDark ? 'border-slate-800' : 'border-slate-200 shadow-md'
                    }`}
                  >
                    <img src={blk.imageUrl} alt={blk.title || 'Imagem'} className="w-full h-auto object-cover" />
                    {blk.caption && (
                      <div
                        className={`p-3 text-xs text-center font-medium ${
                          isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {blk.caption}
                      </div>
                    )}
                  </div>
                );
              }

              if (blk.type === 'video') {
                return (
                  <div
                    key={blk.id}
                    className={`p-6 rounded-2xl flex items-center justify-between gap-4 border ${
                      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-md'
                    }`}
                  >
                    <div>
                      <h4 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {blk.title}
                      </h4>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{blk.subtitle}</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveVideoUrl(blk.videoUrl);
                        setIsVideoModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2"
                    >
                      <span>▶</span> Assistir Vídeo
                    </button>
                  </div>
                );
              }

              if (blk.type === 'buttons') {
                return (
                  <div
                    key={blk.id}
                    className={`p-6 rounded-2xl space-y-3 border ${
                      isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200 shadow-md'
                    }`}
                  >
                    {blk.title && (
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {blk.title}
                      </h4>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {blk.buttons?.map((b) => (
                        <button
                          key={b.id}
                          onClick={(e) => handleButtonClick(b, e)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold ${getButtonClass(b.variant)}`}
                        >
                          {b.icon && <span className="mr-1">{b.icon}</span>}
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (blk.type === 'actionCard') {
                return (
                  <div
                    key={blk.id}
                    className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/20 via-slate-900 to-orange-950/20 border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-lg"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold text-orange-400 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30">
                        {blk.badge}
                      </span>
                      <h4 className="text-base font-black text-white mt-2">{blk.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">{blk.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (blk.actionType === 'registerUser') setIsUserRegisterOpen(true);
                        else if (blk.actionType === 'emitirPt') router.push('/dashboard/reparo/pt');
                      }}
                      className="whitespace-nowrap px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 font-extrabold text-xs text-white shadow-lg shadow-orange-500/25"
                    >
                      {blk.buttonLabel}
                    </button>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}

        {/* JANELAS DE FOTOS NO RODAPÉ (Acima do Footer) */}
        <PhotoWindowRenderer
          windows={config.photoWindows}
          position="bottom"
          isDark={isDark}
        />
      </main>

      {/* JANELAS FLUTUANTES (Lateral Direita e Esquerda) */}
      <PhotoWindowRenderer
        windows={config.photoWindows}
        position="floating-right"
        isDark={isDark}
      />
      <PhotoWindowRenderer
        windows={config.photoWindows}
        position="floating-left"
        isDark={isDark}
      />

      {/* ==================================================================== */}
      {/* 9. FOOTER OFICIAL TKE (Inspirado no Modelo de Referência 2) */}
      {/* ==================================================================== */}
      <footer
        className={`border-t relative transition-colors ${
          isDark
            ? 'border-slate-900 bg-black text-white'
            : 'border-slate-200/80 bg-slate-100/90 text-slate-600'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
          <div className="flex items-center gap-3">
            <div className="bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
              <Image
                src={config.footer.logoUrl || '/images/imagem-3.webp'}
                alt="TKE Move Beyond"
                width={80}
                height={32}
                className="h-6 w-auto object-contain"
              />
            </div>
            <span className="font-medium">{config.footer.copyrightText}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-semibold">
            {config.footer.links?.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                className={`transition ${isDark ? 'hover:text-white' : 'hover:text-slate-900'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Faixa Gradiente TKE Oficial no Fundo Extremo */}
        <div className="h-1.5 w-full bg-gradient-to-r from-purple-700 via-rose-600 to-orange-500" />
      </footer>

      {/* ==================================================================== */}
      {/* 10. MODAL DE DESBLOQUEIO DE ACESSO DEV (Para Thiago Gregorio) */}
      {/* ==================================================================== */}
      {isDevAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-950 border border-orange-500/40 rounded-3xl p-6 space-y-4 shadow-2xl shadow-orange-500/20 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 font-bold">🛠️</span>
                <h3 className="font-black text-sm text-white">Acesso DEV: Thiago Gregorio</h3>
              </div>
              <button
                onClick={() => setIsDevAuthModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite a senha de desenvolvedor para abrir a plataforma de design, paleta de cores e janelas de fotos:
            </p>

            <form onSubmit={handleDevUnlockSubmit} className="space-y-3">
              <input
                type="password"
                required
                autoFocus
                value={devPasswordInput}
                onChange={(e) => setDevPasswordInput(e.target.value)}
                placeholder="Senha de DEV"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              />

              {devAuthError && (
                <div className="text-[11px] text-rose-400 font-bold">⚠️ {devAuthError}</div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDevAuthModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 text-xs font-bold text-white shadow-md hover:brightness-110"
                >
                  Desbloquear Studio DEV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 11. PLATAFORMA DE DESENVOLVIMENTO (STUDIO DEV) */}
      {/* ==================================================================== */}
      <HomeDevPlatform
        isOpen={isDevPlatformOpen}
        onClose={() => setIsDevPlatformOpen(false)}
        config={config}
        onUpdateConfig={setConfig}
        onSaveToBackend={handleSaveToBackend}
        onResetToDefault={handleResetToDefault}
        onOpenUserRegister={() => setIsUserRegisterOpen(true)}
        onOpenQuickRepair={() => {
          const el = document.getElementById('btn-quick-repair-trigger');
          el?.click();
        }}
        onOpenVideo={() => {
          setActiveVideoUrl(config.videoSection.videoUrl);
          setIsVideoModalOpen(true);
        }}
      />

      {/* ==================================================================== */}
      {/* 12. MODAIS AUXILIARES */}
      {/* ==================================================================== */}
      <UserRegisterDialog
        isOpen={isUserRegisterOpen}
        onClose={() => setIsUserRegisterOpen(false)}
      />

      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl={activeVideoUrl}
        title={config.videoSection.title}
      />
    </div>
  );
}
