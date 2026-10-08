import { relations, sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { DigitalSignature, PtReparoFormData } from '@/lib/validations/ptReparoSchema';

/* ==========================================================================
   1. ENUMS (PostgreSQL Types)
   ========================================================================== */

/**
 * Departamentos da organização TKE
 */
export const departmentEnum = pgEnum('department', [
  'REPARO',
  'SERVICOS',
  'OSH',
  'DLOG',
  'ADMINISTRATIVO',
]);

/**
 * Cargos/Papéis consolidados de todos os departamentos
 */
export const userRoleEnum = pgEnum('user_role', [
  // Reparo & Gerais
  'GESTOR',
  'ADMINISTRATIVO',
  'SUPERVISOR',
  'ESTAGIARIO',
  'APRENDIZ',
  'SUBCONTRATADO',
  // Serviços
  'GERENTE',
  'COORDENADOR',
  'CONSULTOR_COMERCIAL',
  'TECNICO',
  // OSH
  'TECNICO_SEGURANCA',
  // DLOG
  'MOTORISTA',
  // Administrativo
  'PAGAMENTO_SUBCONTRATADO',
]);

/**
 * Status do usuário no sistema
 */
export const userStatusEnum = pgEnum('user_status', [
  'ATIVO',
  'INATIVO',
  'PENDENTE',
  'BLOQUEADO',
]);

/**
 * Fluxo de Status da Ordem de Serviço de Reparo
 */
export const serviceOrderStatusEnum = pgEnum('service_order_status', [
  'PENDENTE',
  'EM_APROVACAO_OSH',
  'AGUARDANDO_LOGISTICA',
  'EM_EXECUCAO',
  'VALIDACAO_TECNICA',
  'CONCLUIDA',
  'CANCELADA',
]);

/**
 * Nível de Prioridade da OS
 */
export const serviceOrderPriorityEnum = pgEnum('service_order_priority', [
  'BAIXA',
  'MEDIA',
  'ALTA',
  'URGENTE',
]);

/**
 * Status da Permissão de Trabalho (PT / APR)
 */
export const workPermitStatusEnum = pgEnum('work_permit_status', [
  'EM_ANDAMENTO',
  'EM_ANALISE_OSH',
  'APROVADA',
  'FINALIZADA',
  'CANCELADA',
]);

/**
 * Categorias de Anexo/Evidência de Campo
 */
export const attachmentCategoryEnum = pgEnum('attachment_category', [
  'FOTO_SERVICO',
  'CARTA_CONCLUSAO',
]);

/* ==========================================================================
   2. DOMAIN ROLE MAPPING (TypeScript Strict Validation)
   ========================================================================== */

export const DEPARTMENT_ROLES = {
  REPARO: [
    'GESTOR',
    'ADMINISTRATIVO',
    'SUPERVISOR',
    'ESTAGIARIO',
    'APRENDIZ',
    'SUBCONTRATADO',
  ],
  SERVICOS: [
    'GERENTE',
    'COORDENADOR',
    'GESTOR',
    'SUPERVISOR',
    'CONSULTOR_COMERCIAL',
    'TECNICO',
  ],
  OSH: [
    'COORDENADOR',
    'ADMINISTRATIVO',
    'TECNICO_SEGURANCA',
  ],
  DLOG: [
    'ADMINISTRATIVO',
    'MOTORISTA',
  ],
  ADMINISTRATIVO: [
    'ADMINISTRATIVO',
    'PAGAMENTO_SUBCONTRATADO',
  ],
} as const;

export type DepartmentType = keyof typeof DEPARTMENT_ROLES;
export type RoleByDepartment<D extends DepartmentType> = (typeof DEPARTMENT_ROLES)[D][number];

/* ==========================================================================
   3. TABELAS (PostgreSQL Tables)
   ========================================================================== */

/**
 * Tabela de Usuários vinculada à autenticação
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    nome: varchar('nome', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    senhaHash: text('senha_hash'),
    telefone: varchar('telefone', { length: 30 }),
    documento: varchar('documento', { length: 30 }), // CPF ou CNPJ para extratos
    avatarUrl: text('avatar_url'),
    departamento: departmentEnum('departamento').notNull(),
    cargo: userRoleEnum('cargo').notNull(),
    status: userStatusEnum('status').default('PENDENTE').notNull(),
    isAdmin: boolean('is_admin').default(false).notNull(),
    aprovadoPorId: uuid('aprovado_por_id'),
    dataAprovacao: timestamp('data_aprovacao', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('users_email_unique_idx').on(table.email),
    index('users_dept_cargo_idx').on(table.departamento, table.cargo),
    index('users_status_idx').on(table.status),
    index('users_is_admin_idx').on(table.isAdmin),
  ]
);

/**
 * Tabela de Ordens de Serviço (OS de Reparo)
 */
export const serviceOrders = pgTable(
  'service_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    codigo: varchar('codigo', { length: 50 }).notNull(), // Ex: "OS-2026-0001"
    titulo: varchar('titulo', { length: 255 }).notNull(),
    descricao: text('descricao').notNull(),
    status: serviceOrderStatusEnum('status').default('PENDENTE').notNull(),
    prioridade: serviceOrderPriorityEnum('prioridade').default('MEDIA').notNull(),
    categoriaReparo: varchar('categoria_reparo', { length: 100 }), // Cabos de Aço, Motor/Tração, Troca de Óleo, etc.

    // Identificação do Equipamento / Cliente
    clienteNome: varchar('cliente_nome', { length: 255 }),
    clienteUnidade: varchar('cliente_unidade', { length: 255 }),
    equipamentoNumero: varchar('equipamento_numero', { length: 100 }),
    localizacao: text('localizacao'),
    temCasaDeMaquinas: boolean('tem_casa_de_maquinas').default(true),

    // Aspectos Financeiros & Medições
    valorServico: numeric('valor_servico', { precision: 10, scale: 2 }).default('0.00'),
    statusFinanceiro: varchar('status_financeiro', { length: 50 }).default('PENDENTE').notNull(), // PENDENTE, APROVADO, LIQUIDADO

    // Responsáveis e Atores da OS
    criadoPorId: uuid('criado_por_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    responsavelTecnicoId: uuid('responsavel_tecnico_id')
      .references(() => users.id, { onDelete: 'set null' }),
    subcontratadoId: uuid('subcontratado_id')
      .references(() => users.id, { onDelete: 'set null' }),
    motoristaId: uuid('motorista_id')
      .references(() => users.id, { onDelete: 'set null' }),

    // Prazos e Datas
    dataPrevisao: timestamp('data_previsao', { withTimezone: true }),
    dataInicio: timestamp('data_inicio', { withTimezone: true }),
    dataConclusao: timestamp('data_conclusao', { withTimezone: true }),

    // Informações adicionais
    observacoes: text('observacoes'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('service_orders_codigo_unique_idx').on(table.codigo),
    index('service_orders_status_idx').on(table.status),
    index('service_orders_prioridade_idx').on(table.prioridade),
    index('service_orders_status_prioridade_idx').on(table.status, table.prioridade),
    index('service_orders_responsavel_tecnico_idx').on(table.responsavelTecnicoId),
    index('service_orders_subcontratado_idx').on(table.subcontratadoId),
    index('service_orders_motorista_idx').on(table.motoristaId),
    index('service_orders_criado_por_idx').on(table.criadoPorId),
    index('service_orders_financeiro_idx').on(table.statusFinanceiro),
    index('service_orders_created_at_idx').on(table.createdAt.desc()),
  ]
);

/**
 * Tabela de Permissão de Trabalho (PT / APR - Reparo)
 */
export const workPermits = pgTable(
  'work_permits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceOrderId: uuid('service_order_id')
      .references(() => serviceOrders.id, { onDelete: 'cascade' })
      .notNull(),
    codigo: varchar('codigo', { length: 50 }).notNull(), // Ex: "PT-2026-0001"
    status: workPermitStatusEnum('status').default('EM_ANDAMENTO').notNull(),
    criadoPorId: uuid('criado_por_id').references(() => users.id, { onDelete: 'set null' }),

    // Campos Chave indexáveis
    contratoOrcamento: varchar('contrato_orcamento', { length: 100 }).notNull(),
    equipamento: varchar('equipamento', { length: 100 }).notNull(),
    tipoMaoDeObra: varchar('tipo_mao_de_obra', { length: 50 }).notNull(),
    tipoEquipamento: varchar('tipo_equipamento', { length: 50 }).notNull(),
    classificacaoReparo: varchar('classificacao_reparo', { length: 50 }).notNull(),
    trabalhoEmAltura: boolean('trabalho_em_altura').default(false).notNull(),

    // Assinaturas Digitais em Destaque para Auditoria Rápida
    assinaturaSupervisao: jsonb('assinatura_supervisao').$type<DigitalSignature>(),
    assinaturaInicio: jsonb('assinatura_inicio').$type<DigitalSignature>().notNull(),
    assinaturaTermino: jsonb('assinatura_termino').$type<DigitalSignature>(),

    // Payload Estruturado Completo
    dadosCompletos: jsonb('dados_completos').$type<PtReparoFormData>().notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('work_permits_codigo_unique_idx').on(table.codigo),
    index('work_permits_service_order_idx').on(table.serviceOrderId),
    index('work_permits_status_idx').on(table.status),
    index('work_permits_contrato_idx').on(table.contratoOrcamento),
    index('work_permits_created_at_idx').on(table.createdAt.desc()),
  ]
);

/**
 * Tabela de Anexos e Evidências Fotográficas (Armazenadas no Google Drive)
 */
export const serviceOrderAttachments = pgTable(
  'service_order_attachments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceOrderId: uuid('service_order_id')
      .references(() => serviceOrders.id, { onDelete: 'cascade' })
      .notNull(),
    uploadedById: uuid('uploaded_by_id')
      .references(() => users.id, { onDelete: 'set null' }),
    category: attachmentCategoryEnum('category').notNull(),
    driveFileId: text('drive_file_id').notNull(),
    driveViewUrl: text('drive_view_url').notNull(),
    driveDownloadUrl: text('drive_download_url'),
    fileName: text('file_name').notNull(),
    fileSize: integer('file_size'),
    mimeType: text('mime_type'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('so_attach_order_id_idx').on(table.serviceOrderId),
    index('so_attach_category_idx').on(table.category),
    index('so_attach_uploaded_by_idx').on(table.uploadedById),
    index('so_attach_created_at_idx').on(table.createdAt.desc()),
  ]
);

/**
 * Tabela de Notificações Internas para Gestores e Equipes
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    departamento: departmentEnum('departamento'),
    titulo: varchar('titulo', { length: 255 }).notNull(),
    mensagem: text('mensagem').notNull(),
    link: text('link'),
    lida: boolean('lida').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId),
    index('notifications_dept_idx').on(table.departamento),
    index('notifications_lida_idx').on(table.lida),
    index('notifications_created_at_idx').on(table.createdAt.desc()),
  ]
);

/**
 * Tabela de Auditoria e Histórico da Ordem de Serviço
 */
export const serviceOrderHistory = pgTable(
  'service_order_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    serviceOrderId: uuid('service_order_id')
      .references(() => serviceOrders.id, { onDelete: 'cascade' })
      .notNull(),
    alteradoPorId: uuid('alterado_por_id')
      .references(() => users.id, { onDelete: 'set null' }),
    statusAnterior: serviceOrderStatusEnum('status_anterior'),
    statusNovo: serviceOrderStatusEnum('status_novo'),
    acao: varchar('acao', { length: 100 }).notNull(),
    descricao: text('descricao').notNull(),
    alteracoes: jsonb('alteracoes')
      .$type<Record<string, { antes: unknown; depois: unknown }>>()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('so_history_service_order_id_idx').on(table.serviceOrderId),
    index('so_history_alterado_por_idx').on(table.alteradoPorId),
    index('so_history_created_at_idx').on(table.createdAt.desc()),
    index('so_history_order_timeline_idx').on(table.serviceOrderId, table.createdAt.asc()),
  ]
);

/* ==========================================================================
   4. RELACIONAMENTOS (Drizzle ORM Relations)
   ========================================================================== */

export const usersRelations = relations(users, ({ many }) => ({
  ordensCriadas: many(serviceOrders, { relationName: 'criador' }),
  ordensComoTecnico: many(serviceOrders, { relationName: 'responsavelTecnico' }),
  ordensComoSubcontratado: many(serviceOrders, { relationName: 'subcontratado' }),
  ordensComoMotorista: many(serviceOrders, { relationName: 'motorista' }),
  anexosEnviados: many(serviceOrderAttachments, { relationName: 'uploadedBy' }),
  notificacoes: many(notifications),
  historicoAlteracoes: many(serviceOrderHistory, { relationName: 'alteradoPor' }),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one, many }) => ({
  criadoPor: one(users, {
    fields: [serviceOrders.criadoPorId],
    references: [users.id],
    relationName: 'criador',
  }),
  responsavelTecnico: one(users, {
    fields: [serviceOrders.responsavelTecnicoId],
    references: [users.id],
    relationName: 'responsavelTecnico',
  }),
  subcontratado: one(users, {
    fields: [serviceOrders.subcontratadoId],
    references: [users.id],
    relationName: 'subcontratado',
  }),
  motorista: one(users, {
    fields: [serviceOrders.motoristaId],
    references: [users.id],
    relationName: 'motorista',
  }),
  permissaoTrabalho: one(workPermits, {
    fields: [serviceOrders.id],
    references: [workPermits.serviceOrderId],
  }),
  anexos: many(serviceOrderAttachments),
  historico: many(serviceOrderHistory),
}));

export const serviceOrderAttachmentsRelations = relations(serviceOrderAttachments, ({ one }) => ({
  ordemServico: one(serviceOrders, {
    fields: [serviceOrderAttachments.serviceOrderId],
    references: [serviceOrders.id],
  }),
  uploadedBy: one(users, {
    fields: [serviceOrderAttachments.uploadedById],
    references: [users.id],
    relationName: 'uploadedBy',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  usuario: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const workPermitsRelations = relations(workPermits, ({ one }) => ({
  ordemServico: one(serviceOrders, {
    fields: [workPermits.serviceOrderId],
    references: [serviceOrders.id],
  }),
}));

export const serviceOrderHistoryRelations = relations(serviceOrderHistory, ({ one }) => ({
  ordemServico: one(serviceOrders, {
    fields: [serviceOrderHistory.serviceOrderId],
    references: [serviceOrders.id],
  }),
  alteradoPor: one(users, {
    fields: [serviceOrderHistory.alteradoPorId],
    references: [users.id],
    relationName: 'alteradoPor',
  }),
}));

/* ==========================================================================
   5. INFERÊNCIA DE TIPOS TYPESCRIPT
   ========================================================================== */

// Users
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Service Orders
export type ServiceOrder = InferSelectModel<typeof serviceOrders>;
export type NewServiceOrder = InferInsertModel<typeof serviceOrders>;

// Work Permits (PT Reparo)
export type WorkPermit = InferSelectModel<typeof workPermits>;
export type NewWorkPermit = InferInsertModel<typeof workPermits>;

// Attachments (Google Drive)
export type ServiceOrderAttachment = InferSelectModel<typeof serviceOrderAttachments>;
export type NewServiceOrderAttachment = InferInsertModel<typeof serviceOrderAttachments>;

// Notifications
export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;

// Service Order History
export type ServiceOrderHistory = InferSelectModel<typeof serviceOrderHistory>;
export type NewServiceOrderHistory = InferInsertModel<typeof serviceOrderHistory>;

// Enums
export type Department = (typeof departmentEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type UserStatus = (typeof userStatusEnum.enumValues)[number];
export type ServiceOrderStatus = (typeof serviceOrderStatusEnum.enumValues)[number];
export type ServiceOrderPriority = (typeof serviceOrderPriorityEnum.enumValues)[number];
export type WorkPermitStatus = (typeof workPermitStatusEnum.enumValues)[number];
export type AttachmentCategory = (typeof attachmentCategoryEnum.enumValues)[number];
