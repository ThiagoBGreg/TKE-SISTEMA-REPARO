import { NextRequest, NextResponse } from 'next/server';
import { canAccessRoute, isSuperAdmin, isThiagoDev } from './lib/permissions';
import { AuthUser } from './types/auth';

/**
 * Rotas públicas que não necessitam de autenticação
 */
const PUBLIC_PATHS = [
  '/login',
  '/recuperar-senha',
  '/api/auth',
  '/api/pt',
  '/api/relatorios',
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
  const isPublicPath =
    pathname === '/' ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/api/home-config') ||
    pathname.startsWith('/api/upload-media') ||
    PUBLIC_PATHS.some((path) => pathname.startsWith(path));
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

  // 5. Exclusividade estrita: Configurações de APR e Gestão de Cadastros são de acesso exclusivo do Dev Thiago Gregorio
  const isAprConfigRoute = pathname.startsWith('/dashboard/apr-config');
  const isUsuariosRoute = pathname.startsWith('/dashboard/usuarios');
  if (isAprConfigRoute || isUsuariosRoute) {
    if (!isThiagoDev(user)) {
      const forbiddenUrl = new URL('/dashboard/acesso-negado', request.url);
      forbiddenUrl.searchParams.set('modulo', pathname);
      return NextResponse.rewrite(forbiddenUrl, { status: 403 });
    }
  }

  // 6. Thiago Gregorio (Dev): Acesso total irrestrito a todas as rotas e módulos
  if (isThiagoDev(user) || isSuperAdmin(user)) {
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

  // 7. Injeta cabeçalhos úteis para Server Components e estende a sessão (Sliding Window de 1 ano)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-department', user.departamento);
  requestHeaders.set('x-user-role', user.cargo);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Garante que o cookie de sessão seja sempre renovado por 1 ano, nunca expirando involuntariamente
  const sessionCookieVal = request.cookies.get('tke_session')?.value;
  if (sessionCookieVal) {
    const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
    response.cookies.set('tke_session', sessionCookieVal, {
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
      expires: new Date(Date.now() + ONE_YEAR_SECONDS * 1000),
      sameSite: 'lax',
    });
  }

  return response;
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
