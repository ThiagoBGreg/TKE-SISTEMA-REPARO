'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { getPendingUsersAction, updateUserApprovalAction } from '@/actions/authActions';
import { useRBAC } from '@/hooks/useRBAC';

interface PendingUserItem {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  documento?: string | null;
  departamento: string;
  cargo: string;
  status: string;
  createdAt: Date;
}

export default function UsuariosPage() {
  const { user } = useRBAC();
  const [isPendingTransition, startTransition] = useTransition();
  const [pendingUsers, setPendingUsers] = useState<PendingUserItem[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchPendingUsers = () => {
    startTransition(async () => {
      const result = await getPendingUsersAction();
      if (result.success) {
        setPendingUsers(result.users);
      }
    });
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId: string, userName: string, approve: boolean) => {
    const adminId = user?.id || '00000000-0000-0000-0000-000000000001';
    const status = approve ? 'ATIVO' : 'BLOQUEADO';

    const result = await updateUserApprovalAction(userId, status, adminId);

    if (result.success) {
      setActionMessage(
        approve
          ? `Usuário ${userName} foi AUTORIZADO com sucesso!`
          : `Cadastro de ${userName} foi RECUSADO/BLOQUEADO.`
      );
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-bold text-red-600 tracking-wider uppercase">
            Administração de Acessos • TKE
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Aprovação de Usuários & Cadastros
          </h1>
          <p className="text-xs text-slate-500">
            Somente administradores podem liberar o acesso de novos colaboradores e prestadores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200">
            {pendingUsers.length} cadastro(s) pendente(s)
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <span>✅</span>
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Lista de Cadastros Pendentes */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isPendingTransition ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold space-y-2">
            <span className="animate-spin text-2xl block">⏳</span>
            <span>Verificando solicitações de cadastro...</span>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <span className="text-3xl block">🎉</span>
            <h3 className="text-sm font-bold text-slate-800">Tudo em dia!</h3>
            <p className="text-xs text-slate-400">
              Não há nenhum cadastro aguardando aprovação no momento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingUsers.map((pendingUser) => (
              <div
                key={pendingUser.id}
                className="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{pendingUser.nome}</span>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                      {pendingUser.departamento}
                    </span>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                      Pendente
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      ✉️ <strong>E-mail:</strong> {pendingUser.email}
                    </span>
                    <span>
                      👔 <strong>Cargo Solicitado:</strong> {pendingUser.cargo}
                    </span>
                    {pendingUser.telefone && (
                      <span>
                        📞 <strong>Tel:</strong> {pendingUser.telefone}
                      </span>
                    )}
                    {pendingUser.documento && (
                      <span>
                        📄 <strong>Doc:</strong> {pendingUser.documento}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Solicitado em: {new Date(pendingUser.createdAt).toLocaleString('pt-BR')}
                  </div>
                </div>

                {/* Botões de Ação do Administrador */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApprove(pendingUser.id, pendingUser.nome, false)}
                    className="bg-white border border-slate-300 hover:bg-red-50 hover:text-red-700 text-slate-600 text-xs font-semibold px-3.5 py-2 rounded-xl transition"
                  >
                    ✕ Recusar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(pendingUser.id, pendingUser.nome, true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <span>✓</span> Autorizar Acesso
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
