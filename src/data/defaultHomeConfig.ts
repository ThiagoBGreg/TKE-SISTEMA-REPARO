import { HomeConfig } from '@/types/homeConfig';
import { DEFAULT_THEME_CONFIG } from '@/data/colorPalettes';

export const DEFAULT_HOME_CONFIG: HomeConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Thiago Gregorio (DEV)',
  theme: 'light',
  themeConfig: DEFAULT_THEME_CONFIG,
  photoWindows: [],

  topBar: {
    logoUrl: '/images/imagem-3.webp',
    logoAlt: 'TKE Move Beyond Oficial',
    brandName: 'TK ELEVATOR GLOBAL',
    brandSlogan: 'Padrão Move Beyond de Engenharia e Reparo',
    systemTitle: 'SISTEMA REPARO',
    systemTag: 'REPAROS',
    subTitle: 'Move Beyond • Gestão de APR',
    utilityLinks: [
      { label: 'Portal Corporativo', href: 'https://www.tkelevator.com' },
      { label: 'Segurança OSH', href: '/dashboard/osh' },
      { label: 'Logística DLOG', href: '/dashboard/dlog' },
      { label: 'Brasil (PT-BR)', href: '/' },
    ],
    navButtons: [
      {
        id: 'nav-servicos',
        label: 'Ordens de Serviço',
        href: '/dashboard/reparo',
        variant: 'ghost',
        actionType: 'link',
      },
      {
        id: 'nav-emitir-pt',
        label: 'Emitir PT / APR',
        href: '/dashboard/reparo/pt',
        variant: 'dark',
        icon: '🛡️',
        actionType: 'emitirPt',
      },
      {
        id: 'nav-cadastrar-user',
        label: 'Cadastrar Usuário',
        href: '#cadastro',
        variant: 'outline',
        icon: '👤',
        actionType: 'registerUser',
      },
      {
        id: 'nav-prestador',
        label: 'Portal Prestador',
        href: '/dashboard/subcontratado/historico',
        variant: 'ghost',
        icon: '💼',
        actionType: 'link',
      },
      {
        id: 'nav-painel',
        label: 'Acessar Painel',
        href: '/dashboard',
        variant: 'gradient',
        icon: '→',
        actionType: 'link',
      },
    ],
  },

  hero: {
    badgeText: 'TKE MOVE BEYOND • Padrão Global de Engenharia & Segurança',
    bracketTopText: 'WELCOME TO TKE',
    bracketHeadline: 'WE MOVE BEYOND TO ELEVATE URBAN LIVING',
    titleHighlight: 'Serviços de Reparo & Emissão de PT',
    subtitle:
      'Fluxo digital completo e integrado: emissão de Permissão de Trabalho (PT/APR), assinaturas digitais com geolocalização em tempo real, controle rigoroso de riscos NR-10, NR-18 e NR-35.',
    bannerImageUrl: '/images/brand-keyvisual-1900px_image_w1900_h450.webp',
    bannerLabel: 'Padrão Global de Engenharia & Segurança',
    bannerSub: 'Controle Rigoroso de Riscos • NR-10, NR-18 e NR-35',
    ctaButtons: [
      {
        id: 'cta-solicitar-reparo',
        label: 'Solicitar Reparo / Abrir Chamado',
        href: '#abrir-chamado',
        variant: 'gradient',
        icon: '⚡',
        actionType: 'quickRepair',
      },
      {
        id: 'cta-emitir-pt',
        label: 'Emitir PT / APR Digital',
        href: '/dashboard/reparo/pt',
        variant: 'dark',
        icon: '✍️',
        actionType: 'emitirPt',
      },
      {
        id: 'cta-cadastrar-user',
        label: 'Cadastrar Usuário TKE',
        href: '#cadastro',
        variant: 'purple',
        icon: '👤',
        actionType: 'registerUser',
      },
      {
        id: 'cta-portal-prestador',
        label: 'Portal do Prestador',
        href: '/dashboard/subcontratado/historico',
        variant: 'outline',
        icon: '💼',
        actionType: 'link',
      },
    ],
  },

  subBar: {
    enabled: true,
    items: [
      { id: 'sub-reparo', label: 'Ordens de Serviço', href: '/dashboard/reparo' },
      { id: 'sub-pt', label: 'Emissão de PT/APR', href: '/dashboard/reparo/pt' },
      { id: 'sub-acompanha', label: 'Acompanhamento Tempo Real', href: '/dashboard/reparo/acompanhamento' },
      { id: 'sub-osh', label: 'Laudos & Segurança (OSH)', href: '/dashboard/osh' },
      { id: 'sub-dlog', label: 'Logística de Peças (DLOG)', href: '/dashboard/dlog' },
      { id: 'sub-pagamentos', label: 'Pagamentos Subcontratados', href: '/dashboard/pagamentos' },
      { id: 'sub-usuarios', label: 'Gestão de Usuários', href: '/dashboard/usuarios' },
    ],
    ctaButton: {
      label: 'Novo Chamado ↗',
      href: '#abrir-chamado',
      actionType: 'quickRepair',
    },
  },

  statement: {
    enabled: true,
    headline: 'We improve the quality of urban life around the world through our passion for moving people.',
    highlightText: 'Pioneirismo em engenharia, segurança e tecnologia operacional.',
    text:
      'A TK Elevator (TKE) combina segurança, confiabilidade e inovação em soluções de engenharia de precisão para garantir a mobilidade contínua e segura de milhares de pessoas todos os dias.',
  },

  videoSection: {
    enabled: true,
    title: 'MOVE BEYOND',
    subtitle: 'Watch our video now!',
    bracketTitle: 'BEYOND AMBITION, THERE IS DESIGN',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // ou vídeo corporativo TKE
    posterUrl: '/images/modelo-referencia-1.png',
  },

  featuresGrid: {
    enabled: true,
    title: 'Soluções Operacionais & Especialidades',
    subtitle: 'Departamentos integrados em uma plataforma digital única',
    cards: [
      {
        id: 'feat-reparo',
        title: 'Reparo & Modernização',
        description: 'Ordens de serviço de alta complexidade, troca de cabos de tração, máquinas e operadores.',
        tag: 'DEPARTAMENTO REPARO',
        imageUrl: '/images/modelo-referencia-1.png',
        href: '/dashboard/reparo',
        badgeColor: 'border-orange-500/30 text-orange-400 bg-orange-950/20',
      },
      {
        id: 'feat-pt',
        title: 'Permissão de Trabalho & APR',
        description: 'Fluxo digital com assinaturas de segurança, fotos de campo no Google Drive e conformidade regulatória.',
        tag: 'SEGURANÇA DO TRABALHO',
        imageUrl: '/images/brand-keyvisual-1900px_image_w1900_h450.webp',
        href: '/dashboard/reparo/pt',
        badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-950/20',
      },
      {
        id: 'feat-osh',
        title: 'Auditoria & Gestão OSH',
        description: 'Validação técnica imediata de trabalho em altura (NR-35), eletricidade (NR-10) e construção (NR-18).',
        tag: 'OSH GLOBAL',
        imageUrl: '/images/modelo-referencia-2.png',
        href: '/dashboard/osh',
        badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-950/20',
      },
      {
        id: 'feat-dlog',
        title: 'Logística & Despacho DLOG',
        description: 'Rastreamento de peças, rotas de motoristas e entrega expressa de componentes críticos.',
        tag: 'DLOG LOGÍSTICA',
        imageUrl: '/images/imagem-2.png',
        href: '/dashboard/dlog',
        badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
      },
    ],
  },

  customBlocks: [],

  footer: {
    logoUrl: '/images/imagem-3.webp',
    copyrightText: '© 2026 TK Elevator Brasil • Sistema de Gestão de Reparo & APR • Move Beyond',
    links: [
      { label: 'Visão Geral', href: '/dashboard' },
      { label: 'Solicitação de Serviços', href: '/dashboard/reparo' },
      { label: 'Permissões (PT/APR)', href: '/dashboard/reparo/pt' },
      { label: 'Portal do Prestador', href: '/dashboard/subcontratado/historico' },
      { label: 'Gestão de Usuários (DEV)', href: '/dashboard/usuarios' },
      { label: 'Política de Privacidade', href: '#' },
    ],
  },
};
