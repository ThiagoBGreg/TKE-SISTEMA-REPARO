import { Department, UserRole, UserStatus } from '@/db/schema';

/**
 * Interface do usuário autenticado no payload da sessão / JWT
 */
export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  departamento: Department;
  cargo: UserRole;
  status: UserStatus;
}

/**
 * Módulos / Recursos do Sistema
 */
export type AppResource =
  | 'ORDENS_SERVICO'
  | 'OSH_SEGURANCA'
  | 'DLOG_LOGISTICA'
  | 'PAGAMENTOS_SUBCONTRATADOS'
  | 'SERVICOS_COMERCIAIS'
  | 'GESTAO_USUARIOS'
  | 'RELATORIOS_AUDITORIA';

/**
 * Ações granulares executáveis nos módulos
 */
export type AppAction =
  | 'VIEW'
  | 'CREATE'
  | 'EDIT'
  | 'DELETE'
  | 'APPROVE_OSH'
  | 'ASSIGN_LOGISTICS'
  | 'DISPATCH_DRIVER'
  | 'PROCESS_PAYMENT'
  | 'ASSIGN_TECHNICAL'
  | 'VALIDATE_TECHNICAL';
