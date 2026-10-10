import { SystemThemeConfig } from '@/types/homeConfig';

export interface ColorPalettePreset {
  id: string;
  name: string;
  description: string;
  bgColor: string;
  textColor: string;
  cardBgColor: string;
  borderColor: string;
  accentColor: string;
  isDark: boolean;
  tag: string;
}

export const COLOR_PALETTE_PRESETS: ColorPalettePreset[] = [
  {
    id: 'white-modern',
    name: 'Branco Moderno TKE (Padrão)',
    description: 'Visual corporativo internacional, clean, luminoso e refinado.',
    bgColor: '#ffffff',
    textColor: '#0f172a',
    cardBgColor: '#ffffff',
    borderColor: '#e2e8f0',
    accentColor: '#ff5e00',
    isDark: false,
    tag: 'Oficial',
  },
  {
    id: 'ice-clean',
    name: 'Ice Minimalista Clean',
    description: 'Fundo cinza suave ultra-elegante com máximo contraste e clareza.',
    bgColor: '#f8fafc',
    textColor: '#020617',
    cardBgColor: '#ffffff',
    borderColor: '#e2e8f0',
    accentColor: '#ff5e00',
    isDark: false,
    tag: 'Claro',
  },
  {
    id: 'warm-cream',
    name: 'Marfim & Areia Corporativo',
    description: 'Tons contemporâneos aquecidos com tipografia sofisticada.',
    bgColor: '#fafaf9',
    textColor: '#1c1917',
    cardBgColor: '#ffffff',
    borderColor: '#e7e5e4',
    accentColor: '#ea580c',
    isDark: false,
    tag: 'Acolhedor',
  },
  {
    id: 'slate-blue-light',
    name: 'Azul Polar Tech',
    description: 'Fundo suavemente azulado, ideal para operações e engenharia.',
    bgColor: '#f0f9ff',
    textColor: '#082f49',
    cardBgColor: '#ffffff',
    borderColor: '#bae6fd',
    accentColor: '#0284c7',
    isDark: false,
    tag: 'Engenharia',
  },
  {
    id: 'dark-executive',
    name: 'Dark Executivo Slate',
    description: 'Ambiente escuro profissional com acabamentos em ardósia nobre.',
    bgColor: '#0f172a',
    textColor: '#f8fafc',
    cardBgColor: '#1e293b',
    borderColor: '#334155',
    accentColor: '#ff5e00',
    isDark: true,
    tag: 'Dark',
  },
  {
    id: 'tke-deep-space',
    name: 'TKE Move Beyond Profundo',
    description: 'Preto tecnológico com realces neon laranja e roxo vibrantes.',
    bgColor: '#090d16',
    textColor: '#ffffff',
    cardBgColor: '#0f172a',
    borderColor: '#1e293b',
    accentColor: '#ff5e00',
    isDark: true,
    tag: 'High-Tech',
  },
  {
    id: 'purple-royal',
    name: 'Púrpura TKE Noturno',
    description: 'Tons nobres de ametista com realces magenta e ouro.',
    bgColor: '#170b24',
    textColor: '#faf5ff',
    cardBgColor: '#24103b',
    borderColor: '#3b1a62',
    accentColor: '#f43f5e',
    isDark: true,
    tag: 'Institucional',
  },
];

export const DEFAULT_THEME_CONFIG: SystemThemeConfig = {
  paletteId: 'white-modern',
  bgColor: '#ffffff',
  textColor: '#0f172a',
  cardBgColor: '#ffffff',
  borderColor: '#e2e8f0',
  accentColor: '#ff5e00',
  isDark: false,
};

export const THEME_STORAGE_KEY = 'tke_system_theme';

/**
 * Aplica as variáveis CSS do tema globalmente no elemento root e no body.
 * Isso garante que todas as telas, rotas e componentes reajam instantaneamente.
 */
export function applySystemTheme(theme: SystemThemeConfig) {
  if (typeof window === 'undefined') return;

  try {
    const root = document.documentElement;
    root.style.setProperty('--sys-bg', theme.bgColor);
    root.style.setProperty('--sys-text', theme.textColor);
    root.style.setProperty('--sys-card-bg', theme.cardBgColor || (theme.isDark ? '#1e293b' : '#ffffff'));
    root.style.setProperty('--sys-border', theme.borderColor || (theme.isDark ? '#334155' : '#e2e8f0'));
    root.style.setProperty('--sys-accent', theme.accentColor || '#ff5e00');

    document.body.style.backgroundColor = theme.bgColor;
    document.body.style.color = theme.textColor;
    root.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');

    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));

    window.dispatchEvent(
      new CustomEvent('tke_theme_change', {
        detail: theme,
      })
    );
  } catch (err) {
    console.warn('[applySystemTheme] Erro ao aplicar tema global:', err);
  }
}

/**
 * Recupera o tema atual do localStorage ou retorna o padrão branco.
 */
export function getStoredSystemTheme(): SystemThemeConfig {
  if (typeof window === 'undefined') return DEFAULT_THEME_CONFIG;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.bgColor === 'string') {
        return {
          ...DEFAULT_THEME_CONFIG,
          ...parsed,
        };
      }
    }
  } catch {
    // fallback
  }

  return DEFAULT_THEME_CONFIG;
}
