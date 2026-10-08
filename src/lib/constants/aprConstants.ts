import type { AprRiskCategoryConfig, AprEpiConfig } from '@/db/schema';

export const DEFAULT_APR_CATEGORIES: AprRiskCategoryConfig[] = [
  {
    id: 'ALTURA',
    titulo: '7.1 Trabalho em Altura (NR-35)',
    descricao: 'Atividades com risco de queda em altura igual ou superior a 2,00m do nível inferior.',
    ativo: true,
    itens: [
      { id: '7.1', label: 'Há sinalizações instaladas nos pavimentos?', obrigatorio: true, ativo: true },
      { id: '7.2', label: 'Existem dispositivos para ancoragem disponíveis?', obrigatorio: true, ativo: true },
      { id: '7.3', label: 'Andaime tipo mão francesa/tubular em boas condições?', obrigatorio: true, ativo: true },
      { id: '7.4', label: 'Existem proteções coletivas contra quedas na casa de máquinas?', obrigatorio: true, ativo: true },
      { id: '7.5', label: 'O ambiente de trabalho oferece condições seguras no entorno?', obrigatorio: true, ativo: true },
    ],
  },
  {
    id: 'ICAMENTO',
    titulo: '7.2 Içamento de Materiais e Cargas (NR-11 / NR-12)',
    descricao: 'Movimentação vertical e horizontal de componentes mecânicos pesados (motores, cabos, contra-peso).',
    ativo: true,
    itens: [
      { id: '7.6', label: 'Equipamentos de içamento adequados à carga?', obrigatorio: true, ativo: true },
      { id: '7.7', label: 'Acessórios de içamento disponíveis são adequados?', obrigatorio: true, ativo: true },
      { id: '7.8', label: 'Ganchos atestados e com marcação de carga legível?', obrigatorio: true, ativo: true },
      { id: '7.9', label: 'Há redundância na amarração da cabine/cabos?', obrigatorio: true, ativo: true },
      { id: '7.10', label: 'Área de projeção do içamento devidamente isolada e sinalizada?', obrigatorio: true, ativo: true },
      { id: '7.11', label: 'Há recursos de comunicação claros entre os membros da equipe?', obrigatorio: true, ativo: true },
    ],
  },
  {
    id: 'ELETRICA',
    titulo: '7.3 Circuitos Elétricos e Bloqueio LOTO (NR-10)',
    descricao: 'Intervenções em quadros elétricos de força, manobras, botoeiras e fiações energizadas.',
    ativo: true,
    itens: [
      { id: '7.12', label: 'Fiações elétricas isoladas na casa de máquinas/caixa?', obrigatorio: true, ativo: true },
      { id: '7.13', label: 'Conferido aterramento e disjuntor DR no quadro de força?', obrigatorio: true, ativo: true },
      { id: '7.14', label: 'Trabalhadores possuem kit bloqueio elétrico (LOTO)?', obrigatorio: true, ativo: true },
      { id: '7.15', label: 'Atividade exige bloqueio elétrico e teste de ausência de tensão?', obrigatorio: true, ativo: true },
      { id: '7.16', label: 'Há infiltrações (casa de máquinas, caixa de corrida ou poço)?', obrigatorio: true, ativo: true },
    ],
  },
  {
    id: 'QUENTE',
    titulo: '7.4 Trabalho a Quente e Inflamáveis (NR-18 / NR-34)',
    descricao: 'Operações de solda, lixamento, corte ou maçarico com desprendimento de fagulhas.',
    ativo: true,
    itens: [
      { id: '7.17', label: 'Local de trabalho está devidamente isolado com biombo antichama?', obrigatorio: true, ativo: true },
      { id: '7.18', label: 'Livre de materiais combustíveis que possam causar princípio de incêndio?', obrigatorio: true, ativo: true },
      { id: '7.19', label: 'Equipamentos de combate a incêndio (extintores) próximos ao local?', obrigatorio: true, ativo: true },
      { id: '7.20', label: 'Trabalhadores possuem capacitação técnica comprovada em trabalho a quente?', obrigatorio: true, ativo: true },
    ],
  },
  {
    id: 'CONFINADO',
    titulo: '7.5 Espaço Confinado e Poço do Elevador (NR-33)',
    descricao: 'Trabalhos em poço de corrida com ventilação limitada ou acesso restrito.',
    ativo: true,
    itens: [
      { id: '7.21', label: 'Área com ventilação e iluminação adequadas?', obrigatorio: true, ativo: true },
      { id: '7.22', label: 'Vigia e comunicação externa estabelecidos?', obrigatorio: true, ativo: true },
      { id: '7.23', label: 'Equipamentos de resgate e emergência prontos para acionamento?', obrigatorio: true, ativo: true },
    ],
  },
];

export const DEFAULT_EPIS: AprEpiConfig[] = [
  { id: 'capacete', nome: 'Capacete de segurança com jugular', categoria: 'BASICO', obrigatorioPadrao: true, ativo: true },
  { id: 'botina', nome: 'Botina de segurança com bico de composite', categoria: 'BASICO', obrigatorioPadrao: true, ativo: true },
  { id: 'oculos', nome: 'Óculos de proteção contra impactos', categoria: 'BASICO', obrigatorioPadrao: true, ativo: true },
  { id: 'protetor_auricular', nome: 'Protetor auricular tipo concha / plug', categoria: 'BASICO', obrigatorioPadrao: true, ativo: true },
  { id: 'cinto_paraquedista', nome: 'Cinto de segurança tipo paraquedista com talabarte duplo', categoria: 'ALTURA', obrigatorioPadrao: true, ativo: true },
  { id: 'trava_quedas', nome: 'Trava-quedas para cabo de aço / corda', categoria: 'ALTURA', obrigatorioPadrao: true, ativo: true },
  { id: 'linha_vida', nome: 'Linha de vida vertical/horizontal homologada', categoria: 'ALTURA', obrigatorioPadrao: true, ativo: true },
  { id: 'luva_mecanica', nome: 'Luva de vaqueta / risco mecânico', categoria: 'BASICO', obrigatorioPadrao: true, ativo: true },
  { id: 'luva_eletrica', nome: 'Luva isolante de borracha para alta tensão', categoria: 'ELETRICA', obrigatorioPadrao: false, ativo: true },
  { id: 'mascara_solda', nome: 'Máscara de solda com filtro e blusão de raspa', categoria: 'QUENTE', obrigatorioPadrao: false, ativo: true },
  { id: 'respirador', nome: 'Respirador PFF2 contra poeiras e fumos', categoria: 'ESPECIAL', obrigatorioPadrao: false, ativo: true },
];

export const DEFAULT_REGRAS_DE_OURO: string[] = [
  '1. Somente inicie o trabalho com a PT e APR liberadas, preenchidas e assinadas pela equipe.',
  '2. Não execute trabalho em altura sem os dispositivos de ancoragem e talabarte duplo conectados.',
  '3. Realize sempre o bloqueio mecânico da cabine e contrapeso antes de intervir no sistema de tração.',
  '4. Desenergize o equipamento e aplique o kit LOTO (cadeado e etiqueta) antes de intervir na elétrica.',
  '5. É terminantemente proibido burlar circuitos de segurança, trincos de porta ou chaves de limite.',
];
