import { redirect } from 'next/navigation';

export default function DashboardOverviewPage() {
  // Define a tela de Permissões de Trabalho & APR como página inicial oficial da plataforma
  redirect('/dashboard/reparo/pt');
}
