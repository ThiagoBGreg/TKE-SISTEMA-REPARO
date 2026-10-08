'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthUser } from '@/types/auth';
import { RBACProvider } from '@/hooks/useRBAC';
import { isSuperAdmin } from '@/lib/permissions';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Visão Geral',
    icon: '📊',
    departments: ['REPARO', 'SERVICOS', 'OSH', 'DLOG', 'ADMINISTRATIVO'],
  },
  {
    href: '/dashboard/reparo',
    label: 'Ordens de Serviço',
    icon: '📋',
    departments: ['REPARO', 'SERVICOS', 'OSH', 'DLOG', 'ADMINISTRATIVO'],
  },
  {
    href: '/dashboard/reparo/pt',
    label: 'Nova PT / APR',
    icon: '✍️',
    departments: ['REPARO', 'SERVICOS', 'OSH'],
  },
  {
    href: '/dashboard/osh',
    label: 'Segurança (OSH)',
    icon: '🛡️',
    departments: ['OSH', 'REPARO'],
  },
  {
    href: '/dashboard/dlog',
    label: 'Logística (DLOG)',
    icon: '🚚',
    departments: ['DLOG', 'REPARO'],
  },
  {
    href: '/dashboard/subcontratado/historico',
    label: 'Portal do Prestador',
    icon: '💼',
    departments: ['REPARO', 'ADMINISTRATIVO'],
  },
  {
    href: '/dashboard/pagamentos',
    label: 'Pagamentos Subcontratados',
    icon: '💳',
    departments: ['ADMINISTRATIVO', 'REPARO'],
  },
  {
    href: '/dashboard/usuarios',
    label: 'Aprovação de Cadastros',
    icon: '👥',
    departments: ['ADMINISTRATIVO', 'REPARO'],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // Lê a sessão do cookie client-side
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies
      .find((c) => c.trim().startsWith('tke_session='))
      ?.split('=')[1];

    if (sessionCookie) {
      try {
        const decoded = JSON.parse(atob(sessionCookie)) as AuthUser;
        setUser(decoded);
      } catch {
        setUser(null);
      }
    } else {
      // Fallback default para demonstração caso não tenha cookie
      setUser({
        id: 'a0000000-0000-0000-0000-000000000001',
        nome: 'Carlos Gestor Reparo',
        email: 'gestor.reparo@tke.com',
        departamento: 'REPARO',
        cargo: 'GESTOR',
        status: 'ATIVO',
      });
    }
  }, []);

  const handleLogout = () => {
    document.cookie = 'tke_session=; path=/; max-age=0';
    router.push('/login');
  };

  return (
    <RBACProvider user={user}>
      <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between p-4 shrink-0 border-r border-slate-800">
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-lg shadow-md shadow-red-600/30">
                T
              </div>
              <div>
                <span className="font-bold text-white text-base tracking-tight block">
                  TKE Reparos
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-mono uppercase">
                  {isSuperAdmin(user) ? 'Acesso Total (Admin)' : user?.departamento || 'Sistema'}
                </span>
              </div>
            </div>

            {/* Menu Links */}
            <nav className="space-y-1">
              {NAV_ITEMS.filter(
                (item) => isSuperAdmin(user) || !user || item.departments.includes(user.departamento)
              ).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                        : 'hover:bg-slate-800 hover:text-white text-slate-400'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Logout */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            {user && (
              <div className="px-2">
                <div className="text-xs font-bold text-white truncate">{user.nome}</div>
                <div className="text-[10px] text-slate-400 truncate">{user.cargo}</div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
            >
              <span>🚪</span>
              <span>Trocar Perfil / Sair</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Departamento:</span>
              <span className="text-xs font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                {user?.departamento}
              </span>
              <span className="text-xs font-semibold text-slate-600">({user?.cargo})</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/reparo/pt"
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-xs transition"
              >
                + Nova PT
              </Link>
            </div>
          </header>

          {/* Page Body */}
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </RBACProvider>
  );
}
