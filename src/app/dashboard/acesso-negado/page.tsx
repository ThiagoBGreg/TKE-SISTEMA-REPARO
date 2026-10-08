import React from 'react';
import Link from 'next/link';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { TkeLogo } from '@/components/ui/TkeLogo';

export default function AcessoNegadoPage() {
  return (
    <div className="max-w-md mx-auto my-12 bg-white border border-slate-200/90 rounded-3xl p-8 text-center shadow-lg space-y-5">
      <div className="flex justify-center">
        <TkeLogo variant="badge" size="md" />
      </div>

      <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-2xl mx-auto shadow-xs">
        🛡️
      </div>

      <div className="space-y-1">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Acesso Restrito (403)</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Seu cargo ou departamento atual não possui autorização para este módulo. Caso necessite de liberação, solicite à Administração TKE.
        </p>
      </div>

      <div className="pt-2 flex justify-center gap-3">
        <AnimatedButton
          href="/dashboard"
          variant="dark"
          size="sm"
          shimmer
          lift
        >
          Voltar ao Painel
        </AnimatedButton>

        <AnimatedButton
          href="/login"
          variant="outline"
          size="sm"
          lift
        >
          Trocar de Perfil
        </AnimatedButton>
      </div>
    </div>
  );
}

