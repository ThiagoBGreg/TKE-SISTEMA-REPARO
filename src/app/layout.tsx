import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TKE • Sistema de Gestão e Monitoramento de Reparos',
  description: 'Plataforma integrada de gestão operacional de serviços de reparo, APRs digitais e controle de fluxo TKE MOVE BEYOND.',
  icons: {
    icon: '/images/tke-symbol.png',
    apple: '/images/tke-symbol.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
