'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createQuickRepairRequestAction } from '@/actions/quickRepairActions';
import { AuthUser } from '@/types/auth';

export function QuickRepairRequestDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOS, setCreatedOS] = useState<{ id: string; codigo: string } | null>(null);

  // Form States
  const [contratoOrcamento, setContratoOrcamento] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [equipamentoNumero, setEquipamentoNumero] = useState('');
  const [temCasaDeMaquinas, setTemCasaDeMaquinas] = useState(true);
  const [categoriaReparo, setCategoriaReparo] = useState('CABOS_DE_TRAÇÃO');
  const [prioridade, setPrioridade] = useState('URGENTE');
  const [descricao, setDescricao] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<{ file: File; preview: string } | null>(null);

  // Recupera usuário autenticado dos cookies
  useEffect(() => {
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
    }
  }, []);

  const isSupervisorOrGestor =
    user &&
    ['GESTOR', 'SUPERVISOR'].includes(user.cargo) &&
    ['REPARO', 'SERVICOS'].includes(user.departamento);

  const handleOpenClick = () => {
    if (!user) {
      router.push('/login?callbackUrl=/');
      return;
    }
    setIsOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setSelectedPhoto({
      file,
      preview: URL.createObjectURL(file),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('contratoOrcamento', contratoOrcamento);
      formData.append('clienteNome', clienteNome);
      formData.append('equipamentoNumero', equipamentoNumero);
      formData.append('temCasaDeMaquinas', String(temCasaDeMaquinas));
      formData.append('categoriaReparo', categoriaReparo);
      formData.append('prioridade', prioridade);
      formData.append('descricao', descricao);
      if (selectedPhoto) {
        formData.append('foto', selectedPhoto.file);
      }

      const result = await createQuickRepairRequestAction(formData, user);

      if (!result.success) {
        setErrorMessage(result.error);
        setIsSubmitting(false);
        return;
      }

      setCreatedOS({ id: result.osId, codigo: result.codigo });
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao submeter solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Botão de Disparo na Hero Section */}
      <button
        type="button"
        onClick={handleOpenClick}
        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-red-600/30 transition transform active:scale-95 flex items-center gap-2"
      >
        <span>⚡</span> Solicitar Reparo / Abrir Chamado
      </button>

      {/* Modal / Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-left text-white">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                  TKE • Solicitação Rápida
                </span>
                <h3 className="text-base font-bold text-white">
                  Abertura de Chamado Emergencial / Orçamento
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setCreatedOS(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Bloqueio se não for Gestor/Supervisor */}
              {!isSupervisorOrGestor ? (
                <div className="p-6 bg-red-950/40 border border-red-800/60 rounded-2xl text-center space-y-3">
                  <span className="text-3xl block">🛡️</span>
                  <h4 className="text-sm font-bold text-red-400">Perfil Não Autorizado</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Você está conectado como <strong>{user?.nome}</strong> ({user?.cargo} -{' '}
                    {user?.departamento}). A abertura rápida de chamados de reparo é de uso exclusivo da{' '}
                    <strong>Gestão e Supervisão Técnica</strong>.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/login"
                      className="inline-block bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                    >
                      Trocar para Perfil Gestor
                    </Link>
                  </div>
                </div>
              ) : createdOS ? (
                /* Sucesso com Protocolo da OS */
                <div className="p-6 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl text-center space-y-3 animate-in fade-in">
                  <span className="text-3xl block">🎉</span>
                  <h4 className="text-base font-bold text-emerald-400">
                    Chamado {createdOS.codigo} Aberto com Sucesso!
                  </h4>
                  <p className="text-xs text-slate-300">
                    A Ordem de Serviço foi cadastrada no Neon Postgres e a equipe operacional foi notificada.
                  </p>
                  <div className="pt-3 flex justify-center gap-3">
                    <Link
                      href={`/dashboard/reparo`}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
                    >
                      Ver no Painel Operacional →
                    </Link>
                  </div>
                </div>
              ) : (
                /* Formulário de Abertura */
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {errorMessage && (
                    <div className="p-3 bg-red-950/60 border border-red-700 text-red-300 rounded-xl">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Contrato / Orçamento *
                      </label>
                      <input
                        type="text"
                        required
                        value={contratoOrcamento}
                        onChange={(e) => setContratoOrcamento(e.target.value)}
                        placeholder="Ex: CT-2026-8812"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Edifício / Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        value={clienteNome}
                        onChange={(e) => setClienteNome(e.target.value)}
                        placeholder="Ex: Condomínio Grand Tower"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Equipamento (Nº/Nome) *
                      </label>
                      <input
                        type="text"
                        required
                        value={equipamentoNumero}
                        onChange={(e) => setEquipamentoNumero(e.target.value)}
                        placeholder="Ex: Elevador Social 02"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">
                        Criticidade / Urgência *
                      </label>
                      <select
                        value={prioridade}
                        onChange={(e) => setPrioridade(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="BAIXA">Baixa</option>
                        <option value="MEDIA">Média</option>
                        <option value="ALTA">Alta</option>
                        <option value="URGENTE">Urgente (Elevador Paralisado)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Categoria do Reparo *
                    </label>
                    <select
                      value={categoriaReparo}
                      onChange={(e) => setCategoriaReparo(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="CABOS_DE_TRAÇÃO">Cabos de Tração (troca/encurtamento/equalização)</option>
                      <option value="MAQUINA_E_MOTOR">Máquinas de Tração e Motores</option>
                      <option value="CABOS_DE_MANOBRA_ELETRICA">Cabos de Manobra e Elétrica</option>
                      <option value="LUBRIFICACAO_OLEO">Troca de Óleo e Lubrificação</option>
                      <option value="OUTROS_REPAROS">Outros Reparos Mecânicos</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={temCasaDeMaquinas}
                      onChange={(e) => setTemCasaDeMaquinas(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 bg-slate-800 border-slate-700"
                    />
                    <span className="text-slate-300">Equipamento possui Casa de Máquinas</span>
                  </label>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Descrição da Falha / Escopo Inicial *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descreva ruídos anormais, desgaste visual, vibrações ou componente danificado..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Foto Preliminar */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-slate-300 font-semibold">
                      Foto Preliminar do Componente (Opcional - Google Drive):
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
                    />

                    {selectedPhoto && (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700 mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedPhoto.preview}
                          alt="Foto preliminar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Botão de Envio */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin text-sm">⏳</span> Gerando OS no Neon...
                        </>
                      ) : (
                        '⚡ Confirmar e Abrir Chamado'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
