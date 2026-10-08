import { NextRequest, NextResponse } from 'next/server';
import { canAccessRoute, isSuperAdmin } from './lib/permissions';
import { AuthUser } from './types/auth';

/**
 * Rotas públicas que não necessitam de autenticação
 */
const PUBLIC_PATHS = [
  '/login',
  '/recuperar-senha',
  '/api/auth',
  '/favicon.ico',
];

/**
 * Função utilitária para extrair o usuário da sessão/cookie (Edge compatible)
 * Compatível com JWT / Sessão Cookie do Next.js / Auth.js / Custom Auth
 */
function getAuthUserFromRequest(request: NextRequest): AuthUser | null {
  const sessionCookie = request.cookies.get('tke_session')?.value;
  
  if (!sessionCookie) return null;

  try {
    // Decodifica o payload da sessão (base64 JSON ou JWT decodificado)
    const decoded = JSON.parse(
      Buffer.from(sessionCookie, 'base64').toString('utf-8')
    ) as AuthUser;

    return decoded;
  } catch (error) {
    console.error('[Middleware] Erro ao decodificar sessão do usuário:', error);
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permite acesso irrestrito a rotas públicas e arquivos estáticos
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublicPath || pathname.startsWith('/_next') || pathname.startsWith('/assets')) {
    return NextResponse.next();
  }

  // 2. Extrai os dados do usuário autenticado
  const user = getAuthUserFromRequest(request);

  // 3. Caso não autenticado, redireciona para a tela de login mantendo o callbackUrl
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Caso o usuário esteja inativo ou bloqueado
  if (user.status !== 'ATIVO') {
    const blockedUrl = new URL('/login', request.url);
    blockedUrl.searchParams.set('error', 'usuario_inativo_ou_bloqueado');
    const response = NextResponse.redirect(blockedUrl);
    response.cookies.delete('tke_session');
    return response;
  }

  // 5. Superadministrador (Thiago Gregorio): Acesso total irrestrito a todas as rotas e módulos
  if (isSuperAdmin(user)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-department', user.departamento);
    requestHeaders.set('x-user-role', user.cargo);
    requestHeaders.set('x-is-admin', 'true');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 6. Verificação de RBAC (Departamento / Cargo / Rota)
  const hasAccess = canAccessRoute(pathname, user);

  if (!hasAccess) {
    // Redireciona para página amigável de Acesso Negado (403)
    const forbiddenUrl = new URL('/dashboard/acesso-negado', request.url);
    forbiddenUrl.searchParams.set('modulo', pathname);
    return NextResponse.rewrite(forbiddenUrl, { status: 403 });
  }

  // 6. Injeta cabeçalhos úteis para Server Components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-department', user.departamento);
  requestHeaders.set('x-user-role', user.cargo);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Matcher configurado para interceptar apenas rotas de aplicação e APIs privadas
 */
export const config = {
  matcher: [
    /*
     * Intercepta todas as requisições exceto:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Imagens públicas (.svg, .png, .jpg, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
