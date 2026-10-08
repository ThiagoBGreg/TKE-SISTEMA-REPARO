'use client';

import React, { Suspense, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUserAction, registerUserAction } from '@/actions/authActions';
import { DEPARTMENT_ROLES, type DepartmentType } from '@/db/schema';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'login' | 'cadastro'>('login');

  // Login Form State
  const [loginIdentificador, setLoginIdentificador] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(
    searchParams.get('error') === 'usuario_inativo_ou_bloqueado'
      ? 'Sua conta de acesso está inativa ou bloqueada.'
      : null
  );

  // Register Form State
  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regTelefone, setRegTelefone] = useState('');
  const [regDocumento, setRegDocumento] = useState('');
  const [regDepartamento, setRegDepartamento] = useState<DepartmentType>('REPARO');
  const [regCargo, setRegCargo] = useState<string>(DEPARTMENT_ROLES.REPARO[0]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  const handleDepartmentChange = (dept: DepartmentType) => {
    setRegDepartamento(dept);
    setRegCargo(DEPARTMENT_ROLES[dept][0]);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const formData = new FormData();
    formData.append('identificador', loginIdentificador);
    formData.append('senha', loginSenha);

    const result = await loginUserAction(formData);

    setLoginLoading(false);

    if (!result.success) {
      setLoginError(result.error);
      return;
    }

    router.push(result.redirect || '/dashboard');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccessMessage(null);
    setRegLoading(true);

    const formData = new FormData();
    formData.append('nome', regNome);
    formData.append('email', regEmail);
    formData.append('senha', regSenha);
    formData.append('departamento', regDepartamento);
    formData.append('cargo', regCargo);
    formData.append('telefone', regTelefone);
    formData.append('documento', regDocumento);

    const result = await registerUserAction(formData);

    setRegLoading(false);

    if (!result.success) {
      setRegError(result.error);
      return;
    }

    setRegSuccessMessage(result.message || 'Cadastro realizado com sucesso!');
    setRegNome('');
    setRegEmail('');
    setRegSenha('');
    setRegTelefone('');
    setRegDocumento('');
  };

  const handlePreFillAdmin = () => {
    setLoginIdentificador('Thiago Gregorio');
    setLoginSenha('Thiago200189');
    setLoginError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] backdrop-blur-md">
        {/* ====================================================================
            PAINEL LATERAL COM IDENTIDADE VISUAL OFICIAL TKE
            ==================================================================== */}
        <div className="lg:col-span-5 relative bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden">
          {/* Imagem de Fundo Estilizada (Template-Capa-Blogs com o gradiente da marca) */}
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen">
            <Image
              src="/images/Template-Capa-Blogs.png"
              alt="TKE Move Beyond Background"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Logo e Informações */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/95 p-2 rounded-2xl shadow-lg border border-slate-200 inline-block">
                <Image
                  src="/images/tke-logo-claim-510x336px_image_w450_h338.webp"
                  alt="TKE Elevadores Move Beyond"
                  width={150}
                  height={95}
                  className="object-contain h-10 w-auto"
                  priority
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                Portal Operacional Integrado
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
                Gestão & Monitoramento de Reparos
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                Plataforma corporativa da TKE para emissão de Permissão de Trabalho (PT/APR), assinaturas digitais, evidências técnicas e conformidade operacional.
              </p>
            </div>
          </div>

          {/* Rodapé do Painel Visual */}
          <div className="relative z-10 pt-6 space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs space-y-1">
              <div className="text-orange-400 font-bold flex items-center gap-1.5 text-xs">
                <span>🛡️</span> Autorização Corporativa
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Cadastros de técnicos e parceiros subcontratados passam por liberação prévia da Coordenação TKE.
              </p>
            </div>

            <div className="relative h-8 w-full rounded-xl overflow-hidden border border-white/10 shadow-md">
              <Image
                src="/images/brand-keyvisual-1900px_image_w1900_h450.webp"
                alt="TKE Move Beyond"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* ====================================================================
            PAINEL DE FORMULÁRIO (LOGIN & CADASTRO)
            ==================================================================== */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-slate-900 text-white space-y-6">
          {/* Alternador de Abas */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError(null);
                  setRegSuccessMessage(null);
                }}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl transition-all duration-300 ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-tke-purple via-tke-magenta to-tke-orange text-white shadow-md shadow-orange-500/25 font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Acessar Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cadastro');
                  setRegError(null);
                  setLoginError(null);
                }}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl transition-all duration-300 ${
                  activeTab === 'cadastro'
                    ? 'bg-gradient-to-r from-tke-purple via-tke-magenta to-tke-orange text-white shadow-md shadow-orange-500/25 font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>

            <Link href="/" className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-orange-400 transition">
              ← Início
            </Link>
          </div>

          {/* ================================================================
              FORMULÁRIO 1: LOGIN (ACESSAR CONTA)
              ================================================================ */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Bem-vindo ao Sistema</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30">TKE SECURE</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Informe suas credenciais corporativas para entrar.
                </p>
              </div>

              {loginError && (
                <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-700 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
                  <span className="text-base shrink-0">⚠️</span>
                  <span className="leading-relaxed">{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome e Sobrenome *
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentificador}
                  onChange={(e) => setLoginIdentificador(e.target.value)}
                  placeholder="Ex: Thiago Gregorio ou Jose Augusto"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Senha *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginSenha}
                    onChange={(e) => setLoginSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition pr-10 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs transition"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="btn-tke-gradient w-full py-3.5 text-xs tracking-wide uppercase font-bold"
                >
                  {loginLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="animate-spin text-sm">⏳</span> Autenticando...
                    </span>
                  ) : (
                    <span>Entrar no Sistema →</span>
                  )}
                </button>
              </div>

              {/* Botão de Preenchimento Rápido para Admin Thiago Gregorio */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handlePreFillAdmin}
                  className="w-full p-2.5 rounded-xl border border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15 text-orange-300 text-xs font-semibold transition-all duration-200 flex items-center justify-between group hover:border-orange-500/50"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">👑</span>
                    <span>Acesso Rápido Admin: Thiago Gregorio</span>
                  </span>
                  <span className="text-[10px] bg-gradient-to-r from-tke-purple to-tke-orange text-white px-2 py-0.5 rounded-md font-bold shadow-xs group-hover:scale-105 transition-transform">
                    Preencher
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* ================================================================
              FORMULÁRIO 2: CADASTRO (CRIAR CONTA)
              ================================================================ */}
          {activeTab === 'cadastro' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Solicitar Cadastro</h2>
                <p className="text-xs text-slate-400">
                  Preencha seus dados. Após o envio, o Administrador autorizará seu acesso.
                </p>
              </div>

              {regError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-700 text-red-300 text-xs flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{regError}</span>
                </div>
              )}

              {regSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs space-y-2 animate-in fade-in">
                  <div className="font-bold flex items-center gap-1.5 text-sm">
                    <span>✅</span> Solicitação Enviada com Sucesso!
                  </div>
                  <p className="leading-relaxed text-slate-300">{regSuccessMessage}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition"
                  >
                    Ir para Tela de Login
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={regNome}
                    onChange={(e) => setRegNome(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    E-mail de Trabalho *
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="joao@parceiro.com"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Departamento *
                  </label>
                  <select
                    value={regDepartamento}
                    onChange={(e) => handleDepartmentChange(e.target.value as DepartmentType)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="REPARO">REPARO</option>
                    <option value="SERVICOS">SERVIÇOS</option>
                    <option value="OSH">OSH (Segurança)</option>
                    <option value="DLOG">DLOG (Logística)</option>
                    <option value="ADMINISTRATIVO">ADMINISTRATIVO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo / Papel *</label>
                  <select
                    value={regCargo}
                    onChange={(e) => setRegCargo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {DEPARTMENT_ROLES[regDepartamento].map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={regTelefone}
                    onChange={(e) => setRegTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    value={regDocumento}
                    onChange={(e) => setRegDocumento(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Defina sua Senha *
                </label>
                <input
                  type="password"
                  required
                  value={regSenha}
                  onChange={(e) => setRegSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400">
                🔒 Seus dados serão mantidos em sigilo e o acesso só será ativado após conferência administrativa.
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="btn-tke-gradient w-full py-3.5 text-xs tracking-wide uppercase font-bold"
              >
                {regLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin text-sm">⏳</span> Enviando Cadastro...
                  </span>
                ) : (
                  'Enviar Solicitação de Cadastro →'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xs">
          <span className="animate-spin text-lg mr-2">⏳</span> Carregando portal TKE...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
