import React from 'react';
import Link from 'next/link';

export default function AcessoNegadoPage() {
  return (
    <div className="max-w-md mx-auto my-12 bg-white border border-red-200 rounded-2xl p-8 text-center shadow-sm space-y-4">
      <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl mx-auto">
        🛡️
      </div>
      <h1 className="text-xl font-bold text-slate-900">Acesso Restrito (403)</h1>
      <p className="text-xs text-slate-500 leading-relaxed">
        Seu cargo ou departamento atual não possui permissão para acessar este módulo. Caso precise de autorização especial, contate o administrador do sistema.
      </p>

      <div className="pt-2 flex justify-center gap-3">
        <Link
          href="/dashboard"
          className="bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition"
        >
          Voltar ao Painel
        </Link>
        <Link
          href="/login"
          className="bg-white border border-slate-300 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition"
        >
          Trocar de Perfil
        </Link>
      </div>
    </div>
  );
}
