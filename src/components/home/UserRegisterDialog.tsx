'use client';

import React, { useState } from 'react';
import { createUserByAdminAction } from '@/actions/authActions';

export const APP_MENUS_OPTIONS = [
  { href: '/dashboard', label: 'Visão Geral (Dashboard)' },
  { href: '/dashboard/reparo', label: 'Ordens de Reparo' },
  { href: '/dashboard/reparo/pt', label: 'Permissões (PT / APR Digital)' },
  { href: '/dashboard/reparo/acompanhamento', label: 'Acompanhamento Tempo Real' },
  { href: '/dashboard/osh', label: 'Segurança OSH & NR' },
  { href: '/dashboard/dlog', label: 'Logística DLOG' },
  { href: '/dashboard/subcontratado/historico', label: 'Portal do Prestador' },
  { href: '/dashboard/pagamentos', label: 'Pagamentos Subcontratados' },
  { href: '/dashboard/usuarios', label: 'Gestão de Usuários (DEV)' },
];

const CARGOS_POR_DEPTO: Record<string, string[]> = {
  REPARO: ['GESTOR', 'SUPERVISOR', 'ADMINISTRATIVO', 'ESTAGIARIO', 'APRENDIZ', 'SUBCONTRATADO', 'DEV'],
  SERVICOS: ['GERENTE', 'COORDENADOR', 'CONSULTOR_COMERCIAL', 'TECNICO', 'SUPERVISOR'],
  OSH: ['COORDENADOR', 'TECNICO_SEGURANCA', 'ADMINISTRATIVO'],
  DLOG: ['ADMINISTRATIVO', 'MOTORISTA'],
  ADMINISTRATIVO: ['ADMINISTRATIVO', 'PAGAMENTO_SUBCONTRATADO', 'DEV'],
};

interface UserRegisterDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserRegisterDialog({ isOpen, onClose }: UserRegisterDialogProps) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [departamento, setDepartamento] = useState<'REPARO' | 'SERVICOS' | 'OSH' | 'DLOG' | 'ADMINISTRATIVO'>('REPARO');
  const [cargo, setCargo] = useState('SUPERVISOR');
  const [telefone, setTelefone] = useState('');
  const [documento, setDocumento] = useState('');
  const [empresa, setEmpresa] = useState('TK Elevator Brasil');
  const [allowedMenus, setAllowedMenus] = useState<string[]>(APP_MENUS_OPTIONS.map((m) => m.href));
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleDeptoChange = (newDepto: 'REPARO' | 'SERVICOS' | 'OSH' | 'DLOG' | 'ADMINISTRATIVO') => {
    setDepartamento(newDepto);
    const availableCargos = CARGOS_POR_DEPTO[newDepto] || ['SUPERVISOR'];
    setCargo(availableCargos[0]);
  };

  const handleToggleMenu = (menuHref: string) => {
    setAllowedMenus((prev) =>
      prev.includes(menuHref) ? prev.filter((h) => h !== menuHref) : [...prev, menuHref]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await createUserByAdminAction({
        nome,
        email,
        senha,
        departamento,
        cargo,
        telefone,
        documento,
        empresa,
        status: 'ATIVO',
        allowedMenus,
      });

      if (res.success) {
        setMessage({
          type: 'success',
          text: `Usuário "${nome}" cadastrado com sucesso com perfil ATIVO!`,
        });
        setTimeout(() => {
          onClose();
          setNome('');
          setEmail('');
          setSenha('');
          setMessage(null);
        }, 1800);
      } else {
        setMessage({
          type: 'error',
          text: res.error || 'Erro ao realizar cadastro.',
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Erro inesperado na conexão.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-orange-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/20 my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-lg">
              👤
            </span>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-wide flex items-center gap-2">
                Cadastrar Novo Usuário TKE
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  DEV THIAGO GREGORIO
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cadastro imediato de operadores, supervisores, técnicos e subcontratados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-orange-500 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                message.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Nome Completo *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Eduardo Silva"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail Corporativo *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: carlos.silva@tkelevator.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Senha de Acesso *
              </label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Empresa / Filial
              </label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="TK Elevator Brasil"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Departamento *
              </label>
              <select
                value={departamento}
                onChange={(e) => handleDeptoChange(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
              >
                <option value="REPARO">REPARO (Manutenção e OS)</option>
                <option value="SERVICOS">SERVIÇOS (Comercial / Campo)</option>
                <option value="OSH">OSH (Segurança do Trabalho)</option>
                <option value="DLOG">DLOG (Logística)</option>
                <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Cargo / Função *
              </label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
              >
                {(CARGOS_POR_DEPTO[departamento] || ['SUPERVISOR']).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Telefone / WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                CPF / Documento
              </label>
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition"
              />
            </div>
          </div>

          {/* Menus Permitidos */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Menus Autorizados (Permissões de Acesso)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 max-h-36 overflow-y-auto">
              {APP_MENUS_OPTIONS.map((menu) => (
                <label
                  key={menu.href}
                  className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={allowedMenus.includes(menu.href)}
                    onChange={() => handleToggleMenu(menu.href)}
                    className="rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>{menu.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 hover:brightness-110 shadow-lg shadow-orange-500/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <span>✓</span> Concluir Cadastro
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
