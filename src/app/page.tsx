import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-red-600">
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-black text-xl shadow-lg shadow-red-600/30">
            T
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">TKE</span>
            <span className="text-xs text-slate-400 block -mt-1 font-medium">Sistema de Reparo & APR</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-lg transition hover:bg-slate-800"
          >
            Entrar
          </Link>
          <Link
            href="/dashboard"
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md shadow-red-600/20 transition"
          >
            Acessar Painel →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Plataforma Operacional Vercel + Neon Serverless
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Gestão Inteligente & Monitoramento de{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-amber-400">
            Serviços de Reparo
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Fluxo digital completo de ponta a ponta: emissão de Permissão de Trabalho (PT/APR), assinaturas com geolocalização, controle de suprimentos, frotas DLOG e aprovação técnica OSH.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/dashboard/reparo/pt"
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-red-600/30 transition transform active:scale-95"
          >
            ✍️ Emitir PT / APR Digital
          </Link>
          <Link
            href="/login"
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm px-6 py-3.5 rounded-xl transition"
          >
            Selecionar Perfil / Login
          </Link>
        </div>

        {/* Departamentos Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-12 text-left">
          {[
            { tag: 'REPARO', desc: 'Ordens de Serviço e Manutenção', color: 'border-red-500/30 bg-red-950/20 text-red-300' },
            { tag: 'SERVIÇOS', desc: 'Comercial e Engenharia', color: 'border-blue-500/30 bg-blue-950/20 text-blue-300' },
            { tag: 'OSH', desc: 'Segurança e Laudos NR', color: 'border-amber-500/30 bg-amber-950/20 text-amber-300' },
            { tag: 'DLOG', desc: 'Logística e Motoristas', color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300' },
            { tag: 'ADM', desc: 'Pagamento Subcontratados', color: 'border-purple-500/30 bg-purple-950/20 text-purple-300' },
          ].map((item) => (
            <div
              key={item.tag}
              className={`p-4 rounded-xl border ${item.color} backdrop-blur-xs flex flex-col justify-between`}
            >
              <span className="font-bold text-xs tracking-wider">{item.tag}</span>
              <span className="text-[11px] text-slate-400 mt-2">{item.desc}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} TKE Elevadores • Sistema de Gestão de Reparos. Hospedado na Vercel com Neon Postgres.
      </footer>
    </div>
  );
}
