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
    label: 'Permissões (PT / APR)',
    icon: '🛡️',
    departments: ['REPARO', 'SERVICOS', 'OSH', 'ADMINISTRATIVO', 'DLOG'],
  },
  {
    href: '/dashboard/reparo/acompanhamento',
    label: 'Acompanhamento Serviços',
    icon: '📍',
    departments: ['REPARO', 'SERVICOS', 'OSH', 'ADMINISTRATIVO', 'DLOG'],
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
            {/* Logo Oficial TKE */}
            <div className="flex items-center gap-3 px-2 py-2">
              <Link href="/dashboard" className="flex items-center gap-3 group">
                <div className="relative p-0.5 rounded-xl bg-gradient-to-tr from-tke-purple via-tke-magenta to-tke-orange shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <div className="w-9 h-9 rounded-[10px] bg-slate-950 flex items-center justify-center p-1">
                    <img
                      src="/images/tke-symbol.png"
                      alt="TKE"
                      className="w-full h-full object-contain invert brightness-200"
                    />
                  </div>
                </div>
                <div>
                  <span className="font-black text-white text-base tracking-tight block group-hover:text-orange-400 transition-colors">
                    TKE Reparos
                  </span>
                  <span className="text-[10px] text-orange-400 block -mt-1 font-mono uppercase font-semibold">
                    {isSuperAdmin(user) ? 'Move Beyond • Admin' : `${user?.departamento || 'Sistema'} • TKE`}
                  </span>
                </div>
              </Link>
            </div>

            {/* Menu Links */}
            <nav className="space-y-1.5">
              {NAV_ITEMS.filter(
                (item) => isSuperAdmin(user) || !user || item.departments.includes(user.departamento)
              ).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-tke-purple via-tke-magenta to-tke-orange text-white shadow-lg shadow-orange-500/25 font-bold scale-[1.02]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80 hover:translate-x-1'
                    }`}
                  >
                    <span className="text-base transition-transform group-hover:scale-110">{item.icon}</span>
                    <span className="tracking-tight">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Logout */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            {user && (
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-tke-purple to-tke-orange flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                  {user.nome.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                    <span>{user.nome}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  </div>
                  <div className="text-[10px] text-slate-400 truncate uppercase font-mono font-medium">
                    {user.cargo} • {user.departamento}
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition group"
            >
              <span className="transition-transform group-hover:-translate-x-0.5">🚪</span>
              <span>Encerrar Sessão</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar com padrão visual TKE */}
          <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Departamento:</span>
                <span className="text-xs font-bold bg-orange-500/10 text-orange-700 px-2.5 py-1 rounded-lg border border-orange-500/20">
                  {user?.departamento}
                </span>
                <span className="text-xs font-semibold text-slate-600">({user?.cargo})</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Neon Postgres Online</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <span>🏠</span> Início
              </Link>

              <Link
                href="/dashboard/reparo/pt"
                className="btn-tke-gradient px-4 py-2 text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35"
              >
                <span>✍️</span> + Nova PT / APR
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
