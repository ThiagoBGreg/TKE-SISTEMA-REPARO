'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  HomeConfig,
  NavButtonConfig,
  CustomHomeBlock,
  PhotoWindowConfig,
  PhotoWindowSize,
  PhotoWindowPosition,
  PhotoWindowAspectRatio,
  SystemThemeConfig,
  ActionType,
} from '@/types/homeConfig';
import {
  COLOR_PALETTE_PRESETS,
  DEFAULT_THEME_CONFIG,
  applySystemTheme,
  ColorPalettePreset,
} from '@/data/colorPalettes';

const PRESET_IMAGES = [
  { id: 'img-3', label: 'Imagem 3: Logo Oficial TKE Move Beyond', url: '/images/imagem-3.webp' },
  { id: 'img-1', label: 'Imagem 1: Símbolo TKE Vetor Preto', url: '/images/imagem-1.png' },
  { id: 'img-2', label: 'Imagem 2: Template Capa Blogs', url: '/images/imagem-2.png' },
  { id: 'ref-1', label: 'Modelo Referência 1: Site TK Elevator Oficial', url: '/images/modelo-referencia-1.png' },
  { id: 'ref-2', label: 'Modelo Referência 2: Social & LinkedIn Feed', url: '/images/modelo-referencia-2.png' },
  { id: 'banner-keyvisual', label: 'Keyvisual Oficial TKE 1900px', url: '/images/brand-keyvisual-1900px_image_w1900_h450.webp' },
];

const MENU_DESTINOS: Array<{ label: string; href: string; actionType?: ActionType }> = [
  { label: 'Visão Geral (Dashboard)', href: '/dashboard', actionType: 'link' },
  { label: 'Ordens de Reparo', href: '/dashboard/reparo', actionType: 'link' },
  { label: 'Emitir PT / APR Digital', href: '/dashboard/reparo/pt', actionType: 'emitirPt' },
  { label: 'Acompanhamento Tempo Real', href: '/dashboard/reparo/acompanhamento', actionType: 'link' },
  { label: 'Segurança OSH & NR', href: '/dashboard/osh', actionType: 'link' },
  { label: 'Logística DLOG', href: '/dashboard/dlog', actionType: 'link' },
  { label: 'Portal do Prestador', href: '/dashboard/subcontratado/historico', actionType: 'link' },
  { label: 'Pagamentos Subcontratados', href: '/dashboard/pagamentos', actionType: 'link' },
  { label: 'Gestão de Cadastros (DEV)', href: '/dashboard/usuarios', actionType: 'link' },
  { label: '⚡ Ação Rápida: Abrir Chamado / Reparo', href: '#abrir-chamado', actionType: 'quickRepair' },
  { label: '⚡ Ação Rápida: Cadastrar Novo Usuário', href: '#cadastro', actionType: 'registerUser' },
];

interface HomeDevPlatformProps {
  isOpen: boolean;
  onClose: () => void;
  config: HomeConfig;
  onUpdateConfig: (newConfig: HomeConfig) => void;
  onSaveToBackend: () => Promise<void>;
  onResetToDefault: () => void;
  onOpenUserRegister: () => void;
  onOpenQuickRepair: () => void;
  onOpenVideo: () => void;
}

export function HomeDevPlatform({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  onSaveToBackend,
  onResetToDefault,
  onOpenUserRegister,
  onOpenQuickRepair,
  onOpenVideo,
}: HomeDevPlatformProps) {
  const [activeTab, setActiveTab] = useState<
    'cores' | 'janelas' | 'textos' | 'imagens' | 'videos' | 'botoes' | 'blocos' | 'acoes' | 'salvar'
  >('cores');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Estados para Janelas de Fotos
  const [isWindowFormOpen, setIsWindowFormOpen] = useState(false);
  const [editingWindowId, setEditingWindowId] = useState<string | null>(null);
  const [windowForm, setWindowForm] = useState<Partial<PhotoWindowConfig>>({
    title: '',
    caption: '',
    imageUrl: '/images/brand-keyvisual-1900px_image_w1900_h450.webp',
    size: 'md',
    position: 'middle',
    aspectRatio: '16/9',
    borderStyle: 'modern',
    linkUrl: '',
    enabled: true,
  });

  if (!isOpen) return null;

  const currentTheme: SystemThemeConfig = config.themeConfig || DEFAULT_THEME_CONFIG;

  // =========================================================================
  // HANDLERS DE PALETAS DE CORES & TEMA GLOBAL (AFETA TODO O SISTEMA)
  // =========================================================================
  const handleSelectPalette = (preset: ColorPalettePreset) => {
    const updatedTheme: SystemThemeConfig = {
      paletteId: preset.id,
      bgColor: preset.bgColor,
      textColor: preset.textColor,
      cardBgColor: preset.cardBgColor,
      borderColor: preset.borderColor,
      accentColor: preset.accentColor,
      isDark: preset.isDark,
    };

    onUpdateConfig({
      ...config,
      theme: preset.isDark ? 'dark' : 'light',
      themeConfig: updatedTheme,
    });

    applySystemTheme(updatedTheme);
    setSaveStatus(`Paleta "${preset.name}" aplicada em todo o sistema!`);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleUpdateCustomColor = (key: keyof SystemThemeConfig, value: string) => {
    const isDark =
      key === 'bgColor'
        ? isColorDark(value)
        : currentTheme.isDark;

    const updatedTheme: SystemThemeConfig = {
      ...currentTheme,
      [key]: value,
      isDark,
      paletteId: 'custom',
    };

    onUpdateConfig({
      ...config,
      theme: isDark ? 'dark' : 'light',
      themeConfig: updatedTheme,
    });

    applySystemTheme(updatedTheme);
  };

  const handleResetToWhiteDefault = () => {
    onUpdateConfig({
      ...config,
      theme: 'light',
      themeConfig: DEFAULT_THEME_CONFIG,
    });
    applySystemTheme(DEFAULT_THEME_CONFIG);
    setSaveStatus('Fundo branco moderno padrão TKE restaurado em todo o sistema!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  function isColorDark(hexColor: string): boolean {
    try {
      const hex = hexColor.replace('#', '');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
      }
    } catch {
      // fallback
    }
    return false;
  }

  // =========================================================================
  // HANDLERS DE JANELAS DE FOTOS (TAMANHO & LOCAL)
  // =========================================================================
  const handleOpenNewWindowForm = () => {
    setWindowForm({
      id: `photo-win-${Date.now()}`,
      title: 'Nova Janela TKE',
      caption: '',
      imageUrl: '/images/brand-keyvisual-1900px_image_w1900_h450.webp',
      size: 'md',
      position: 'middle',
      aspectRatio: '16/9',
      borderStyle: 'modern',
      linkUrl: '',
      enabled: true,
    });
    setEditingWindowId(null);
    setIsWindowFormOpen(true);
  };

  const handleEditWindow = (win: PhotoWindowConfig) => {
    setWindowForm({ ...win });
    setEditingWindowId(win.id);
    setIsWindowFormOpen(true);
  };

  const handleSaveWindow = () => {
    if (!windowForm.imageUrl) {
      alert('Por favor, informe ou selecione a imagem da janela.');
      return;
    }

    const currentWindows = config.photoWindows || [];

    if (editingWindowId) {
      const updated = currentWindows.map((w) =>
        w.id === editingWindowId ? ({ ...w, ...windowForm } as PhotoWindowConfig) : w
      );
      onUpdateConfig({ ...config, photoWindows: updated });
    } else {
      const newWin: PhotoWindowConfig = {
        id: windowForm.id || `photo-win-${Date.now()}`,
        title: windowForm.title || '',
        caption: windowForm.caption || '',
        imageUrl: windowForm.imageUrl,
        size: (windowForm.size || 'md') as PhotoWindowSize,
        position: (windowForm.position || 'middle') as PhotoWindowPosition,
        aspectRatio: (windowForm.aspectRatio || '16/9') as PhotoWindowAspectRatio,
        borderStyle: windowForm.borderStyle || 'modern',
        linkUrl: windowForm.linkUrl || '',
        enabled: windowForm.enabled !== false,
      };
      onUpdateConfig({ ...config, photoWindows: [...currentWindows, newWin] });
    }

    setIsWindowFormOpen(false);
    setEditingWindowId(null);
  };

  const handleDeleteWindow = (id: string) => {
    const updated = (config.photoWindows || []).filter((w) => w.id !== id);
    onUpdateConfig({ ...config, photoWindows: updated });
  };

  const handleToggleWindow = (id: string) => {
    const updated = (config.photoWindows || []).map((w) =>
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    onUpdateConfig({ ...config, photoWindows: updated });
  };

  const handleMoveWindow = (index: number, direction: 'up' | 'down') => {
    const windows = [...(config.photoWindows || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= windows.length) return;
    const temp = windows[index];
    windows[index] = windows[targetIdx];
    windows[targetIdx] = temp;
    onUpdateConfig({ ...config, photoWindows: windows });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Url = uploadEvent.target?.result as string;
        setWindowForm((prev) => ({ ...prev, imageUrl: base64Url }));
      };
      reader.readAsDataURL(file);
    }
  };

  // =========================================================================
  // HANDLERS PADRÃO DE BLOCOS, TOPBAR, HERO, VÍDEO E BOTÕES
  // =========================================================================
  const updateTopBar = (partial: Partial<HomeConfig['topBar']>) => {
    onUpdateConfig({
      ...config,
      topBar: { ...config.topBar, ...partial },
    });
  };

  const updateHero = (partial: Partial<HomeConfig['hero']>) => {
    onUpdateConfig({
      ...config,
      hero: { ...config.hero, ...partial },
    });
  };

  const updateStatement = (partial: Partial<HomeConfig['statement']>) => {
    onUpdateConfig({
      ...config,
      statement: { ...config.statement, ...partial },
    });
  };

  const updateVideoSection = (partial: Partial<HomeConfig['videoSection']>) => {
    onUpdateConfig({
      ...config,
      videoSection: { ...config.videoSection, ...partial },
    });
  };

  const addHeroButton = () => {
    const newBtn: NavButtonConfig = {
      id: `btn-${Date.now()}`,
      label: 'Novo Botão TKE',
      href: '/dashboard/reparo/pt',
      variant: 'gradient',
      icon: '⚡',
      actionType: 'emitirPt',
    };
    onUpdateConfig({
      ...config,
      hero: {
        ...config.hero,
        ctaButtons: [...config.hero.ctaButtons, newBtn],
      },
    });
  };

  const updateHeroButton = (index: number, partial: Partial<NavButtonConfig>) => {
    const updated = [...config.hero.ctaButtons];
    updated[index] = { ...updated[index], ...partial };
    onUpdateConfig({
      ...config,
      hero: {
        ...config.hero,
        ctaButtons: updated,
      },
    });
  };

  const removeHeroButton = (index: number) => {
    const updated = config.hero.ctaButtons.filter((_, i) => i !== index);
    onUpdateConfig({
      ...config,
      hero: {
        ...config.hero,
        ctaButtons: updated,
      },
    });
  };

  const addCustomBlock = (type: 'text' | 'image' | 'video' | 'buttons' | 'actionCard') => {
    let newBlock: CustomHomeBlock;
    const id = `block-${Date.now()}`;

    if (type === 'text') {
      newBlock = {
        id,
        type: 'text',
        title: 'Novo Título em Destaque',
        subtitle: 'Subtítulo descritivo',
        content: 'Insira o parágrafo explicativo da TKE com detalhes técnicos e operacionais.',
        align: 'left',
        showBrackets: true,
        gradientTitle: true,
      };
    } else if (type === 'image') {
      newBlock = {
        id,
        type: 'image',
        title: 'Nova Imagem em Destaque',
        caption: 'Legenda da foto institucional',
        imageUrl: '/images/brand-keyvisual-1900px_image_w1900_h450.webp',
        showBrackets: true,
        aspectRatio: 'video',
      };
    } else if (type === 'video') {
      newBlock = {
        id,
        type: 'video',
        title: 'Vídeo Operacional TKE',
        subtitle: 'Assista ao procedimento técnico de engenharia',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        posterUrl: '/images/modelo-referencia-1.png',
        showBrackets: true,
      };
    } else if (type === 'buttons') {
      newBlock = {
        id,
        type: 'buttons',
        title: 'Ações Rápidas em Destaque',
        description: 'Selecione a ação desejada abaixo:',
        buttons: [
          {
            id: `btn-${Date.now()}-1`,
            label: 'Emitir PT / APR',
            href: '/dashboard/reparo/pt',
            variant: 'gradient',
            actionType: 'emitirPt',
          },
          {
            id: `btn-${Date.now()}-2`,
            label: 'Ordens de Reparo',
            href: '/dashboard/reparo',
            variant: 'dark',
            actionType: 'link',
          },
        ],
      };
    } else {
      newBlock = {
        id,
        type: 'actionCard',
        title: 'Emissão Rápida de Permissão de Trabalho (PT)',
        description: 'Emita e assine digitalmente sua PT/APR com geolocalização e envio de fotos para o Google Drive.',
        actionType: 'emitirPt',
        badge: 'NR-10 • NR-18 • NR-35',
        buttonLabel: 'Emitir PT Agora →',
      };
    }

    onUpdateConfig({
      ...config,
      customBlocks: [...(config.customBlocks || []), newBlock],
    });
  };

  const removeCustomBlock = (index: number) => {
    const updated = config.customBlocks.filter((_, i) => i !== index);
    onUpdateConfig({
      ...config,
      customBlocks: updated,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await onSaveToBackend();
      setSaveStatus('Configurações gravadas com sucesso no sistema!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e: any) {
      setSaveStatus(`Erro ao salvar: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-950/98 border-l border-orange-500/30 backdrop-blur-2xl shadow-2xl shadow-orange-500/20 flex flex-col text-white animate-slideInRight">
      {/* Top Header do Studio */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 via-rose-500 to-orange-500 text-white font-black text-xs shadow-md">
            DEV
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              Plataforma de Desenvolvimento & Design
            </h2>
            <span className="text-[11px] text-orange-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Usuário DEV: Thiago Gregorio • Modo Customização Ativo
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
          title="Minimizar / Fechar Painel DEV"
        >
          ✕
        </button>
      </div>

      {/* Tabs de Navegação da Plataforma */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-800 bg-slate-900/50 overflow-x-auto text-xs scrollbar-none">
        {[
          { id: 'cores', label: '🎨 Paletas & Cores (Global)' },
          { id: 'janelas', label: '🪟 Janelas de Fotos' },
          { id: 'textos', label: '📝 Textos' },
          { id: 'imagens', label: '🖼️ Logos & Banners' },
          { id: 'videos', label: '🎥 Vídeos' },
          { id: 'botoes', label: '🔘 Botões' },
          { id: 'blocos', label: '➕ Blocos' },
          { id: 'acoes', label: '⚡ Ações' },
          { id: 'salvar', label: '💾 Salvar' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da Aba */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
        {/* ============================================================== */}
        {/* ABA 1: PALETAS DE CORES & TEMA GLOBAL */}
        {/* ============================================================== */}
        {activeTab === 'cores' && (
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-orange-950/40 via-purple-950/40 to-slate-900 border border-orange-500/30 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-orange-400 flex items-center gap-1.5 text-xs">
                  <span>🎨</span> Controle Global de Paleta & Fundo
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Todo o Sistema
                </span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Toda alteração de cor de fundo e letras feita aqui é aplicada em{' '}
                <strong className="text-white">todas as páginas do sistema</strong> (Home, Dashboard, Ordens de Serviço, Emissão de PT, etc.) e salva permanentemente.
              </p>
            </div>

            {/* Botão de Restauração Rápida para o Branco Padrão */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl">
              <div>
                <span className="font-bold text-white block">Padrão do Sistema</span>
                <span className="text-[11px] text-slate-400">
                  Fundo Branco Moderno Clean com tipografia escura de alta legibilidade.
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetToWhiteDefault}
                className="px-3.5 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-200 font-black text-xs shadow-md transition shrink-0"
              >
                Restaurar Branco Padrão
              </button>
            </div>

            {/* Grid de Paletas Pré-definidas */}
            <div className="space-y-3">
              <label className="font-extrabold text-white text-xs block">
                Selecione uma Paleta Pré-configurada:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COLOR_PALETTE_PRESETS.map((preset) => {
                  const isSelected = currentTheme.paletteId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPalette(preset)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-slate-900 shadow-lg shadow-orange-500/20 ring-2 ring-orange-500/40'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        {/* Prévia das Cores */}
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="w-6 h-6 rounded-lg shadow-inner border border-slate-600/40"
                            style={{ backgroundColor: preset.bgColor }}
                            title={`Fundo: ${preset.bgColor}`}
                          />
                          <span
                            className="w-6 h-6 rounded-lg shadow-inner border border-slate-600/40"
                            style={{ backgroundColor: preset.textColor }}
                            title={`Texto: ${preset.textColor}`}
                          />
                          <span
                            className="w-6 h-6 rounded-lg shadow-inner border border-slate-600/40"
                            style={{ backgroundColor: preset.accentColor }}
                            title={`Acento: ${preset.accentColor}`}
                          />
                          <span className="text-[10px] font-mono uppercase text-slate-400 ml-auto">
                            {preset.tag}
                          </span>
                        </div>

                        <h4 className="font-extrabold text-white text-xs flex items-center justify-between">
                          <span>{preset.name}</span>
                          {isSelected && (
                            <span className="text-[10px] text-emerald-400 font-bold">✓ Ativa</span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {preset.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={`mt-3 py-1.5 px-3 rounded-xl font-bold text-[11px] transition text-center ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {isSelected ? 'Paleta Ativa' : 'Aplicar Paleta'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Seletor Customizado de Cores (Cores Específicas) */}
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-4">
              <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
                <span>🎛️</span> Personalização de Cores Específicas
              </h4>

              {/* 1. Cor de Fundo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Cor de Fundo do Sistema (bg):</label>
                  <span className="font-mono text-slate-400 text-[11px]">{currentTheme.bgColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTheme.bgColor.startsWith('#') ? currentTheme.bgColor : '#ffffff'}
                    onChange={(e) => handleUpdateCustomColor('bgColor', e.target.value)}
                    className="w-10 h-9 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={currentTheme.bgColor}
                    onChange={(e) => handleUpdateCustomColor('bgColor', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  {/* Atalhos rápidos de fundo */}
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomColor('bgColor', '#ffffff')}
                    className="px-2.5 py-1.5 bg-white text-slate-950 font-bold rounded-lg text-[10px]"
                    title="Branco Puro"
                  >
                    Branco
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomColor('bgColor', '#f8fafc')}
                    className="px-2.5 py-1.5 bg-slate-200 text-slate-950 font-bold rounded-lg text-[10px]"
                    title="Gelo Clean"
                  >
                    Gelo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomColor('bgColor', '#0f172a')}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-white font-bold rounded-lg text-[10px]"
                    title="Dark Slate"
                  >
                    Dark
                  </button>
                </div>
              </div>

              {/* 2. Cor das Letras */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Cor das Letras & Textos (color):</label>
                  <span className="font-mono text-slate-400 text-[11px]">{currentTheme.textColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTheme.textColor.startsWith('#') ? currentTheme.textColor : '#0f172a'}
                    onChange={(e) => handleUpdateCustomColor('textColor', e.target.value)}
                    className="w-10 h-9 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={currentTheme.textColor}
                    onChange={(e) => handleUpdateCustomColor('textColor', e.target.value)}
                    placeholder="#0f172a"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomColor('textColor', '#0f172a')}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 text-white font-bold rounded-lg text-[10px]"
                    title="Slate Escuro"
                  >
                    Preto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomColor('textColor', '#ffffff')}
                    className="px-2.5 py-1.5 bg-white text-slate-950 font-bold rounded-lg text-[10px]"
                    title="Branco Puro"
                  >
                    Branco
                  </button>
                </div>
              </div>

              {/* 3. Cor dos Cards & Janelas */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Fundo de Cards & Janelas:</label>
                  <span className="font-mono text-slate-400 text-[11px]">{currentTheme.cardBgColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTheme.cardBgColor.startsWith('#') ? currentTheme.cardBgColor : '#ffffff'}
                    onChange={(e) => handleUpdateCustomColor('cardBgColor', e.target.value)}
                    className="w-10 h-9 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={currentTheme.cardBgColor}
                    onChange={(e) => handleUpdateCustomColor('cardBgColor', e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* 4. Cor de Acento TKE */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">Cor de Destaque / Acentos TKE:</label>
                  <span className="font-mono text-slate-400 text-[11px]">{currentTheme.accentColor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTheme.accentColor.startsWith('#') ? currentTheme.accentColor : '#ff5e00'}
                    onChange={(e) => handleUpdateCustomColor('accentColor', e.target.value)}
                    className="w-10 h-9 rounded-xl border border-slate-700 bg-slate-800 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={currentTheme.accentColor}
                    onChange={(e) => handleUpdateCustomColor('accentColor', e.target.value)}
                    placeholder="#ff5e00"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomColor('accentColor', '#ff5e00')}
                    className="px-2 py-1.5 bg-orange-500 text-white font-bold rounded-lg text-[10px]"
                  >
                    Laranja
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomColor('accentColor', '#b81b6c')}
                    className="px-2 py-1.5 bg-rose-600 text-white font-bold rounded-lg text-[10px]"
                  >
                    Magenta
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomColor('accentColor', '#791e88')}
                    className="px-2 py-1.5 bg-purple-700 text-white font-bold rounded-lg text-[10px]"
                  >
                    Púrpura
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 2: JANELAS DE FOTOS (TAMANHO & LOCAL NA PÁGINA) */}
        {/* ============================================================== */}
        {activeTab === 'janelas' && (
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900 to-orange-950/40 border border-orange-500/30 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <span className="font-extrabold text-orange-400 block text-xs">
                  🪟 Gerenciador de Janelas de Fotos
                </span>
                <span className="text-[11px] text-slate-300 mt-0.5 block">
                  Adicione molduras/janelas para fotos, escolha o tamanho exato e a posição na página.
                </span>
              </div>
              <button
                type="button"
                onClick={handleOpenNewWindowForm}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 hover:brightness-110 font-bold text-xs text-white shadow-lg shadow-orange-500/20 shrink-0 transition"
              >
                + Nova Janela
              </button>
            </div>

            {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO DE JANELA */}
            {isWindowFormOpen && (
              <div className="p-5 bg-slate-900 border-2 border-orange-500/60 rounded-3xl space-y-4 shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="font-black text-white text-xs flex items-center gap-2">
                    <span>🖼️</span> {editingWindowId ? 'Editar Janela de Foto' : 'Adicionar Nova Janela de Foto'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsWindowFormOpen(false)}
                    className="text-slate-400 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>

                {/* 1. Escolha da Foto */}
                <div className="space-y-2">
                  <label className="font-bold text-white text-xs block">1. Imagem da Janela:</label>

                  {/* Prévia da imagem selecionada */}
                  {windowForm.imageUrl && (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
                      <Image
                        src={windowForm.imageUrl}
                        alt="Prévia"
                        fill
                        unoptimized={windowForm.imageUrl.startsWith('data:')}
                        className="object-cover"
                      />
                    </div>
                  )}

                  {/* Upload do Computador */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex-1 cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-center font-bold text-xs text-orange-400 transition">
                      📁 Escolher Foto do Computador (Upload)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* URL Manual */}
                  <input
                    type="text"
                    value={windowForm.imageUrl || ''}
                    onChange={(e) => setWindowForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="Ou cole a URL da imagem aqui"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />

                  {/* Galeria rápida */}
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1.5">
                      Ou selecione imagens oficiais da biblioteca:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PRESET_IMAGES.map((img) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setWindowForm((prev) => ({ ...prev, imageUrl: img.url }))}
                          className={`p-1.5 rounded-xl border text-left truncate transition ${
                            windowForm.imageUrl === img.url
                              ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                              : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden mb-1">
                            <Image src={img.url} alt={img.label} fill className="object-cover" />
                          </div>
                          <span className="text-[10px] block truncate font-medium">{img.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Escolha do Tamanho */}
                <div className="space-y-2">
                  <label className="font-bold text-white text-xs block">2. Tamanho da Janela:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'sm', label: 'Pequeno (320px)', desc: 'Card compacto' },
                      { id: 'md', label: 'Médio (520px)', desc: 'Padrão equilibrado' },
                      { id: 'lg', label: 'Grande (750px)', desc: 'Destaque amplo' },
                      { id: 'full', label: 'Largura Total', desc: '100% do container' },
                      { id: 'banner', label: 'Banner Largo', desc: 'Widescreen panorâmico' },
                    ].map((sz) => (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => setWindowForm((prev) => ({ ...prev, size: sz.id as any }))}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          windowForm.size === sz.id
                            ? 'border-orange-500 bg-orange-500/15 text-white ring-1 ring-orange-500'
                            : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-bold text-xs block">{sz.label}</span>
                        <span className="text-[10px] text-slate-400 block">{sz.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Escolha do Local na Página */}
                <div className="space-y-2">
                  <label className="font-bold text-white text-xs block">3. Local na Página (Posição):</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'top', label: 'Topo', desc: 'Logo abaixo do Header' },
                      { id: 'hero', label: 'No Hero', desc: 'Abaixo dos botões CTA' },
                      { id: 'middle', label: 'Meio da Página', desc: 'Antes das soluções' },
                      { id: 'bottom', label: 'Rodapé', desc: 'Acima do footer' },
                      { id: 'floating-right', label: 'Janela Flutuante ↗', desc: 'Widget lateral direito' },
                      { id: 'floating-left', label: 'Janela Flutuante ↖', desc: 'Widget lateral esquerdo' },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setWindowForm((prev) => ({ ...prev, position: pos.id as any }))}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          windowForm.position === pos.id
                            ? 'border-orange-500 bg-orange-500/15 text-white ring-1 ring-orange-500'
                            : 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="font-bold text-xs block">{pos.label}</span>
                        <span className="text-[10px] text-slate-400 block">{pos.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Proporção & Estilo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 text-[11px] block">Proporção da Foto:</label>
                    <select
                      value={windowForm.aspectRatio || '16/9'}
                      onChange={(e) => setWindowForm((prev) => ({ ...prev, aspectRatio: e.target.value as any }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="16/9">16:9 (Widescreen Vídeo)</option>
                      <option value="4/3">4:3 (Fotografia Clássica)</option>
                      <option value="1/1">1:1 (Quadrado)</option>
                      <option value="21/9">21:9 (Cinemático Panorâmico)</option>
                      <option value="3/4">3:4 (Retrato Vertical)</option>
                      <option value="auto">Auto (Natural)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-300 text-[11px] block">Estilo da Moldura:</label>
                    <select
                      value={windowForm.borderStyle || 'modern'}
                      onChange={(e) => setWindowForm((prev) => ({ ...prev, borderStyle: e.target.value as any }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="modern">Moderna Clean (Cantos suaves)</option>
                      <option value="brackets">Colchetes TKE ┌ ┘ (Engenharia)</option>
                      <option value="glass">Vidro Glassmorphism</option>
                      <option value="neon">Neon Laranja TKE</option>
                    </select>
                  </div>
                </div>

                {/* 5. Título e Legenda Opcionais */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 text-[11px] font-bold">Título da Foto (opcional):</label>
                    <input
                      type="text"
                      value={windowForm.title || ''}
                      onChange={(e) => setWindowForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Elevadores Alta Performance"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 text-[11px] font-bold">Legenda (opcional):</label>
                    <input
                      type="text"
                      value={windowForm.caption || ''}
                      onChange={(e) => setWindowForm((prev) => ({ ...prev, caption: e.target.value }))}
                      placeholder="Ex: Manutenção preventiva em campo"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                {/* 6. Link ao Clicar */}
                <div className="space-y-1">
                  <label className="text-slate-300 text-[11px] font-bold">Link de Destino ao Clicar (opcional):</label>
                  <input
                    type="text"
                    value={windowForm.linkUrl || ''}
                    onChange={(e) => setWindowForm((prev) => ({ ...prev, linkUrl: e.target.value }))}
                    placeholder="Ex: /dashboard/reparo ou https://..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Botões do Formulário */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsWindowFormOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWindow}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 hover:brightness-110 font-black text-xs text-white shadow-lg shadow-orange-500/25"
                  >
                    ✓ Salvar Janela de Foto
                  </button>
                </div>
              </div>
            )}

            {/* LISTA DE JANELAS ATIVAS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-white text-xs">
                  Janelas Configuradas ({config.photoWindows?.length || 0}):
                </label>
              </div>

              {(!config.photoWindows || config.photoWindows.length === 0) && (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-400 space-y-2">
                  <span className="text-3xl block">🪟</span>
                  <span className="font-bold text-white block">Nenhuma Janela Adicionada Ainda</span>
                  <p className="text-[11px] max-w-sm mx-auto">
                    Clique no botão "+ Nova Janela" acima para adicionar uma foto com tamanho e localização personalizada na página.
                  </p>
                </div>
              )}

              {config.photoWindows?.map((win, idx) => (
                <div
                  key={win.id}
                  className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 group hover:border-orange-500/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-700 bg-slate-950">
                      <Image
                        src={win.imageUrl}
                        alt={win.title || 'Foto'}
                        fill
                        unoptimized={win.imageUrl.startsWith('data:')}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-xs flex items-center gap-2">
                        <span>{win.title || 'Janela sem Título'}</span>
                        {win.enabled === false && (
                          <span className="text-[10px] text-rose-400 font-bold font-mono">
                            (Desativada)
                          </span>
                        )}
                      </h5>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-orange-400 font-mono font-bold uppercase">
                          {win.size}
                        </span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-medium">
                          {win.position}
                        </span>
                        {win.caption && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{win.caption}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleWindow(win.id)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition ${
                        win.enabled !== false
                          ? 'text-emerald-400 hover:bg-emerald-500/10'
                          : 'text-slate-500 hover:bg-slate-800'
                      }`}
                      title={win.enabled !== false ? 'Desativar Janela' : 'Ativar Janela'}
                    >
                      {win.enabled !== false ? '👁️' : '🚫'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveWindow(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                      title="Mover para cima"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveWindow(idx, 'down')}
                      disabled={idx === (config.photoWindows?.length || 0) - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30"
                      title="Mover para baixo"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditWindow(win)}
                      className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 font-bold"
                      title="Editar Janela"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWindow(win.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 font-bold"
                      title="Excluir Janela"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: TEXTOS & TIPOGRAFIA */}
        {/* ============================================================== */}
        {activeTab === 'textos' && (
          <div className="space-y-5">
            <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-purple-300">
              <span className="font-bold">Baseado em Modelo Referência 1:</span> Edite os títulos e
              frases de impacto corporativo com suporte a colchetes TKE.
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Badge do Topo (Hero)</label>
              <input
                type="text"
                value={config.hero.badgeText}
                onChange={(e) => updateHero({ badgeText: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Texto Superior dos Colchetes (Ex: WELCOME TO TKE)</label>
              <input
                type="text"
                value={config.hero.bracketTopText}
                onChange={(e) => updateHero({ bracketTopText: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Headline Principal (Em Caixa Alta)</label>
              <input
                type="text"
                value={config.hero.bracketHeadline}
                onChange={(e) => updateHero({ bracketHeadline: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Destaque em Gradiente (Subtítulo do Headline)</label>
              <input
                type="text"
                value={config.hero.titleHighlight}
                onChange={(e) => updateHero({ titleHighlight: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Parágrafo de Descrição Operacional</label>
              <textarea
                rows={3}
                value={config.hero.subtitle}
                onChange={(e) => updateHero({ subtitle: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none"
              />
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-bold text-white">Manifesto Institucional (Statement)</label>
                <input
                  type="checkbox"
                  checked={config.statement?.enabled}
                  onChange={(e) => updateStatement({ enabled: e.target.checked })}
                  className="rounded text-orange-500"
                />
              </div>
              <input
                type="text"
                value={config.statement?.headline || ''}
                onChange={(e) => updateStatement({ headline: e.target.value })}
                placeholder="Título do Manifesto"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
              <textarea
                rows={2}
                value={config.statement?.text || ''}
                onChange={(e) => updateStatement({ text: e.target.value })}
                placeholder="Texto do Manifesto"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white resize-none"
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: IMAGENS & LOGOS */}
        {/* ============================================================== */}
        {activeTab === 'imagens' && (
          <div className="space-y-5">
            <div className="p-3 bg-orange-950/20 border border-orange-500/30 rounded-xl text-orange-300">
              <span className="font-bold">Biblioteca Oficial TKE:</span> Alterne com 1 clique para as
              imagens reais da pasta "Imagens logos" ou use links diretos.
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Logo Principal (Canto Superior Esquerdo)</label>
              <div className="flex items-center gap-3">
                <div className="relative w-20 h-10 bg-white rounded-lg p-1 shrink-0 border border-slate-700">
                  <Image
                    src={config.topBar.logoUrl || '/images/imagem-3.webp'}
                    alt="Logo"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <input
                  type="text"
                  value={config.topBar.logoUrl}
                  onChange={(e) => updateTopBar({ logoUrl: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Banner Keyvisual (Centro do Hero)</label>
              <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden border border-slate-800">
                <Image
                  src={config.hero.bannerImageUrl || '/images/brand-keyvisual-1900px_image_w1900_h450.webp'}
                  alt="Banner"
                  fill
                  className="object-cover"
                />
              </div>
              <input
                type="text"
                value={config.hero.bannerImageUrl}
                onChange={(e) => updateHero({ bannerImageUrl: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>

            <div className="space-y-2 pt-2">
              <span className="font-bold text-slate-300 block">Atalhos da Biblioteca Oficial:</span>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_IMAGES.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => updateHero({ bannerImageUrl: img.url })}
                    className="p-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-left truncate flex items-center gap-2"
                  >
                    <span className="text-orange-400 font-bold">↳</span>
                    <span className="truncate text-slate-200">{img.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: VÍDEOS */}
        {/* ============================================================== */}
        {activeTab === 'videos' && (
          <div className="space-y-5">
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-rose-300">
              <span className="font-bold">Player com Colchetes Angulares TKE:</span> Configure o vídeo
              institucional do YouTube ou MP4 com capa e títulos em caixa alta.
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="font-bold text-white">Exibir Seção de Vídeo na Home</span>
              <input
                type="checkbox"
                checked={config.videoSection?.enabled}
                onChange={(e) => updateVideoSection({ enabled: e.target.checked })}
                className="rounded text-orange-500"
              />
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">URL do Vídeo (YouTube embed ou MP4)</label>
              <input
                type="text"
                value={config.videoSection?.videoUrl || ''}
                onChange={(e) => updateVideoSection({ videoUrl: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Capa do Vídeo (Poster Image)</label>
              <input
                type="text"
                value={config.videoSection?.posterUrl || ''}
                onChange={(e) => updateVideoSection({ posterUrl: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Título Principal do Vídeo</label>
              <input
                type="text"
                value={config.videoSection?.title || ''}
                onChange={(e) => updateVideoSection({ title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="space-y-3">
              <label className="font-bold text-white block">Subtítulo / Descrição</label>
              <input
                type="text"
                value={config.videoSection?.subtitle || ''}
                onChange={(e) => updateVideoSection({ subtitle: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <button
              type="button"
              onClick={onOpenVideo}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition flex items-center justify-center gap-2"
            >
              <span>▶</span> Testar Player de Vídeo Agora
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: BOTÕES & MENUS */}
        {/* ============================================================== */}
        {activeTab === 'botoes' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">Botões de Ação do Hero (CTA)</span>
              <button
                type="button"
                onClick={addHeroButton}
                className="px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
              >
                + Adicionar Botão
              </button>
            </div>

            <div className="space-y-3">
              {config.hero.ctaButtons?.map((btn, idx) => (
                <div key={btn.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-400">Botão #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeHeroButton(idx)}
                      className="text-rose-400 hover:text-rose-300 font-bold"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={btn.label}
                      onChange={(e) => updateHeroButton(idx, { label: e.target.value })}
                      placeholder="Nome do botão"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white"
                    />
                    <select
                      value={btn.variant}
                      onChange={(e) => updateHeroButton(idx, { variant: e.target.value as any })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white"
                    >
                      <option value="gradient">Gradiente TKE</option>
                      <option value="purple">Púrpura #6E2594</option>
                      <option value="dark">Dark Slate</option>
                      <option value="outline">Borda Laranja</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={btn.actionType || 'link'}
                      onChange={(e) => updateHeroButton(idx, { actionType: e.target.value as any })}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white"
                    >
                      <option value="link">Abrir Link (href)</option>
                      <option value="emitirPt">Emitir PT / APR Digital</option>
                      <option value="registerUser">Cadastrar Usuário</option>
                      <option value="quickRepair">Abrir Chamado Rápido</option>
                    </select>

                    <input
                      type="text"
                      value={btn.href}
                      onChange={(e) => updateHeroButton(idx, { href: e.target.value })}
                      placeholder="Link de destino"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: BLOCOS CUSTOMIZADOS */}
        {/* ============================================================== */}
        {activeTab === 'blocos' && (
          <div className="space-y-5">
            <span className="font-bold text-white block">Adicionar Novo Bloco à Página:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => addCustomBlock('text')}
                className="p-3 bg-slate-900 border border-slate-800 hover:border-orange-500 rounded-xl text-left"
              >
                <div className="font-bold text-white">📝 Bloco de Texto</div>
                <div className="text-[10px] text-slate-400">Título e conteúdo com colchetes</div>
              </button>

              <button
                type="button"
                onClick={() => addCustomBlock('image')}
                className="p-3 bg-slate-900 border border-slate-800 hover:border-orange-500 rounded-xl text-left"
              >
                <div className="font-bold text-white">🖼️ Imagem com Moldura</div>
                <div className="text-[10px] text-slate-400">Foto institucional com legenda</div>
              </button>

              <button
                type="button"
                onClick={() => addCustomBlock('video')}
                className="p-3 bg-slate-900 border border-slate-800 hover:border-orange-500 rounded-xl text-left"
              >
                <div className="font-bold text-white">🎥 Banner de Vídeo</div>
                <div className="text-[10px] text-slate-400">Card com botão de reprodução</div>
              </button>

              <button
                type="button"
                onClick={() => addCustomBlock('actionCard')}
                className="p-3 bg-slate-900 border border-slate-800 hover:border-orange-500 rounded-xl text-left"
              >
                <div className="font-bold text-white">⚡ Card de Ação Rápida</div>
                <div className="text-[10px] text-slate-400">Emissão de PT ou Cadastro</div>
              </button>
            </div>

            <div className="space-y-3 pt-3">
              <span className="font-bold text-white block">
                Blocos Ativos ({config.customBlocks?.length || 0}):
              </span>
              {config.customBlocks?.map((blk, idx) => (
                <div
                  key={blk.id}
                  className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-white text-xs block">
                      Bloco #{idx + 1} ({blk.type})
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {'title' in blk ? blk.title : 'Bloco Custom'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomBlock(idx)}
                    className="text-rose-400 hover:text-rose-300 font-bold"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: AÇÕES RÁPIDAS */}
        {/* ============================================================== */}
        {activeTab === 'acoes' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-300">
              <span className="font-bold">Ações Instantâneas Integradas:</span> Execute as ações do
              sistema diretamente da plataforma de desenvolvimento.
            </div>

            <button
              type="button"
              onClick={onOpenUserRegister}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-900/60 to-purple-700/60 border border-purple-500/50 hover:brightness-110 text-left font-bold flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <div>
                  <div className="text-white text-sm">Cadastrar Novo Usuário TKE</div>
                  <span className="text-xs text-purple-200 font-normal">
                    Adicionar novos colaboradores, técnicos e subcontratados imediatamente
                  </span>
                </div>
              </div>
              <span className="text-purple-300 group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <button
              type="button"
              onClick={onOpenQuickRepair}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-orange-950/60 to-orange-700/60 border border-orange-500/50 hover:brightness-110 text-left font-bold flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <div className="text-white text-sm">Solicitar Reparo / Abrir Chamado</div>
                  <span className="text-xs text-orange-200 font-normal">
                    Abertura ágil de chamado com foto e prioridade operacional
                  </span>
                </div>
              </div>
              <span className="text-orange-300 group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <a
              href="/dashboard/reparo/pt"
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 hover:border-orange-500 text-left font-bold flex items-center justify-between transition group block"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🛡️</span>
                <div>
                  <div className="text-white text-sm">Emitir PT / APR Digital</div>
                  <span className="text-xs text-slate-300 font-normal">
                    Permissão de trabalho com assinatura digital e fotos no Google Drive
                  </span>
                </div>
              </div>
              <span className="text-slate-300 group-hover:translate-x-1 transition-transform">→</span>
            </a>
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: SALVAR & BACKUP */}
        {/* ============================================================== */}
        {activeTab === 'salvar' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <h4 className="font-extrabold text-white text-sm">Persistência da Home & Tema Global</h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                Ao clicar em "Salvar", suas alterações são gravadas diretamente no servidor em{' '}
                <code className="text-orange-400">src/data/homeConfig.json</code> e sincronizadas com
                o armazenamento local do navegador, garantindo que todo o sistema utilize a nova configuração!
              </p>
            </div>

            {saveStatus && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs font-bold animate-fadeIn">
                ✓ {saveStatus}
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 hover:brightness-110 font-black text-sm text-white shadow-xl shadow-orange-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gravando na Aplicação...
                </>
              ) : (
                <>
                  <span>💾</span> Salvar Todas as Alterações na Aplicação
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja restaurar a página inicial para o padrão oficial TKE com fundo branco moderno?')) {
                  onResetToDefault();
                  applySystemTheme(DEFAULT_THEME_CONFIG);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold transition text-xs"
            >
              🔄 Restaurar Padrão TKE Oficial (Fundo Branco Moderno)
            </button>
          </div>
        )}
      </div>

      {/* Rodapé Fixo do Studio DEV */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
        <span className="text-slate-400">TKE Studio v{config.version || 1} • {currentTheme.paletteId}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Fechar Painel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold transition disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
