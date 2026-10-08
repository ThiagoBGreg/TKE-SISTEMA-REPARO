'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AuthUser } from '@/types/auth';
import { RBACProvider } from '@/hooks/useRBAC';
import { isSuperAdmin } from '@/lib/permissions';
import { getCurrentUserAction } from '@/actions/authActions';

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
    icon: '🦺',
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
    label: 'Gestão de Cadastros',
    icon: '👥',
    departments: ['ADMINISTRATIVO', 'REPARO'],
  },
  {
    href: '/dashboard/apr-config',
    label: 'Configurações da APR',
    icon: '⚙️',
    departments: ['ADMINISTRATIVO', 'OSH', 'REPARO'],
  },
];

function decodeSessionCookieSafe(cookieValue: string): AuthUser | null {
  try {
    const raw = decodeURIComponent(cookieValue);
    const binary = atob(raw);
    const bytes = Uint8Array.from(binary, (m) => m.charCodeAt(0));
    const decodedStr = new TextDecoder().decode(bytes);
    return JSON.parse(decodedStr) as AuthUser;
  } catch {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(cookieValue)))) as AuthUser;
    } catch {
      return null;
    }
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Tenta decodificar o cookie localmente de forma segura com suporte a UTF-8
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies
      .find((c) => c.trim().startsWith('tke_session='))
      ?.split('=')[1];

    if (sessionCookie) {
      const clientDecoded = decodeSessionCookieSafe(sessionCookie);
      if (clientDecoded && isMounted) {
        setUser(clientDecoded);
      }
    }

    // 2. Consulta o servidor para garantir dados atualizados e consistentes
    getCurrentUserAction().then((serverUser) => {
      if (!isMounted) return;
      if (serverUser) {
        setUser(serverUser);
      } else if (!sessionCookie) {
        // Fallback default de segurança para visualização
        setUser({
          id: '00000000-0000-0000-0000-000000000001',
          nome: 'Thiago Gregorio',
          email: 'thiago.gregorio@tke.com',
          departamento: 'ADMINISTRATIVO',
          cargo: 'ADMINISTRATIVO',
          status: 'ATIVO',
          isAdmin: true,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    document.cookie = 'tke_session=; path=/; max-age=0';
    router.push('/login');
  };

  // Fecha o menu móvel ao mudar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <RBACProvider user={user}>
      <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row w-full overflow-x-hidden">
        {/* Backdrop escuro para celular quando o menu estiver aberto */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 md:hidden animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar (Desktop fixa | Mobile Drawer Deslizante) */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col justify-between p-4 shrink-0 border-r border-slate-800 transition-transform duration-300 md:static md:w-64 md:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="space-y-6">
            {/* Logo Oficial TKE e Botão Fechar no Mobile */}
            <div className="flex items-center justify-between px-2 py-2">
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

              {/* Botão fechar drawer no mobile */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg text-lg"
                aria-label="Fechar Menu"
              >
                ✕
              </button>
            </div>

            {/* Menu Links */}
            <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-220px)]">
              {NAV_ITEMS.filter(
                (item) => isSuperAdmin(user) || !user || item.departments.includes(user.departamento)
              ).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
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
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center gap-2.5 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-tke-purple to-tke-orange flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md shadow-purple-500/20">
                {user?.nome ? user.nome.charAt(0).toUpperCase() : '👤'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  <span className="truncate">{user?.nome || 'Usuário Conectado'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Online" />
                </div>
                <div className="text-[10px] text-orange-400 font-bold truncate uppercase tracking-tight">
                  {user?.cargo ? `${user.cargo} • ${user.departamento}` : 'CONECTADO'}
                </div>
              </div>
            </div>

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
        <div className="flex-1 flex flex-col min-w-0 w-full">
          {/* Top Bar Responsiva */}
          <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs w-full">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Botão Hamburguer para Celulares */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                aria-label="Abrir Menu de Navegação"
              >
                <span className="text-lg">☰</span>
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Departamento:</span>
                <span className="text-xs font-bold bg-orange-500/10 text-orange-700 px-2.5 py-1 rounded-lg border border-orange-500/20">
                  {user?.departamento}
                </span>
                <span className="text-xs font-semibold text-slate-600">({user?.cargo})</span>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Neon Postgres Online</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/"
                className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <span>🏠</span> Início
              </Link>

              <Link
                href="/dashboard/reparo/pt"
                className="btn-tke-gradient px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35"
              >
                <span>✍️</span> + Nova PT
              </Link>

              {/* Card de Usuário Logado no Canto Superior Direito */}
              <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-tke-purple to-tke-orange flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs ring-2 ring-orange-500/20">
                  {user?.nome ? user.nome.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left max-w-[120px] sm:max-w-[170px]">
                  <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {user?.nome || 'Usuário Conectado'}
                  </span>
                  <span className="text-[10px] font-bold text-orange-600 truncate uppercase tracking-wider">
                    {user?.cargo || user?.departamento || 'OPERACIONAL'}
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Page Body Fluido para Qualquer Monitor */}
          <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-y-auto w-full min-w-0">{children}</main>
        </div>
      </div>
    </RBACProvider>
  );
}
