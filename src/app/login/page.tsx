'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Department, UserRole } from '@/db/schema';
import { AuthUser } from '@/types/auth';

const PROFILES: Array<{
  nome: string;
  email: string;
  departamento: Department;
  cargo: UserRole;
  badge: string;
}> = [
  {
    nome: 'Carlos Gestor Reparo',
    email: 'gestor.reparo@tke.com',
    departamento: 'REPARO',
    cargo: 'GESTOR',
    badge: 'Gestão Completa de Reparos',
  },
  {
    nome: 'Lucas Supervisor Campo',
    email: 'supervisor.reparo@tke.com',
    departamento: 'REPARO',
    cargo: 'SUPERVISOR',
    badge: 'Emissão e Aprovação de PT',
  },
  {
    nome: 'Marcos Técnico Subcontratado',
    email: 'tecnico.sub@parceirotke.com',
    departamento: 'REPARO',
    cargo: 'SUBCONTRATADO',
    badge: 'Preenchimento de PT em Campo',
  },
  {
    nome: 'Mariana Auditora OSH',
    email: 'seguranca.osh@tke.com',
    departamento: 'OSH',
    cargo: 'TECNICO_SEGURANCA',
    badge: 'Aprovação de Laudos e NR-35',
  },
  {
    nome: 'Roberto Logística DLOG',
    email: 'motorista.dlog@tke.com',
    departamento: 'DLOG',
    cargo: 'MOTORISTA',
    badge: 'Rotas e Transporte de Peças',
  },
  {
    nome: 'Fernanda Financeiro ADM',
    email: 'adm.pagamentos@tke.com',
    departamento: 'ADMINISTRATIVO',
    cargo: 'PAGAMENTO_SUBCONTRATADO',
    badge: 'Liquidação de Faturas',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState(PROFILES[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (profile: typeof PROFILES[0]) => {
    setIsLoading(true);

    const userPayload: AuthUser = {
      id: 'a0000000-0000-0000-0000-000000000001',
      nome: profile.nome,
      email: profile.email,
      departamento: profile.departamento,
      cargo: profile.cargo,
      status: 'ATIVO',
    };

    // Grava o cookie da sessão em Base64 para o Middleware do Next.js
    const sessionBase64 = btoa(JSON.stringify(userPayload));
    document.cookie = `tke_session=${sessionBase64}; path=/; max-age=86400; SameSite=Lax`;

    setTimeout(() => {
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-red-600">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mx-auto shadow-lg shadow-red-600/30">
            T
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Portal TKE Reparos</h1>
          <p className="text-xs text-slate-400">
            Selecione o perfil funcional de acesso para testar os módulos e permissões RBAC:
          </p>
        </div>

        {/* Perfis Rápidos */}
        <div className="space-y-2">
          {PROFILES.map((p) => {
            const isSelected = selectedProfile.email === p.email;
            return (
              <button
                key={p.email}
                type="button"
                onClick={() => {
                  setSelectedProfile(p);
                  handleLogin(p);
                }}
                className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between group ${
                  isSelected
                    ? 'bg-red-950/40 border-red-500/80 text-white shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    {p.nome}
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                      {p.departamento}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{p.badge}</div>
                </div>
                <span className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition">
                  Acessar →
                </span>
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="text-center text-xs text-red-400 font-semibold flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> Carregando permissões do perfil...
          </div>
        )}

        <div className="pt-2 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Ambiente Integrado com Neon Postgres e Vercel Edge Runtime.
          </p>
        </div>
      </div>
    </div>
  );
}
