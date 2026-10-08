'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq, desc, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { AuthUser } from '@/types/auth';

/* ==========================================================================
   CREDENCIAS DO ADMINISTRADOR PADRÃO
   ========================================================================== */
const ADMIN_EMAIL = 'thiago.gregorio@tke.com';
const ADMIN_NAME = 'Thiago Gregorio';
const ADMIN_SENHA = 'Thiago200189';
const ADMIN_ID = '00000000-0000-0000-0000-000000000001';

const registerSchema = z.object({
  nome: z.string().min(3, 'Nome e sobrenome são obrigatórios'),
  email: z.string().email('E-mail corporativo inválido'),
  senha: z.string().min(6, 'A senha deve conter no mínimo 6 caracteres'),
  departamento: z.enum(['REPARO', 'SERVICOS', 'OSH', 'DLOG', 'ADMINISTRATIVO']),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  telefone: z.string().optional(),
  documento: z.string().optional(),
});

export type AuthActionResult =
  | { success: true; message?: string; user?: AuthUser; redirect?: string }
  | { success: false; error: string };

/**
 * Garante que o usuário Admin Thiago Gregorio esteja semeado no banco de dados
 */
async function ensureAdminExists() {
  try {
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, ADMIN_EMAIL), ilike(users.nome, ADMIN_NAME)))
      .limit(1);

    if (!existingAdmin) {
      await db.insert(users).values({
        id: ADMIN_ID,
        nome: ADMIN_NAME,
        email: ADMIN_EMAIL,
        senhaHash: ADMIN_SENHA,
        departamento: 'ADMINISTRATIVO',
        cargo: 'ADMINISTRATIVO',
        status: 'ATIVO',
        isAdmin: true,
      });
    }
  } catch (err) {
    console.warn('[ensureAdminExists] Aviso ao sincronizar admin no banco:', err);
  }
}

/**
 * Server Action de Login (Aceita Nome e Sobrenome ou E-mail)
 */
export async function loginUserAction(formData: FormData): Promise<AuthActionResult> {
  try {
    const identificador = (
      (formData.get('identificador') ||
        formData.get('nome') ||
        formData.get('email')) as string
    )?.trim();
    const senha = (formData.get('senha') as string)?.trim();

    if (!identificador || !senha) {
      return { success: false, error: 'Informe seu Nome e Sobrenome e a senha de acesso.' };
    }

    const identLower = identificador.toLowerCase();

    // 1. Verificação Especial do Administrador Thiago Gregorio
    if (
      (identLower === 'thiago gregorio' ||
        identLower === 'thiagogregorio' ||
        identLower === 'thiago' ||
        identLower === ADMIN_EMAIL ||
        identLower === 'admin') &&
      senha === ADMIN_SENHA
    ) {
      await ensureAdminExists();

      const adminUser: AuthUser = {
        id: ADMIN_ID,
        nome: 'Thiago Gregorio',
        email: ADMIN_EMAIL,
        departamento: 'ADMINISTRATIVO',
        cargo: 'ADMINISTRATIVO',
        status: 'ATIVO',
      };

      const cookieStore = await cookies();
      const sessionBase64 = Buffer.from(JSON.stringify(adminUser)).toString('base64');
      cookieStore.set('tke_session', sessionBase64, {
        path: '/',
        maxAge: 86400 * 7,
        sameSite: 'lax',
      });

      return { success: true, user: adminUser, redirect: '/dashboard' };
    }

    // 2. Busca o usuário no banco Neon Postgres pelo Nome e Sobrenome OU E-mail
    const [user] = await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.nome, identificador),
          ilike(users.email, identificador),
          sql`LOWER(TRIM(${users.nome})) = LOWER(TRIM(${identificador}))`
        )
      )
      .limit(1);

    if (!user) {
      return {
        success: false,
        error:
          'Usuário não encontrado. Verifique se digitou o Nome e Sobrenome corretamente ou solicite seu cadastro.',
      };
    }

    // 3. Verificação de Senha
    if (user.senhaHash && user.senhaHash !== senha) {
      return { success: false, error: 'Senha incorreta. Tente novamente.' };
    }

    // 4. Verificação de Status do Usuário
    if (user.status === 'PENDENTE') {
      return {
        success: false,
        error:
          'Seu cadastro foi realizado com sucesso e está AGUARDANDO APROVAÇÃO do Administrador. Você receberá a liberação em breve.',
      };
    }

    if (user.status === 'BLOQUEADO' || user.status === 'INATIVO') {
      return {
        success: false,
        error: 'Sua conta de acesso está inativa ou foi bloqueada pelo Administrador.',
      };
    }

    // 5. Cria a sessão do usuário
    const authUser: AuthUser = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      departamento: user.departamento,
      cargo: user.cargo,
      status: user.status,
    };

    const cookieStore = await cookies();
    const sessionBase64 = Buffer.from(JSON.stringify(authUser)).toString('base64');
    cookieStore.set('tke_session', sessionBase64, {
      path: '/',
      maxAge: 86400 * 7,
      sameSite: 'lax',
    });

    return { success: true, user: authUser, redirect: '/dashboard' };
  } catch (error) {
    console.error('[loginUserAction] Erro:', error);
    return { success: false, error: 'Erro interno ao realizar login. Tente novamente.' };
  }
}

/**
 * Server Action de Cadastro de Novo Usuário (Fica com status PENDENTE)
 */
export async function registerUserAction(formData: FormData): Promise<AuthActionResult> {
  try {
    const rawData = {
      nome: formData.get('nome') as string,
      email: (formData.get('email') as string)?.trim().toLowerCase(),
      senha: formData.get('senha') as string,
      departamento: formData.get('departamento') as any,
      cargo: formData.get('cargo') as string,
      telefone: (formData.get('telefone') as string) || undefined,
      documento: (formData.get('documento') as string) || undefined,
    };

    const validation = registerSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Preencha todos os campos obrigatórios.',
      };
    }

    const data = validation.data;

    // 1. Verifica se o e-mail já existe
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existing) {
      return {
        success: false,
        error: 'Este endereço de e-mail já está cadastrado no sistema.',
      };
    }

    // 2. Insere novo usuário com status PENDENTE
    await db.insert(users).values({
      nome: data.nome,
      email: data.email,
      senhaHash: data.senha,
      departamento: data.departamento,
      cargo: data.cargo as any,
      telefone: data.telefone,
      documento: data.documento,
      status: 'PENDENTE',
      isAdmin: false,
    });

    // 3. Notifica o Administrador
    await db.insert(notifications).values({
      departamento: 'ADMINISTRATIVO',
      titulo: `Novo Cadastro Pendente: ${data.nome}`,
      mensagem: `${data.nome} solicitou acesso como ${data.cargo} no departamento ${data.departamento}.`,
      link: '/dashboard/usuarios',
    });

    return {
      success: true,
      message:
        'Cadastro realizado com sucesso! Por motivos de segurança corporativa, seu acesso está aguardando autorização do Administrador.',
    };
  } catch (error) {
    console.error('[registerUserAction] Erro:', error);
    return { success: false, error: 'Erro ao registrar solicitação de cadastro.' };
  }
}

/**
 * Server Action para Logout
 */
export async function logoutUserAction() {
  const cookieStore = await cookies();
  cookieStore.delete('tke_session');
  return { success: true };
}

/**
 * Busca todos os usuários pendentes de aprovação (Uso Exclusivo do Administrador)
 */
export async function getPendingUsersAction() {
  try {
    const pendingList = await db
      .select({
        id: users.id,
        nome: users.nome,
        email: users.email,
        telefone: users.telefone,
        documento: users.documento,
        departamento: users.departamento,
        cargo: users.cargo,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.status, 'PENDENTE'))
      .orderBy(desc(users.createdAt));

    return { success: true, users: pendingList };
  } catch (error) {
    console.error('[getPendingUsersAction] Erro:', error);
    return { success: false, users: [] };
  }
}

/**
 * Aprova ou Rejeita o cadastro de um usuário (Uso Exclusivo do Administrador)
 */
export async function updateUserApprovalAction(
  userId: string,
  novoStatus: 'ATIVO' | 'BLOQUEADO',
  adminId: string
) {
  try {
    await db
      .update(users)
      .set({
        status: novoStatus,
        aprovadoPorId: adminId,
        dataAprovacao: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath('/dashboard/usuarios');
    return { success: true };
  } catch (error) {
    console.error('[updateUserApprovalAction] Erro:', error);
    return { success: false, error: 'Erro ao atualizar status do usuário.' };
  }
}
