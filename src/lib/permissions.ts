import { Department, UserRole } from '@/db/schema';
import { AppAction, AppResource, AuthUser } from '@/types/auth';

/**
 * Tipo que mapeia Recursos para um array de Ações permitidas
 */
export type ResourcePermissions = Partial<Record<AppResource, readonly AppAction[]>>;

/**
 * Matriz de Permissões granular por Departamento e Cargo
 */
export const PERMISSIONS_MATRIX: Record<
  Department,
  Partial<Record<UserRole, ResourcePermissions>>
> = {
  // =========================================================================
  // DEPARTAMENTO: REPARO
  // =========================================================================
  REPARO: {
    GESTOR: {
      ORDENS_SERVICO: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN_TECHNICAL', 'VALIDATE_TECHNICAL'],
      OSH_SEGURANCA: ['VIEW'],
      DLOG_LOGISTICA: ['VIEW'],
      PAGAMENTOS_SUBCONTRATADOS: ['VIEW', 'EDIT'],
      SERVICOS_COMERCIAIS: ['VIEW'],
      GESTAO_USUARIOS: ['VIEW', 'CREATE', 'EDIT'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    SUPERVISOR: {
      ORDENS_SERVICO: ['VIEW', 'CREATE', 'EDIT', 'ASSIGN_TECHNICAL', 'VALIDATE_TECHNICAL'],
      OSH_SEGURANCA: ['VIEW'],
      DLOG_LOGISTICA: ['VIEW'],
      PAGAMENTOS_SUBCONTRATADOS: ['VIEW'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    ADMINISTRATIVO: {
      ORDENS_SERVICO: ['VIEW', 'CREATE', 'EDIT'],
      DLOG_LOGISTICA: ['VIEW'],
      PAGAMENTOS_SUBCONTRATADOS: ['VIEW', 'CREATE'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    ESTAGIARIO: {
      ORDENS_SERVICO: ['VIEW', 'CREATE'],
      DLOG_LOGISTICA: ['VIEW'],
    },
    APRENDIZ: {
      ORDENS_SERVICO: ['VIEW'],
    },
    SUBCONTRATADO: {
      ORDENS_SERVICO: ['VIEW', 'EDIT'], // Edita status de execução e anexa laudos de campo
    },
  },

  // =========================================================================
  // DEPARTAMENTO: SERVIÇOS
  // =========================================================================
  SERVICOS: {
    GERENTE: {
      ORDENS_SERVICO: ['VIEW'],
      SERVICOS_COMERCIAIS: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
      RELATORIOS_AUDITORIA: ['VIEW'],
      GESTAO_USUARIOS: ['VIEW'],
    },
    COORDENADOR: {
      ORDENS_SERVICO: ['VIEW'],
      SERVICOS_COMERCIAIS: ['VIEW', 'CREATE', 'EDIT'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    GESTOR: {
      ORDENS_SERVICO: ['VIEW'],
      SERVICOS_COMERCIAIS: ['VIEW', 'CREATE', 'EDIT'],
    },
    SUPERVISOR: {
      ORDENS_SERVICO: ['VIEW'],
      SERVICOS_COMERCIAIS: ['VIEW', 'EDIT'],
    },
    CONSULTOR_COMERCIAL: {
      SERVICOS_COMERCIAIS: ['VIEW', 'CREATE', 'EDIT'],
    },
    TECNICO: {
      ORDENS_SERVICO: ['VIEW', 'EDIT'], // Preenche checklist técnico de campo
      SERVICOS_COMERCIAIS: ['VIEW'],
    },
  },

  // =========================================================================
  // DEPARTAMENTO: OSH (Occupational Safety & Health / Segurança do Trabalho)
  // =========================================================================
  OSH: {
    COORDENADOR: {
      ORDENS_SERVICO: ['VIEW'],
      OSH_SEGURANCA: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE_OSH'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    TECNICO_SEGURANCA: {
      ORDENS_SERVICO: ['VIEW'],
      OSH_SEGURANCA: ['VIEW', 'CREATE', 'EDIT', 'APPROVE_OSH'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    ADMINISTRATIVO: {
      ORDENS_SERVICO: ['VIEW'],
      OSH_SEGURANCA: ['VIEW', 'CREATE', 'EDIT'],
    },
  },

  // =========================================================================
  // DEPARTAMENTO: DLOG (Logística & Transporte)
  // =========================================================================
  DLOG: {
    ADMINISTRATIVO: {
      ORDENS_SERVICO: ['VIEW'],
      DLOG_LOGISTICA: ['VIEW', 'CREATE', 'EDIT', 'ASSIGN_LOGISTICS', 'DISPATCH_DRIVER'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    MOTORISTA: {
      ORDENS_SERVICO: ['VIEW'],
      DLOG_LOGISTICA: ['VIEW', 'EDIT'], // Atualiza status de entrega / rota em trânsito
    },
  },

  // =========================================================================
  // DEPARTAMENTO: ADMINISTRATIVO
  // =========================================================================
  ADMINISTRATIVO: {
    ADMINISTRATIVO: {
      ORDENS_SERVICO: ['VIEW'],
      PAGAMENTOS_SUBCONTRATADOS: ['VIEW', 'CREATE', 'EDIT'],
      GESTAO_USUARIOS: ['VIEW', 'CREATE', 'EDIT'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    PAGAMENTO_SUBCONTRATADO: {
      ORDENS_SERVICO: ['VIEW'],
      PAGAMENTOS_SUBCONTRATADOS: ['VIEW', 'CREATE', 'EDIT', 'PROCESS_PAYMENT'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
    DEV: {
      ORDENS_SERVICO: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'ASSIGN_TECHNICAL', 'VALIDATE_TECHNICAL'],
      OSH_SEGURANCA: ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE_OSH'],
      DLOG_LOGISTICA: ['VIEW', 'CREATE', 'EDIT', 'ASSIGN_LOGISTICS', 'DISPATCH_DRIVER'],
      PAGAMENTOS_SUBCONTRATADOS: ['VIEW', 'CREATE', 'EDIT', 'PROCESS_PAYMENT'],
      SERVICOS_COMERCIAIS: ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
      GESTAO_USUARIOS: ['VIEW', 'CREATE', 'EDIT'],
      RELATORIOS_AUDITORIA: ['VIEW'],
    },
  },
};

/* ==========================================================================
   3. REGRAS DE ACESSO A ROTAS (Route Guard Configuration)
   ========================================================================== */

export interface RouteRule {
  pattern: RegExp;
  allowedDepartments?: Department[];
  allowedRoles?: Partial<Record<Department, UserRole[]>>;
  requiredPermission?: {
    resource: AppResource;
    action: AppAction;
  };
}

export const ROUTE_RULES: RouteRule[] = [
  // Módulo OSH - Avaliação de Risco e Segurança
  {
    pattern: /^\/dashboard\/osh/,
    allowedDepartments: ['OSH', 'REPARO'],
    allowedRoles: {
      OSH: ['COORDENADOR', 'TECNICO_SEGURANCA', 'ADMINISTRATIVO'],
      REPARO: ['GESTOR', 'SUPERVISOR'],
    },
    requiredPermission: { resource: 'OSH_SEGURANCA', action: 'VIEW' },
  },

  // Módulo DLOG - Logística e Rotas de Motoristas
  {
    pattern: /^\/dashboard\/dlog/,
    allowedDepartments: ['DLOG', 'REPARO'],
    allowedRoles: {
      DLOG: ['ADMINISTRATIVO', 'MOTORISTA'],
      REPARO: ['GESTOR', 'SUPERVISOR', 'ADMINISTRATIVO'],
    },
    requiredPermission: { resource: 'DLOG_LOGISTICA', action: 'VIEW' },
  },

  // Módulo Pagamentos / Liquidação de Subcontratados
  {
    pattern: /^\/dashboard\/pagamentos/,
    allowedDepartments: ['ADMINISTRATIVO', 'REPARO'],
    allowedRoles: {
      ADMINISTRATIVO: ['ADMINISTRATIVO', 'PAGAMENTO_SUBCONTRATADO', 'DEV'],
      REPARO: ['GESTOR'],
    },
    requiredPermission: { resource: 'PAGAMENTOS_SUBCONTRATADOS', action: 'VIEW' },
  },

  // Módulo Comercial / Serviços
  {
    pattern: /^\/dashboard\/servicos/,
    allowedDepartments: ['SERVICOS', 'REPARO'],
    requiredPermission: { resource: 'SERVICOS_COMERCIAIS', action: 'VIEW' },
  },

  // Módulo Reparo (Ordens de Serviço Gerais)
  {
    pattern: /^\/dashboard\/reparo/,
    allowedDepartments: ['REPARO', 'SERVICOS', 'OSH', 'DLOG', 'ADMINISTRATIVO'],
    requiredPermission: { resource: 'ORDENS_SERVICO', action: 'VIEW' },
  },

  // Configurações da APR (Uso Exclusivo do Desenvolvedor Thiago Gregorio)
  {
    pattern: /^\/dashboard\/apr-config/,
    allowedDepartments: ['ADMINISTRATIVO'],
    allowedRoles: {
      ADMINISTRATIVO: ['DEV'],
    },
  },

  // Gestão de Usuários e Acessos (Uso Exclusivo do Desenvolvedor Thiago Gregorio)
  {
    pattern: /^\/dashboard\/usuarios/,
    allowedDepartments: ['ADMINISTRATIVO'],
    allowedRoles: {
      ADMINISTRATIVO: ['DEV'],
    },
    requiredPermission: { resource: 'GESTAO_USUARIOS', action: 'VIEW' },
  },
];

/* ==========================================================================
   4. FUNÇÕES DE VERIFICAÇÃO DE PERMISSÃO
   ========================================================================== */

/**
 * Identifica se o usuário é o Desenvolvedor Thiago Gregorio (Dev / Acesso Mestre)
 */
export function isThiagoDev(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.cargo === 'DEV') return true;
  const nome = user.nome?.trim().toLowerCase();
  const email = user.email?.trim().toLowerCase();
  return (
    email === 'thiago.gregorio@tkelevator.com' ||
    email === 'thiago.gregorio@tke.com' ||
    email === 'thiagogregorio1990@gmail.com' ||
    nome === 'thiago gregorio' ||
    nome === 'thiago' ||
    user.id === '00000000-0000-0000-0000-000000000001'
  );
}

/**
 * Identifica se o usuário é o Administrador Geral (Thiago Gregorio / isAdmin)
 */
export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (isThiagoDev(user)) return true;
  if (user.isAdmin) return true;
  return false;
}

/**
 * Verifica se um usuário possui permissão para executar uma ação em um recurso
 */
export function hasPermission(
  user: AuthUser | null | undefined,
  resource: AppResource,
  action: AppAction
): boolean {
  if (!user || user.status !== 'ATIVO') return false;

  // Desenvolvedor Thiago Gregorio tem acesso total irrestrito
  if (isThiagoDev(user)) return true;

  if (isSuperAdmin(user)) return true;

  const departmentPermissions = PERMISSIONS_MATRIX[user.departamento];
  if (!departmentPermissions) return false;

  const rolePermissions = departmentPermissions[user.cargo];
  if (!rolePermissions) return false;

  const allowedActions = rolePermissions[resource];
  if (!allowedActions) return false;

  return allowedActions.includes(action);
}

/**
 * Verifica se um usuário tem acesso para navegar em determinada rota
 */
export function canAccessRoute(pathname: string, user: AuthUser | null | undefined): boolean {
  if (!user || user.status !== 'ATIVO') return false;

  // 1. REGRA MANDATÓRIA: Somente Thiago Gregorio Dev tem acesso a Configurações da APR e Gestão de Cadastros
  const isAprConfigRoute = pathname.startsWith('/dashboard/apr-config');
  const isUsuariosRoute = pathname.startsWith('/dashboard/usuarios');

  if (isAprConfigRoute || isUsuariosRoute) {
    return isThiagoDev(user);
  }

  // 2. Thiago Gregorio (Dev) tem acesso irrestrito a todas as rotas
  if (isThiagoDev(user)) return true;

  // 3. Controle por Menus Customizados (allowedMenus individual do usuário)
  if (user.allowedMenus && Array.isArray(user.allowedMenus) && user.allowedMenus.length > 0) {
    // Verifica se a rota solicitada pertence a um dos menus autorizados
    const isMenuAllowed = user.allowedMenus.some((menu) => {
      if (menu === '/dashboard') {
        return pathname === '/dashboard';
      }
      return pathname === menu || pathname.startsWith(menu + '/');
    });

    if (!isMenuAllowed) {
      return false;
    }
  }

  if (isSuperAdmin(user)) return true;

  // 4. Busca se a rota atual possui uma regra de restrição específica por departamento/cargo
  const matchingRule = ROUTE_RULES.find((rule) => rule.pattern.test(pathname));

  // Se for uma rota geral (ex: /dashboard raiz), permite usuários ativos
  if (!matchingRule) return true;

  // Checa departamento
  if (matchingRule.allowedDepartments && !matchingRule.allowedDepartments.includes(user.departamento)) {
    return false;
  }

  // Checa cargo específico do departamento
  if (matchingRule.allowedRoles) {
    const allowedRolesForDept = matchingRule.allowedRoles[user.departamento];
    if (allowedRolesForDept && !allowedRolesForDept.includes(user.cargo)) {
      return false;
    }
  }

  // Checa permissão granular exigida
  if (matchingRule.requiredPermission) {
    return hasPermission(
      user,
      matchingRule.requiredPermission.resource,
      matchingRule.requiredPermission.action
    );
  }

  return true;
}
