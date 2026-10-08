import { z } from 'zod';

/* ==========================================================================
   METADADOS DE ASSINATURA DIGITAL AUDITÁVEL
   ========================================================================== */
export const digitalSignatureSchema = z.object({
  nome: z.string().min(2, 'Nome do signatário é obrigatório'),
  cargo: z.string().optional(),
  assinaturaBase64: z.string().min(100, 'Assinatura digital gráfica é obrigatória'),
  timestamp: z.string(), // ISO String
  geolocalizacao: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().optional(),
    })
    .nullable()
    .optional(),
  userAgent: z.string().optional(),
});

export type DigitalSignature = z.infer<typeof digitalSignatureSchema>;

/* ==========================================================================
   SCHEMA COMPLETO DA PT - REPARO (TKE)
   ========================================================================== */
export const ptReparoSchema = z.object({
  serviceOrderId: z.string().optional().nullable(),

  // 1 - 4: DADOS CADASTRAIS & EQUIPAMENTO
  contratoOrcamento: z.string().min(1, 'Número do Contrato/Orçamento é obrigatório'),
  equipamento: z.string().min(1, 'Identificação do Equipamento é obrigatória'),
  tipoMaoDeObra: z.enum(['TKE', 'CONTRATADA']),
  empresaContratada: z.string().optional(),
  tipoEquipamento: z.enum(['COM_CASA_DE_MAQUINAS', 'SEM_CASA_DE_MAQUINAS']),

  // 5: PLANEJAMENTO DAS ATIVIDADES
  servicosRealizados: z.array(z.string()).min(1, 'Selecione ao menos um serviço a ser realizado'),
  servicosOutros: z.string().optional(),
  riscosPotenciais: z.array(z.string()).min(1, 'Selecione ao menos um risco potencial identificado'),
  riscosOutros: z.string().optional(),
  tipoReparo: z.enum(['SUSPENSAO_TRACAO', 'OUTROS']),
  tipoReparoOutros: z.string().optional(),
  classificacaoReparo: z.enum(['ROTINEIRO', 'NAO_ROTINEIRO']),
  trabalhoEmAltura: z.boolean(),
  tipoSupervisaoAltura: z
    .enum(['BASICA', 'DIRETA', 'PT'])
    .optional()
    .nullable(),

  // 6: CHECKLIST PRELIMINAR DA SUPERVISÃO (SIM, NAO, NAO_APLICAVEL)
  checklistSupervisao: z.object({
    instrucaoReparo: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
    treinamentoCapacitacao: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
    treinamentosNormas: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']), // NR-10, NR-18, NR-35
    ferramentaisNecessarios: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
    adendoContratualAssinado: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
    episNecessarios: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
  }),
  dataAutorizacaoSupervisao: z.string().optional().nullable(),
  assinaturaSupervisao: digitalSignatureSchema.optional().nullable(),

  // 7: ANÁLISE DE RISCOS NO LOCAL DE TRABALHO
  analiseRiscos: z.object({
    // ALTURA
    alturaRiscoExistente: z.boolean(),
    alturaItens: z.object({
      sinalizacaoPavimentos: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      dispositivosAncoragem: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      andaimeBoasCondicoes: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      protecoesColetivasCasaMaquinas: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      entornoSeguro: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
    }),

    // IÇAMENTO DE MATERIAIS
    icamentoRiscoExistente: z.boolean(),
    icamentoItens: z.object({
      equipamentosAdequados: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      acessoriosAdequados: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      ganchosAtestados: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      redundanciaSeguranca: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      areaProjecaoIsolada: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      comunicacaoEquipe: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
    }),

    // CIRCUITOS ELÉTRICOS (NR-10)
    eletricaRiscoExistente: z.boolean(),
    eletricaItens: z.object({
      fiacaoIsolada: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      aterramentoEDR: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      kitBloqueioEletrico: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      exigeBloqueioEletrico: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      infiltracoesPresentes: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
    }),

    // TRABALHO A QUENTE
    quenteRiscoExistente: z.boolean(),
    quenteItens: z.object({
      localDevidamenteIsolado: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      livreMateriaisIncendio: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      equipamentosCombateIncendioProximos: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
      capacitacaoTrabalhoQuente: z.enum(['SIM', 'NAO', 'NAO_APLICAVEL']),
    }),
  }),

  // 8 - 10: FERRAMENTAL, EPCS E EPIS
  ferramentasSelecionadas: z.array(z.string()),
  ferramentasKitTesterNum: z.string().optional(),
  ferramentasOutros: z.string().optional(),

  epcsSelecionados: z.array(z.string()),
  epcsOutros: z.string().optional(),

  episSelecionados: z.array(z.string()).min(1, 'Selecione os EPIs obrigatórios para a atividade'),
  episOutros: z.string().optional(),

  // 11: TERMO DE COMPROMISSO
  termoCompromissoAceito: z.boolean().refine((val) => val === true, {
    message: 'É obrigatório aceitar o Termo de Compromisso de Segurança',
  }),

  // 12: INÍCIO DO SERVIÇO
  inicioServico: z.object({
    dataHoraInicio: z.string().min(1, 'Data e hora de início são obrigatórias'),
    emitenteAssinatura: digitalSignatureSchema,
  }),

  // 13: INTEGRANTES DA EQUIPE
  equipeReparo: z
    .array(
      z.object({
        nomeCompleto: z.string().min(2, 'Nome do integrante é obrigatório'),
        assinatura: digitalSignatureSchema,
      })
    )
    .min(1, 'Adicione ao menos um integrante na equipe técnica'),

  // 14: TÉRMINO DO SERVIÇO
  terminoServico: z
    .object({
      dataHoraTermino: z.string().min(1, 'Data e hora de término são obrigatórias'),
      emitenteAssinatura: digitalSignatureSchema,
    })
    .optional()
    .nullable(),

  // 15 - 19: REGISTROS COMPLEMENTARES
  direitoRecusa: z.object({
    atividadeParalisada: z.boolean(),
    motivoParalisacao: z.string().optional(),
  }),

  registroDesviosQuaseAcidentes: z.object({
    desvioIdentificado: z.boolean(),
    descricaoDesvio: z.string().optional(),
  }),

  dssDialogoSeguranca: z.object({
    realizado: z.boolean(),
    temaAbordado: z.string().optional(),
  }),

  visitaTecnica: z
    .array(
      z.object({
        nome: z.string(),
        cargo: z.string(),
        assinatura: digitalSignatureSchema.optional(),
      })
    )
    .optional(),

  observacoesGerais: z.string().optional(),

  cartaConclusao: z
    .object({
      id: z.string().optional(),
      fileName: z.string().optional(),
      driveViewUrl: z.string(),
      driveDownloadUrl: z.string().nullable().optional(),
      enviadoEm: z.string().optional(),
      rawBase64: z.string().optional(),
    })
    .optional(),
});

export type PtReparoFormData = z.infer<typeof ptReparoSchema>;
