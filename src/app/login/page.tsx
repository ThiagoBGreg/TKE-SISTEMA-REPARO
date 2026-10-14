'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUserAction, registerUserAction } from '@/actions/authActions';
import { DEPARTMENT_ROLES, type DepartmentType } from '@/db/schema';
import { HomeConfig } from '@/types/homeConfig';
import { DEFAULT_HOME_CONFIG, DEFAULT_LOGIN_PAGE_CONFIG } from '@/data/defaultHomeConfig';
import { HomeDevPlatform } from '@/components/home/HomeDevPlatform';
import { AuthUser } from '@/types/auth';
import { isThiagoDev } from '@/lib/permissions';
import { applySystemTheme, DEFAULT_THEME_CONFIG } from '@/data/colorPalettes';

const STORAGE_KEY = 'tke_home_config_v2';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'login' | 'cadastro'>('login');

  // Configuração Dinâmica do Sistema (Home e Login)
  const [config, setConfig] = useState<HomeConfig>(DEFAULT_HOME_CONFIG);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Estados do Modo DEV
  const [isDevPlatformOpen, setIsDevPlatformOpen] = useState(false);
  const [isDevAuthModalOpen, setIsDevAuthModalOpen] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [devAuthError, setDevAuthError] = useState<string | null>(null);
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);

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
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regTelefone, setRegTelefone] = useState('');
  const [regDocumento, setRegDocumento] = useState('');
  const [regDepartamento, setRegDepartamento] = useState<DepartmentType>('REPARO');
  const [regCargo, setRegCargo] = useState<string>(DEPARTMENT_ROLES.REPARO[0]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  // 1. Carrega configuração da API online ou localStorage
  useEffect(() => {
    async function loadConfig() {
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local) as HomeConfig;
          if (parsed && typeof parsed === 'object') {
            const merged = {
              ...DEFAULT_HOME_CONFIG,
              ...parsed,
              loginPage: { ...DEFAULT_LOGIN_PAGE_CONFIG, ...(parsed.loginPage || {}) },
            };
            setConfig(merged);
            if (merged.themeConfig) applySystemTheme(merged.themeConfig);
          }
        }
      } catch (err) {
        console.warn('[LoginPage] Falha ao carregar do localStorage:', err);
      }

      try {
        const res = await fetch('/api/home-config', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.config && typeof data.config === 'object') {
            const merged: HomeConfig = {
              ...DEFAULT_HOME_CONFIG,
              ...data.config,
              loginPage: { ...DEFAULT_LOGIN_PAGE_CONFIG, ...(data.config.loginPage || {}) },
            };
            setConfig(merged);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            if (merged.themeConfig) applySystemTheme(merged.themeConfig);
          }
        }
      } catch (err) {
        console.warn('[LoginPage] Falha ao carregar da API:', err);
      }
    }

    loadConfig();
  }, []);

  // 2. Identifica sessão do usuário
  useEffect(() => {
    try {
      const cookies = document.cookie.split(';');
      const sessionCookie = cookies
        .find((c) => c.trim().startsWith('tke_session='))
        ?.split('=')[1];

      if (sessionCookie) {
        const decoded = JSON.parse(atob(sessionCookie)) as AuthUser;
        setUser(decoded);
        if (isThiagoDev(decoded)) {
          setIsDevUnlocked(true);
        }
      }
    } catch {
      setUser(null);
    }
  }, []);

  // Salva no backend online e sincroniza
  const handleSaveToBackend = async (configToSave?: HomeConfig) => {
    const targetConfig = configToSave || config;
    try {
      const res = await fetch('/api/home-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetConfig),
      });
      if (!res.ok) throw new Error('Erro ao salvar no servidor online');
      const data = await res.json();
      const saved = data.config || targetConfig;
      setConfig(saved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      if (saved.themeConfig) applySystemTheme(saved.themeConfig);
      return saved;
    } catch (err) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(targetConfig));
      throw err;
    }
  };

  const handleResetToDefault = () => {
    setConfig(DEFAULT_HOME_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
    applySystemTheme(DEFAULT_THEME_CONFIG);
    fetch('/api/home-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_HOME_CONFIG),
    });
  };

  // Autenticação rápida do DEV Thiago Gregorio
  const handleDevUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPasswordInput === 'ManuLinda' || devPasswordInput === 'thiago' || devPasswordInput === 'dev') {
      setIsDevUnlocked(true);
      setIsDevAuthModalOpen(false);
      setIsDevPlatformOpen(true);
      setDevPasswordInput('');
      setDevAuthError(null);
    } else {
      setDevAuthError('Senha incorreta para acesso de desenvolvedor.');
    }
  };

  const handleOpenDevClick = () => {
    if (isDevUnlocked || isThiagoDev(user)) {
      setIsDevPlatformOpen(true);
    } else {
      setIsDevAuthModalOpen(true);
    }
  };

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

    router.push(result.redirect || '/dashboard/reparo/pt');
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

  const loginConfig = config.loginPage || DEFAULT_LOGIN_PAGE_CONFIG;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Barra Superior Discreta de Navegação & Acesso DEV */}
      <div className="w-full max-w-5xl mb-3 flex items-center justify-between px-2 text-xs">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition font-bold"
        >
          <span>←</span>
          <span>Voltar ao Início</span>
        </Link>

        {/* Botão de Acesso DEV Thiago Gregorio na Tela de Login */}
        <button
          type="button"
          onClick={handleOpenDevClick}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/40 bg-slate-900/80 text-orange-400 hover:text-white hover:bg-orange-600 text-[11px] font-black tracking-wide shadow-md transition cursor-pointer"
          title="Abrir Plataforma de Edição do DEV na Tela de Login"
        >
          <span>🛠️</span>
          <span>MODO DEV: THIAGO GREGORIO</span>
          {isDevUnlocked && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
        </button>
      </div>

      <div className="w-full max-w-5xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] backdrop-blur-md">
        {/* ====================================================================
            PAINEL LATERAL COM IDENTIDADE VISUAL OFICIAL TKE
            ==================================================================== */}
        <div className="lg:col-span-5 relative bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/40 p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden">
          {/* Imagem de Fundo Estilizada (Editável pelo DEV) */}
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-screen">
            <Image
              src={loginConfig.sideBannerImageUrl || '/images/Template-Capa-Blogs.png'}
              alt="TKE Move Beyond Background"
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Logo e Informações Dinâmicas */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-white/95 p-2 rounded-2xl shadow-lg border border-slate-200 inline-block">
                <Image
                  src={loginConfig.sideLogoUrl || '/images/tke-logo-claim-510x336px_image_w450_h338.webp'}
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
                {loginConfig.badgeText || 'Portal Operacional Integrado'}
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
                {loginConfig.title || 'Gestão & Monitoramento de Reparos'}
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed font-normal">
                {loginConfig.description ||
                  'Plataforma corporativa da TKE para emissão de Permissão de Trabalho (PT/APR), assinaturas digitais, evidências técnicas e conformidade operacional.'}
              </p>
            </div>
          </div>

          {/* Rodapé do Painel Visual Dinâmico */}
          <div className="relative z-10 pt-6 space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs space-y-1">
              <div className="text-orange-400 font-bold flex items-center gap-1.5 text-xs">
                <span>🛡️</span> {loginConfig.noticeTitle || 'Autorização Corporativa'}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                {loginConfig.noticeText ||
                  'Cadastros de técnicos e parceiros subcontratados passam por liberação prévia da Coordenação TKE.'}
              </p>
            </div>

            <div className="relative h-8 w-full rounded-xl overflow-hidden border border-white/10 shadow-md">
              <Image
                src={loginConfig.sideFooterImageUrl || '/images/brand-keyvisual-1900px_image_w1900_h450.webp'}
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
          {/* Alternador de Abas Dinâmico */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError(null);
                  setRegSuccessMessage(null);
                }}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-tke-purple via-tke-magenta to-tke-orange text-white shadow-md shadow-orange-500/25 font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {loginConfig.loginTabLabel || 'Acessar Conta'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('cadastro');
                  setRegError(null);
                  setLoginError(null);
                }}
                className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
                  activeTab === 'cadastro'
                    ? 'bg-gradient-to-r from-tke-purple via-tke-magenta to-tke-orange text-white shadow-md shadow-orange-500/25 font-extrabold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {loginConfig.registerTabLabel || 'Criar Nova Conta'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleOpenDevClick}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:text-orange-300 transition cursor-pointer"
              title="Editar opções desta tela"
            >
              <span>⚙️</span> Editar Tela
            </button>
          </div>

          {/* ================================================================
              FORMULÁRIO 1: LOGIN (ACESSAR CONTA)
              ================================================================ */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{loginConfig.loginHeading || 'Bem-vindo ao Sistema'}</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-orange-500/15 text-orange-400 border border-orange-500/30">
                    {loginConfig.loginBadge || 'TKE SECURE'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {loginConfig.loginSubheading || 'Informe suas credenciais corporativas para entrar.'}
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
                  Nome Completo, E-mail ou CPF *
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentificador}
                  onChange={(e) => setLoginIdentificador(e.target.value)}
                  placeholder="Digite seu Nome Completo, E-mail ou CPF..."
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
                    className="absolute right-3 top-3 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="btn-tke-gradient w-full py-3.5 text-xs tracking-wide uppercase font-bold cursor-pointer"
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
            </form>
          )}

          {/* ================================================================
              FORMULÁRIO 2: CADASTRO (CRIAR CONTA)
              ================================================================ */}
          {activeTab === 'cadastro' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {loginConfig.registerHeading || 'Solicitar Cadastro'}
                </h2>
                <p className="text-xs text-slate-400">
                  {loginConfig.registerSubheading ||
                    'Preencha seus dados. Após o envio, o Administrador autorizará seu acesso.'}
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
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition cursor-pointer"
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
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regSenha}
                    onChange={(e) => setRegSenha(e.target.value)}
                    placeholder="Mínimo 5 caracteres (ex: 5 primeiros dígitos do CPF)"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 pr-10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                    title={showRegPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showRegPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-400">
                {loginConfig.securityNote ||
                  '🔒 Seus dados serão mantidos em sigilo e o acesso só será ativado após conferência administrativa.'}
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="btn-tke-gradient w-full py-3.5 text-xs tracking-wide uppercase font-bold cursor-pointer"
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

      {/* Botão Flutuante de Acesso Rápido ao MODO DEV na Tela de Login */}
      <div className="fixed bottom-5 right-5 z-40 animate-in fade-in duration-300">
        <button
          type="button"
          onClick={handleOpenDevClick}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full font-black text-xs shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border cursor-pointer bg-slate-900/90 hover:bg-slate-800 text-orange-400 border-orange-500/40 shadow-orange-500/20 backdrop-blur-md"
          title="Abrir Studio DEV de Edição da Tela de Login e Início"
        >
          <span className="text-sm">🛠️</span>
          <span>MODO DEV</span>
          {isDevUnlocked && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
        </button>
      </div>

      {/* Modal de Desbloqueio de Acesso DEV Thiago Gregorio */}
      {isDevAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-orange-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-orange-500/20 space-y-5 animate-in zoom-in-95 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 font-black text-xs border border-orange-500/30">
                  DEV
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Desbloqueio Modo DEV</h3>
                  <span className="text-[11px] text-slate-400">Thiago Gregorio • Personalização de Telas</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDevAuthModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDevUnlockSubmit} className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Digite sua senha de desenvolvedor para liberar a edição completa das opções das telas de{' '}
                <strong className="text-orange-400">INÍCIO</strong> e <strong className="text-orange-400">LOGIN</strong>.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 block">Senha de Acesso DEV:</label>
                <input
                  type="password"
                  value={devPasswordInput}
                  onChange={(e) => setDevPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {devAuthError && (
                <div className="p-2.5 bg-red-950/60 border border-red-700 rounded-xl text-red-300 text-xs">
                  {devAuthError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDevAuthModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 text-xs font-bold text-white shadow-md hover:brightness-110 cursor-pointer"
                >
                  Desbloquear Studio DEV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plataforma de Desenvolvimento Integrada (Studio DEV) */}
      <HomeDevPlatform
        isOpen={isDevPlatformOpen}
        onClose={() => setIsDevPlatformOpen(false)}
        config={config}
        onUpdateConfig={setConfig}
        onSaveToBackend={handleSaveToBackend}
        onResetToDefault={handleResetToDefault}
        initialTab="login"
      />
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
