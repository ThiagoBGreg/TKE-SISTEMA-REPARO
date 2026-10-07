'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { Department, UserRole } from '@/db/schema';
import { canAccessRoute, hasPermission } from '@/lib/permissions';
import { AppAction, AppResource, AuthUser } from '@/types/auth';

interface RBACContextType {
  user: AuthUser | null;
  can: (resource: AppResource, action: AppAction) => boolean;
  isDepartment: (...departments: Department[]) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  canAccess: (pathname: string) => boolean;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

/**
 * Provedor de Contexto RBAC para aplicações Next.js Client-Side
 */
export function RBACProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  const value = useMemo<RBACContextType>(() => {
    return {
      user,
      can: (resource: AppResource, action: AppAction) => hasPermission(user, resource, action),
      isDepartment: (...departments: Department[]) => {
        if (!user || user.status !== 'ATIVO') return false;
        return departments.includes(user.departamento);
      },
      hasRole: (...roles: UserRole[]) => {
        if (!user || user.status !== 'ATIVO') return false;
        return roles.includes(user.cargo);
      },
      canAccess: (pathname: string) => canAccessRoute(pathname, user),
    };
  }, [user]);

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

/**
 * Hook principal para controle de acesso em componentes React
 */
export function useRBAC(customUser?: AuthUser | null): RBACContextType {
  const context = useContext(RBACContext);

  // Se o hook for usado fora do Provider mas receber o usuário diretamente via prop/argumento
  if (!context && customUser !== undefined) {
    return {
      user: customUser,
      can: (resource: AppResource, action: AppAction) => hasPermission(customUser, resource, action),
      isDepartment: (...departments: Department[]) => {
        if (!customUser || customUser.status !== 'ATIVO') return false;
        return departments.includes(customUser.departamento);
      },
      hasRole: (...roles: UserRole[]) => {
        if (!customUser || customUser.status !== 'ATIVO') return false;
        return roles.includes(customUser.cargo);
      },
      canAccess: (pathname: string) => canAccessRoute(pathname, customUser),
    };
  }

  if (!context) {
    throw new Error('useRBAC deve ser utilizado dentro de um <RBACProvider /> ou fornecendo o usuário como parâmetro.');
  }

  return context;
}

/* ==========================================================================
   COMPONENTES UTILITÁRIOS PARA RENDERIZAÇÃO CONDICIONAL (UI Gates)
   ========================================================================== */

interface PermissionGateProps {
  resource: AppResource;
  action: AppAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renderiza o conteúdo apenas se o usuário tiver a permissão granular requerida
 */
export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can } = useRBAC();

  if (!can(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface DepartmentGateProps {
  departments: Department[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renderiza o conteúdo apenas se o usuário pertencer a um dos departamentos especificados
 */
export function DepartmentGate({
  departments,
  children,
  fallback = null,
}: DepartmentGateProps) {
  const { isDepartment } = useRBAC();

  if (!isDepartment(...departments)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RoleGateProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renderiza o conteúdo apenas se o usuário possuir um dos cargos especificados
 */
export function RoleGate({
  roles,
  children,
  fallback = null,
}: RoleGateProps) {
  const { hasRole } = useRBAC();

  if (!hasRole(...roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
