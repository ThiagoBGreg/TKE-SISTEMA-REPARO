'use client';

import React, { useEffect, useState, useTransition, useMemo } from 'react';
import {
  getAllUsersAction,
  getPendingUsersAction,
  updateUserApprovalAction,
  updateUserByAdminAction,
  createUserByAdminAction,
  deleteUserByAdminAction,
  UpdateUserData,
} from '@/actions/authActions';
import { useRBAC } from '@/hooks/useRBAC';
import { isThiagoDev } from '@/lib/permissions';

export const APP_MENUS = [
  { href: '/dashboard', label: 'Visão Geral', icon: '📊', desc: 'Resumo e métricas gerais' },
  { href: '/dashboard/reparo', label: 'SOLICITAÇÃO DE SERVIÇOS', icon: '📋', desc: 'Ordens e solicitações de reparo' },
  { href: '/dashboard/reparo/pt', label: 'Permissões (PT / APR)', icon: '🛡️', desc: 'Permissões de trabalho e APR' },
  { href: '/dashboard/reparo/acompanhamento', label: 'Acompanhamento Serviços', icon: '📍', desc: 'Monitoramento em tempo real' },
  { href: '/dashboard/osh', label: 'Segurança (OSH)', icon: '🦺', desc: 'Inspeções e validação de segurança' },
  { href: '/dashboard/dlog', label: 'Logística (DLOG)', icon: '🚚', desc: 'Despacho de peças e rotas' },
  { href: '/dashboard/subcontratado/historico', label: 'Portal do Prestador', icon: '💼', desc: 'Execução de serviços terceirizados' },
  { href: '/dashboard/pagamentos', label: 'Pagamentos Subcontratados', icon: '💳', desc: 'Financeiro e liquidação de terceiros' },
] as const;

interface UserItem {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  documento?: string | null;
  empresa?: string | null;
  departamento: 'REPARO' | 'SERVICOS' | 'OSH' | 'DLOG' | 'ADMINISTRATIVO';
  cargo: string;
  status: 'ATIVO' | 'PENDENTE' | 'BLOQUEADO' | string;
  isAdmin?: boolean | null;
  allowedMenus?: string[] | null;
  createdAt: Date | string;
}

const DEPARTAMENTOS = ['REPARO', 'SERVICOS', 'OSH', 'DLOG', 'ADMINISTRATIVO'] as const;

export default function UsuariosPage() {
  const { user } = useRBAC();
  const [isPendingTransition, startTransition] = useTransition();

  // Estados principais
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [activeTab, setActiveTab] = useState<'todos' | 'pendentes'>('todos');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filtros e busca
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepto, setFilterDepto] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');

  // Modais
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    nome: string;
    email: string;
    telefone: string;
    documento: string;
    empresa: string;
    departamento: 'REPARO' | 'SERVICOS' | 'OSH' | 'DLOG' | 'ADMINISTRATIVO';
    cargo: string;
    status: 'ATIVO' | 'PENDENTE' | 'BLOQUEADO';
    novaSenha: string;
    allowedMenus: string[];
  }>({
    nome: '',
    email: '',
    telefone: '',
    documento: '',
    empresa: '',
    departamento: 'REPARO',
    cargo: '',
    status: 'ATIVO',
    novaSenha: '',
    allowedMenus: APP_MENUS.map((m) => m.href),
  });

  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserFormData, setNewUserFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    documento: '',
    empresa: '',
    departamento: 'REPARO' as (typeof DEPARTAMENTOS)[number],
    cargo: 'Técnico de Manutenção',
    status: 'ATIVO' as 'ATIVO' | 'PENDENTE' | 'BLOQUEADO',
    allowedMenus: APP_MENUS.map((m) => m.href) as string[],
  });

  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Carrega os dados
  const loadData = () => {
    startTransition(async () => {
      const res = await getAllUsersAction();
      if (res.success && res.users) {
        setAllUsers(res.users as UserItem[]);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 5000);
  };

  // Filtragem dos usuários
  const pendingCount = useMemo(() => {
    return allUsers.filter((u) => u.status === 'PENDENTE').length;
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      // Filtro de aba
      if (activeTab === 'pendentes' && u.status !== 'PENDENTE') {
        return false;
      }

      // Filtro de Departamento
      if (filterDepto !== 'TODOS' && u.departamento !== filterDepto) {
        return false;
      }

      // Filtro de Status
      if (filterStatus !== 'TODOS' && u.status !== filterStatus) {
        return false;
      }

      // Busca textual
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesNome = u.nome.toLowerCase().includes(query);
        const matchesEmail = u.email.toLowerCase().includes(query);
        const matchesCargo = u.cargo?.toLowerCase().includes(query);
        const matchesDoc = u.documento?.toLowerCase().includes(query);
        const matchesTel = u.telefone?.toLowerCase().includes(query);
        const matchesEmpresa = u.empresa?.toLowerCase().includes(query);
        return matchesNome || matchesEmail || matchesCargo || matchesDoc || matchesTel || matchesEmpresa;
      }

      return true;
    });
  }, [allUsers, activeTab, filterDepto, filterStatus, searchQuery]);

  // Ações de aprovação rápida
  const handleQuickApproval = async (userId: string, userName: string, approve: boolean) => {
    const adminId = user?.id || '00000000-0000-0000-0000-000000000001';
    const status = approve ? 'ATIVO' : 'BLOQUEADO';

    const result = await updateUserApprovalAction(userId, status, adminId);
    if (result.success) {
      showNotification(
        'success',
        approve
          ? `Colaborador ${userName} foi AUTORIZADO com sucesso!`
          : `Cadastro de ${userName} foi REJEITADO/BLOQUEADO.`
      );
      loadData();
    } else {
      showNotification('error', result.error || 'Erro ao processar aprovação.');
    }
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (userToEdit: UserItem) => {
    setEditingUser(userToEdit);
    const userAllowedMenus =
      userToEdit.allowedMenus && Array.isArray(userToEdit.allowedMenus) && userToEdit.allowedMenus.length > 0
        ? userToEdit.allowedMenus
        : APP_MENUS.map((m) => m.href);

    setEditFormData({
      nome: userToEdit.nome,
      email: userToEdit.email,
      telefone: userToEdit.telefone || '',
      documento: userToEdit.documento || '',
      empresa: userToEdit.empresa || '',
      departamento: userToEdit.departamento,
      cargo: userToEdit.cargo || '',
      status: (userToEdit.status as 'ATIVO' | 'PENDENTE' | 'BLOQUEADO') || 'ATIVO',
      novaSenha: '',
      allowedMenus: userAllowedMenus,
    });
  };

  // Salvar Edição de Usuário
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    startTransition(async () => {
      const payload: UpdateUserData = {
        id: editingUser.id,
        nome: editFormData.nome,
        email: editFormData.email,
        telefone: editFormData.telefone || undefined,
        documento: editFormData.documento || undefined,
        empresa: editFormData.empresa || undefined,
        departamento: editFormData.departamento,
        cargo: editFormData.cargo,
        status: editFormData.status,
        novaSenha: editFormData.novaSenha ? editFormData.novaSenha : undefined,
        allowedMenus: editFormData.allowedMenus,
      };

      const res = await updateUserByAdminAction(payload);
      if (res.success) {
        showNotification('success', `Cadastro de "${editFormData.nome}" atualizado com sucesso!`);
        setEditingUser(null);
        loadData();
      } else {
        showNotification('error', res.error || 'Erro ao salvar alterações.');
      }
    });
  };

  // Salvar Novo Usuário criado pelo Admin
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await createUserByAdminAction({
        nome: newUserFormData.nome,
        email: newUserFormData.email,
        senha: newUserFormData.senha,
        departamento: newUserFormData.departamento,
        cargo: newUserFormData.cargo,
        telefone: newUserFormData.telefone || undefined,
        documento: newUserFormData.documento || undefined,
        empresa: newUserFormData.empresa || undefined,
        status: newUserFormData.status,
        allowedMenus: newUserFormData.allowedMenus,
      });

      if (res.success) {
        showNotification('success', `Colaborador "${newUserFormData.nome}" cadastrado com sucesso!`);
        setIsNewUserModalOpen(false);
        setNewUserFormData({
          nome: '',
          email: '',
          senha: '',
          telefone: '',
          documento: '',
          empresa: '',
          departamento: 'REPARO',
          cargo: 'Técnico de Manutenção',
          status: 'ATIVO',
          allowedMenus: APP_MENUS.map((m) => m.href) as string[],
        });
        loadData();
      } else {
        showNotification('error', res.error || 'Erro ao cadastrar novo colaborador.');
      }
    });
  };

  // Confirmar e Excluir Usuário
  const handleDeleteUser = async (userId: string) => {
    startTransition(async () => {
      const res = await deleteUserByAdminAction(userId);
      if (res.success) {
        showNotification('success', 'Cadastro excluído permanentemente da plataforma.');
        setDeletingUserId(null);
        loadData();
      } else {
        showNotification('error', res.error || 'Erro ao excluir cadastro.');
      }
    });
  };

  if (user && !isThiagoDev(user)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-lg space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl mx-auto border border-rose-100">
            🔒
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Acesso Restrito ao Desenvolvedor
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            O menu de Gestão de Cadastros é de uso e visualização exclusiva do Desenvolvedor Thiago Gregorio.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-xs"
          >
            Voltar ao Painel Principal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold text-orange-600 tracking-wider uppercase bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
              Painel de Controle • Gestão de Cadastros
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            👥 Gerenciamento de Usuários e Colaboradores
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consulte, edite dados cadastrais, altere cargos, aprove novos acessos ou redefina senhas diretamente pelo sistema.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsNewUserModalOpen(true)}
            className="btn-tke-orange px-4 py-2.5 text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <span className="text-base font-bold leading-none">+</span>
            <span>Novo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Notificação Toast */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{actionMessage.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs & Barra de Ferramentas */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4 sm:p-5 space-y-4">
        {/* Abas */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('todos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'todos'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Todos os Usuários</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'todos' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {allUsers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pendentes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'pendentes'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>Aprovações Pendentes</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === 'pendentes' ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-900 font-bold'
                }`}
              >
                {pendingCount}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            title="Recarregar cadastros"
            className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
          >
            <span className={isPendingTransition ? 'animate-spin' : ''}>🔄</span>
            <span>Atualizar</span>
          </button>
        </div>

        {/* Linha de Busca e Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, e-mail, cargo, CPF ou telefone..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 pl-9 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400 pointer-events-none">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div>
            <select
              value={filterDepto}
              onChange={(e) => setFilterDepto(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="TODOS">Departamento: Todos</option>
              {DEPARTAMENTOS.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="TODOS">Status: Todos</option>
              <option value="ATIVO">🟢 Ativos</option>
              <option value="PENDENTE">🟡 Pendentes</option>
              <option value="BLOQUEADO">🔴 Bloqueados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {isPendingTransition && allUsers.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400 font-semibold space-y-2">
            <span className="animate-spin text-3xl block">⏳</span>
            <span>Carregando dados dos colaboradores...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <span className="text-3xl block">🔍</span>
            <h3 className="text-sm font-bold text-slate-800">Nenhum colaborador encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || filterDepto !== 'TODOS' || filterStatus !== 'TODOS'
                ? 'Nenhum resultado corresponde aos filtros selecionados. Tente limpar os termos de busca.'
                : 'Não há registros nesta visualização.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((colab) => {
              const isUserDev = colab.cargo === 'DEV' || isThiagoDev(colab as any);
              const isMasterAdmin =
                isUserDev ||
                colab.isAdmin ||
                colab.email === 'thiagogregorio1990@gmail.com' ||
                colab.nome.trim().toLowerCase() === 'thiago gregorio';

              const initials = colab.nome
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase();

              return (
                <div
                  key={colab.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Perfil & Informações */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Avatar com status */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
                        {initials}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          colab.status === 'ATIVO'
                            ? 'bg-emerald-500'
                            : colab.status === 'PENDENTE'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        title={`Status: ${colab.status}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{colab.nome}</span>
                        {isUserDev ? (
                          <span className="text-[10px] font-black tracking-wider bg-gradient-to-r from-purple-700 via-pink-600 to-orange-500 text-white px-2.5 py-0.5 rounded-md uppercase shadow-xs flex items-center gap-1">
                            👑 DEV
                          </span>
                        ) : isMasterAdmin ? (
                          <span className="text-[10px] font-black tracking-wider bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md uppercase">
                            👑 Admin
                          </span>
                        ) : null}
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                          {colab.departamento}
                        </span>
                        {colab.empresa && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            🏢 {colab.empresa}
                          </span>
                        )}
                        {colab.cargo?.toUpperCase().includes('SUBCONTRATADO') && !colab.empresa && (
                          <span className="text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-md">
                            ⚠️ Subcontratado (s/ empresa)
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            colab.status === 'ATIVO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : colab.status === 'PENDENTE'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {colab.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>
                          ✉️ <strong className="text-slate-600">E-mail:</strong> {colab.email}
                        </span>
                        <span>
                          👔 <strong className="text-slate-600">Cargo:</strong> {isUserDev ? 'DEV' : colab.cargo}
                        </span>
                        <span>
                          🧭 <strong className="text-slate-600">Menus Visíveis:</strong>{' '}
                          {isUserDev
                            ? 'Acesso Mestre Total'
                            : colab.allowedMenus && colab.allowedMenus.length > 0
                            ? `${colab.allowedMenus.length} de ${APP_MENUS.length} menus`
                            : 'Todos (Padrão)'}
                        </span>
                        {colab.empresa && (
                          <span>
                            🏢 <strong className="text-slate-600">Empresa:</strong> {colab.empresa}
                          </span>
                        )}
                        {colab.telefone && (
                          <span>
                            📞 <strong className="text-slate-600">Tel:</strong> {colab.telefone}
                          </span>
                        )}
                        {colab.documento && (
                          <span>
                            📄 <strong className="text-slate-600">Doc:</strong> {colab.documento}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Botões rápidos se estiver Pendente */}
                    {colab.status === 'PENDENTE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickApproval(colab.id, colab.nome, false)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
                        >
                          ✕ Recusar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickApproval(colab.id, colab.nome, true)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          ✓ Aprovar
                        </button>
                      </>
                    )}

                    {/* Botão de Edição Completa */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(colab)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>✏️</span>
                      <span>Editar</span>
                    </button>

                    {/* Botão de Excluir (Não aplicável ao Admin Mestre) */}
                    {!isMasterAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeletingUserId(colab.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 text-xs font-bold transition cursor-pointer"
                        title="Excluir Colaborador"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: EDITAR CADASTRO */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>✏️</span> Editar Cadastro de Colaborador
                </h3>
                <p className="text-xs text-slate-500">
                  Modifique os dados cadastrais, cargo, status ou redefina a senha de acesso.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nome */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.nome}
                    onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    E-mail Corporativo *
                  </label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={editFormData.telefone}
                    onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Documento / CPF */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Documento / CPF / Matrícula
                  </label>
                  <input
                    type="text"
                    value={editFormData.documento}
                    onChange={(e) => setEditFormData({ ...editFormData, documento: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Departamento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Departamento *
                  </label>
                  <select
                    value={editFormData.departamento}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        departamento: e.target.value as (typeof DEPARTAMENTOS)[number],
                      })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    {DEPARTAMENTOS.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Função / Cargo *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.cargo}
                    onChange={(e) => setEditFormData({ ...editFormData, cargo: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Status de Acesso *
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value as 'ATIVO' | 'PENDENTE' | 'BLOQUEADO',
                      })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                  >
                    <option value="ATIVO">🟢 ATIVO (Acesso Permitido)</option>
                    <option value="PENDENTE">🟡 PENDENTE (Aguardando)</option>
                    <option value="BLOQUEADO">🔴 BLOQUEADO (Acesso Negado)</option>
                  </select>
                </div>

                {/* Nome da Empresa / Razão Social (Especialmente para Subcontratados) */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      🏢 Nome da Empresa / Razão Social {editFormData.cargo.toUpperCase().includes('SUBCONTRATADO') ? '*' : '(Opcional)'}
                    </label>
                    {editFormData.cargo.toUpperCase().includes('SUBCONTRATADO') && (
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                        Obrigatório para Subcontratados
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Elevadores & Manutenção Silva Ltda ou Prestadora Parceira"
                    value={editFormData.empresa}
                    onChange={(e) => setEditFormData({ ...editFormData, empresa: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nome da empresa prestadora de serviços à qual o técnico terceirizado/subcontratado pertence.
                  </p>
                </div>

                {/* Nova Senha (Opcional) */}
                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Redefinir Senha (Opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Deixe em branco para manter a senha atual"
                    value={editFormData.novaSenha}
                    onChange={(e) => setEditFormData({ ...editFormData, novaSenha: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Preencha apenas caso queira trocar a senha deste colaborador (mínimo 6 caracteres).
                  </p>
                </div>

                {/* Seleção de Menus Permitidos */}
                <div className="sm:col-span-2 pt-3 border-t border-slate-200/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-tight">
                        🧭 Menus Visíveis na Barra Lateral *
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Marque quais menus este colaborador poderá visualizar e acessar no sistema:
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setEditFormData({
                            ...editFormData,
                            allowedMenus: APP_MENUS.map((m) => m.href),
                          })
                        }
                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg border border-orange-200 transition cursor-pointer"
                      >
                        ✓ Marcar Todos
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEditFormData({
                            ...editFormData,
                            allowedMenus: [],
                          })
                        }
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition cursor-pointer"
                      >
                        ✕ Desmarcar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/90 p-3 rounded-xl border border-slate-200">
                    {APP_MENUS.map((menu) => {
                      const isChecked = editFormData.allowedMenus.includes(menu.href);
                      return (
                        <label
                          key={menu.href}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-white border-orange-400 shadow-xs text-slate-900 font-semibold'
                              : 'bg-white/60 border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const next = isChecked
                                ? editFormData.allowedMenus.filter((h) => h !== menu.href)
                                : [...editFormData.allowedMenus, menu.href];
                              setEditFormData({ ...editFormData, allowedMenus: next });
                            }}
                            className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span>{menu.icon}</span>
                              <span className="text-[11px] font-bold leading-tight">{menu.label}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">{menu.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[10px] text-amber-900 flex items-center gap-2">
                    <span className="text-sm">🔒</span>
                    <span>
                      <strong>Acesso Restrito:</strong> Os menus <em>Gestão de Cadastros</em> e <em>Configurações da APR</em> são de visualização e uso exclusivo do Desenvolvedor Thiago Gregorio e não podem ser atribuídos a outros colaboradores.
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPendingTransition}
                  className="btn-tke-orange px-5 py-2 text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 cursor-pointer"
                >
                  {isPendingTransition ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO COLABORADOR */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>➕</span> Cadastrar Novo Colaborador
                </h3>
                <p className="text-xs text-slate-500">
                  Crie o cadastro com liberação imediata de acesso para a equipe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nome */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo da Silva"
                    value={newUserFormData.nome}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, nome: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    E-mail Corporativo *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="carlos.silva@tkelevadores.com"
                    value={newUserFormData.email}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, email: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Senha Inicial */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Senha Provisória *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 dígitos"
                    value={newUserFormData.senha}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, senha: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 98765-4321"
                    value={newUserFormData.telefone}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, telefone: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Documento / CPF */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Documento / CPF / Matrícula
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={newUserFormData.documento}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, documento: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Departamento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Departamento *
                  </label>
                  <select
                    value={newUserFormData.departamento}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        departamento: e.target.value as (typeof DEPARTAMENTOS)[number],
                      })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-medium"
                  >
                    {DEPARTAMENTOS.map((dep) => (
                      <option key={dep} value={dep}>
                        {dep}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Função / Cargo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Técnico de Reparo"
                    value={newUserFormData.cargo}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, cargo: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                {/* Status Inicial */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Status Inicial *
                  </label>
                  <select
                    value={newUserFormData.status}
                    onChange={(e) =>
                      setNewUserFormData({
                        ...newUserFormData,
                        status: e.target.value as 'ATIVO' | 'PENDENTE' | 'BLOQUEADO',
                      })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-semibold"
                  >
                    <option value="ATIVO">🟢 ATIVO (Acesso Imediato)</option>
                    <option value="PENDENTE">🟡 PENDENTE</option>
                    <option value="BLOQUEADO">🔴 BLOQUEADO</option>
                  </select>
                </div>

                {/* Nome da Empresa / Subcontratada */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      🏢 Nome da Empresa / Razão Social {newUserFormData.cargo.toUpperCase().includes('SUBCONTRATADO') ? '*' : '(Opcional)'}
                    </label>
                    {newUserFormData.cargo.toUpperCase().includes('SUBCONTRATADO') && (
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">
                        Obrigatório para Subcontratados
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: Elevadores & Manutenção Silva Ltda ou Prestadora Parceira"
                    value={newUserFormData.empresa}
                    onChange={(e) => setNewUserFormData({ ...newUserFormData, empresa: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Nome da empresa parceira ou razão social do prestador terceirizado/subcontratado.
                  </p>
                </div>

                {/* Seleção de Menus Permitidos */}
                <div className="sm:col-span-2 pt-3 border-t border-slate-200/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-tight">
                        🧭 Menus Visíveis na Barra Lateral *
                      </label>
                      <p className="text-[10px] text-slate-500">
                        Marque quais menus este colaborador poderá visualizar e acessar no sistema:
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setNewUserFormData({
                            ...newUserFormData,
                            allowedMenus: APP_MENUS.map((m) => m.href),
                          })
                        }
                        className="text-[10px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg border border-orange-200 transition cursor-pointer"
                      >
                        ✓ Marcar Todos
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setNewUserFormData({
                            ...newUserFormData,
                            allowedMenus: [],
                          })
                        }
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition cursor-pointer"
                      >
                        ✕ Desmarcar
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/90 p-3 rounded-xl border border-slate-200">
                    {APP_MENUS.map((menu) => {
                      const isChecked = newUserFormData.allowedMenus.includes(menu.href);
                      return (
                        <label
                          key={menu.href}
                          className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-white border-orange-400 shadow-xs text-slate-900 font-semibold'
                              : 'bg-white/60 border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const next = isChecked
                                ? newUserFormData.allowedMenus.filter((h) => h !== menu.href)
                                : [...newUserFormData.allowedMenus, menu.href];
                              setNewUserFormData({ ...newUserFormData, allowedMenus: next });
                            }}
                            className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span>{menu.icon}</span>
                              <span className="text-[11px] font-bold leading-tight">{menu.label}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5">{menu.desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-[10px] text-amber-900 flex items-center gap-2">
                    <span className="text-sm">🔒</span>
                    <span>
                      <strong>Acesso Restrito:</strong> Os menus <em>Gestão de Cadastros</em> e <em>Configurações da APR</em> são de visualização e uso exclusivo do Desenvolvedor Thiago Gregorio e não podem ser atribuídos a outros colaboradores.
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPendingTransition}
                  className="btn-tke-orange px-5 py-2 text-xs font-bold shadow-md shadow-orange-500/20 hover:shadow-orange-500/35 cursor-pointer"
                >
                  {isPendingTransition ? 'Cadastrando...' : 'Criar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {deletingUserId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4">
            <div className="text-center space-y-2">
              <span className="text-3xl block">⚠️</span>
              <h3 className="text-base font-black text-slate-900">Excluir Colaborador?</h3>
              <p className="text-xs text-slate-500">
                Esta ação removerá o colaborador do banco de dados e revogará seu acesso permanentemente.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUserId(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deletingUserId)}
                disabled={isPendingTransition}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
              >
                {isPendingTransition ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
