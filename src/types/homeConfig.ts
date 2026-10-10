export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'gradient' | 'dark' | 'purple' | 'ghost';
export type ActionType = 'link' | 'quickRepair' | 'registerUser' | 'emitirPt' | 'openDev';

export interface NavButtonConfig {
  id: string;
  label: string;
  href: string;
  variant: ButtonVariant;
  icon?: string;
  actionType?: ActionType;
}

export interface FeatureCardConfig {
  id: string;
  title: string;
  description: string;
  tag: string;
  imageUrl: string;
  href: string;
  badgeColor?: string;
}

export interface CustomBlockText {
  id: string;
  type: 'text';
  title: string;
  subtitle?: string;
  content: string;
  align: 'left' | 'center' | 'right';
  showBrackets?: boolean;
  gradientTitle?: boolean;
}

export interface CustomBlockImage {
  id: string;
  type: 'image';
  title?: string;
  caption?: string;
  imageUrl: string;
  href?: string;
  showBrackets?: boolean;
  aspectRatio?: 'video' | 'banner' | 'square' | 'auto';
}

export interface CustomBlockVideo {
  id: string;
  type: 'video';
  title: string;
  subtitle: string;
  videoUrl: string;
  posterUrl: string;
  showBrackets?: boolean;
}

export interface CustomBlockButtons {
  id: string;
  type: 'buttons';
  title?: string;
  description?: string;
  buttons: NavButtonConfig[];
}

export interface CustomBlockActionCard {
  id: string;
  type: 'actionCard';
  title: string;
  description: string;
  actionType: 'registerUser' | 'emitirPt' | 'quickRepair';
  badge: string;
  buttonLabel: string;
}

export type CustomHomeBlock =
  | CustomBlockText
  | CustomBlockImage
  | CustomBlockVideo
  | CustomBlockButtons
  | CustomBlockActionCard;

export type PhotoWindowSize = 'sm' | 'md' | 'lg' | 'full' | 'banner';
export type PhotoWindowPosition =
  | 'top'
  | 'hero'
  | 'middle'
  | 'floating-right'
  | 'floating-left'
  | 'bottom';

export type PhotoWindowAspectRatio = 'auto' | '16/9' | '4/3' | '1/1' | '21/9' | '3/4';

export interface PhotoWindowConfig {
  id: string;
  title?: string;
  caption?: string;
  imageUrl: string;
  size: PhotoWindowSize;
  position: PhotoWindowPosition;
  aspectRatio?: PhotoWindowAspectRatio;
  borderStyle?: 'modern' | 'brackets' | 'glass' | 'neon';
  linkUrl?: string;
  enabled?: boolean;
}

export interface SystemThemeConfig {
  paletteId: string;
  bgColor: string;
  textColor: string;
  cardBgColor: string;
  borderColor: string;
  accentColor: string;
  isDark: boolean;
}

export interface HomeConfig {
  version: number;
  updatedAt: string;
  updatedBy: string;
  theme: 'dark' | 'light';
  themeConfig?: SystemThemeConfig;
  photoWindows?: PhotoWindowConfig[];

  topBar: {
    logoUrl: string;
    logoAlt: string;
    systemTag: string;
    subTitle: string;
    utilityLinks: Array<{ label: string; href: string }>;
    navButtons: NavButtonConfig[];
  };

  hero: {
    badgeText: string;
    bracketTopText: string;
    bracketHeadline: string;
    titleHighlight: string;
    subtitle: string;
    bannerImageUrl: string;
    bannerLabel: string;
    bannerSub: string;
    ctaButtons: NavButtonConfig[];
  };

  subBar: {
    enabled: boolean;
    items: Array<{ id: string; label: string; href: string }>;
    ctaButton: {
      label: string;
      href: string;
      actionType?: ActionType;
    };
  };

  statement: {
    enabled: boolean;
    headline: string;
    highlightText: string;
    text: string;
  };

  videoSection: {
    enabled: boolean;
    title: string;
    subtitle: string;
    videoUrl: string;
    posterUrl: string;
    bracketTitle?: string;
  };

  featuresGrid: {
    enabled: boolean;
    title: string;
    subtitle?: string;
    cards: FeatureCardConfig[];
  };

  customBlocks: CustomHomeBlock[];
  footer: {
    logoUrl: string;
    copyrightText: string;
    links: Array<{ label: string; href: string }>;
  };
}

