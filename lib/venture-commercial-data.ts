// ─── Venture Commercial Data ──────────────────────────────────────────────────
// SOURCE OF TRUTH: AWQ Venture · /awq-venture/comercial
// ISOLAMENTO: exclusivo da AWQ Venture. Não importar em outras BUs.
//
// ⚠ AVISO DE QUALIDADE DE DADOS:
//   "real"    → confirmado com evidência documental
//   "estimado"→ projetado/calculado, sem documento formal
//   "manual"  → inserido manualmente, sem verificação externa
//   "sem_dado"→ sem informação confiável — NÃO exibir como fato
//
// Regras:
//   Não adicionar valor financeiro sem preencher o campo *Quality correspondente.
//   Não inventar receita, upside, equity ou valuation sem base documental.
//   Não confundir pipeline comercial com patrimônio real.

import type { CommercialOpportunity, CommercialKPIs } from "./venture-commercial-types";
import { ventureContracts } from "./awq-derived-metrics";

// Único contrato operacional confirmado da Venture.
// Fonte: evidência de contrato fornecida pelo usuário (awq-group-data.ts).
const enerdy = ventureContracts[0];

// ─── Pipeline Comercial ───────────────────────────────────────────────────────

export const commercialOpportunities: CommercialOpportunity[] = [

  // ── C001 — ENERDY (ativo, real) ───────────────────────────────────────────
  // Único contrato comercial ativo e confirmado da AWQ Venture.
  // Fee mensal: R$2.000 · Prazo: 36 meses · Valor total: R$72.000
  // Qualidade: REAL — confirmado com evidência de contrato.
  {
    id:            "C001",
    company:       "ENERDY",
    sector:        "Energia / Advisory",
    origin:        "Contrato direto",
    dealType:      "Operação Recorrente",
    stage:         "Fee Recorrente",
    economics: {
      monthlyFee:                       enerdy.monthlyFee,
      monthlyFeeQuality:                "real",
      arr:                              enerdy.arr,
      arrQuality:                       "real",
      contractValue:                    enerdy.totalContractValue,
      contractValueQuality:             "real",
      upsidePct:                        null,
      upsideType:                       null,
      upsideQuality:                    "sem_dado",
      estimatedPatrimonialValue:        null,
      estimatedPatrimonialValueQuality: "sem_dado",
    },
    probability:   100,
    priority:      "Alta",
    responsible:   "AWQ Venture",
    nextAction:    "Confirmar data de início do contrato e agendar reunião de alinhamento estratégico",
    lastUpdated:   "2026-04-08",
    internalNotes: enerdy.note,
    dealRef:       null,
    confirmation: {
      opportunityId:     "C001",
      proposalId:        "PROP-C001-v1",
      status:            "confirmado",
      clientName:        "ENERDY",
      confirmedAt:       "2026-04-08",
      interactions:      [],
      pipelineEntryDate: "2026-04-08",
      baseEntryDate:     "2026-04-08",
    },
    proposal: {
      proposalId:         "PROP-C001-v1",
      version:            1,
      status:             "Aprovado",
      clientVisible:      true,
      title:              "Proposta de Advisory — AWQ Venture × ENERDY",
      executiveSummary:
        "Contratação da AWQ Venture como advisor estratégico e parceiro de incubação operacional do Grupo ENERDY, com fee mensal de R$2.000 pelo período de 36 meses, totalizando R$72.000 em valor contratual bruto.",
      context:
        "O Grupo ENERDY identificou a necessidade de estruturação de sua governança operacional, desenvolvimento da frente comercial e acesso qualificado à rede de parceiros estratégicos da AWQ Venture para acelerar sua curva de crescimento e posicionamento no mercado.",
      diagnosis:
        "Empresa com potencial operacional relevante no setor de energia, necessitando de suporte estruturado em: (i) organização de processos internos, (ii) desenvolvimento e qualificação do pipeline comercial, (iii) acesso a rede de parceiros e clientes estratégicos, e (iv) acompanhamento executivo contínuo com foco em geração de resultado.",
      operationStructure:
        "Fee mensal fixo de advisory e incubação operacional. A AWQ Venture presta suporte estratégico contínuo, incluindo acompanhamento executivo mensal, acesso à rede de parceiros, suporte em estruturação de processos e desenvolvimento comercial.",
      economicProposal:
        "Fee mensal: R$2.000,00. Prazo contratual: 36 meses. Valor total do contrato: R$72.000,00 (bruto). Forma de pagamento: mensalidade recorrente.",
      monthlyFee:         2_000,
      feeQuality:         "real",
      contractDuration:   "36 meses",
      upsideDescription:
        "Não há participação patrimonial, equity ou revenue share previsto nesta estrutura contratual. O fee mensal é a única remuneração da AWQ Venture neste contrato.",
      premises: [
        "Fee mensal pago pontualmente, conforme calendário contratual",
        "Acesso a informações operacionais para adequado suporte ao negócio",
        "Reuniões mensais de acompanhamento executivo com time do ENERDY",
        "Engajamento ativo da liderança do ENERDY nas sessões de advisory",
      ],
      risks: [
        "Risco de não renovação ao término do prazo de 36 meses",
        "Data de início do contrato ainda não confirmada — impacta projeção de receita",
        "Dependência da qualidade do engajamento do cliente para geração de resultado",
      ],
      advanceCriteria: [
        "Confirmação formal da data de início do contrato",
        "Recebimento do primeiro pagamento mensal",
        "Realização da reunião de kick-off estratégico",
      ],
      governance:
        "Contrato bilateral AWQ Venture — ENERDY. Revisão de escopo e entregáveis recomendada anualmente. Qualquer alteração de estrutura ou fee requer aditivo contratual formal.",
      schedule: [
        {
          phase:       "Formalização",
          description: "Confirmação de data de início e primeiro pagamento",
          targetDate:  "a confirmar",
        },
        {
          phase:       "Kick-off Estratégico",
          description: "Reunião de alinhamento de objetivos, KPIs e plano de 90 dias",
          targetDate:  "após confirmação de início",
        },
        {
          phase:       "Ciclo Mensal de Advisory",
          description: "Reuniões mensais de acompanhamento executivo",
          targetDate:  "recorrente — 36 meses",
        },
        {
          phase:       "Revisão Anual",
          description: "Revisão de escopo, entregáveis e metas",
          targetDate:  "anual",
        },
      ],
      nextSteps: [
        "Confirmar data de início do contrato com o ENERDY",
        "Agendar reunião de kick-off estratégico",
        "Estruturar plano de 90 dias de advisory com entregáveis claros",
        "Definir KPIs de acompanhamento para o período",
      ],
      observations:
        "Este é o único contrato operacional ativo e confirmado da AWQ Venture. O dado de receita mensal (R$2.000) é considerado REAL com base em evidência de contrato fornecida. A data de início não foi confirmada — enquanto isso, o contrato é tratado como ativo sem proration de valor.",
      createdAt: "2026-04-08",
      updatedAt: "2026-04-08",
      sentAt:    null,
    },
  },

  // ── C002 — Oportunidade M4E (template vazio) ──────────────────────────────
  // Slot reservado para próxima oportunidade de Management for Equity.
  // QUALIDADE: SEM_DADO — preencher quando empresa real for identificada.
  // ⚠ Não exibir campos financeiros deste registro como dados reais.
  {
    id:            "C002",
    company:       "— A definir —",
    sector:        "— A definir —",
    origin:        "— A definir —",
    dealType:      "Participação/M4E",
    stage:         "Oportunidade",
    economics: {
      monthlyFee:                       null,
      monthlyFeeQuality:                "sem_dado",
      arr:                              null,
      arrQuality:                       "sem_dado",
      contractValue:                    null,
      contractValueQuality:             "sem_dado",
      upsidePct:                        null,
      upsideType:                       null,
      upsideQuality:                    "sem_dado",
      estimatedPatrimonialValue:        null,
      estimatedPatrimonialValueQuality: "sem_dado",
    },
    probability:   0,
    priority:      "Média",
    responsible:   "AWQ Venture",
    nextAction:    "Identificar empresa-alvo para proposta de Management for Equity",
    lastUpdated:   "2026-04-08",
    internalNotes:
      "Slot reservado para próxima oportunidade M4E. Preencher os campos quando uma empresa real for identificada e qualificada. Não usar estes dados como pipeline real até o preenchimento.",
    dealRef:      null,
    confirmation: null,
    proposal:     null,
  },

  // ── C003 — Oportunidade Fee + Upside (template vazio) ────────────────────
  // Slot reservado para próxima oportunidade Fee + Upside.
  // QUALIDADE: SEM_DADO — preencher quando empresa real for identificada.
  {
    id:            "C003",
    company:       "— A definir —",
    sector:        "— A definir —",
    origin:        "— A definir —",
    dealType:      "Fee + Upside",
    stage:         "Oportunidade",
    economics: {
      monthlyFee:                       null,
      monthlyFeeQuality:                "sem_dado",
      arr:                              null,
      arrQuality:                       "sem_dado",
      contractValue:                    null,
      contractValueQuality:             "sem_dado",
      upsidePct:                        null,
      upsideType:                       null,
      upsideQuality:                    "sem_dado",
      estimatedPatrimonialValue:        null,
      estimatedPatrimonialValueQuality: "sem_dado",
    },
    probability:   0,
    priority:      "Média",
    responsible:   "AWQ Venture",
    nextAction:    "Identificar empresa-alvo para proposta de Fee + Upside",
    lastUpdated:   "2026-04-08",
    internalNotes:
      "Slot reservado para próxima oportunidade Fee+Upside. Preencher os campos quando uma empresa real for identificada. Não usar estes dados como pipeline real até o preenchimento.",
    dealRef:      null,
    confirmation: null,
    proposal:     null,
  },
];

// ─── KPIs derivados ───────────────────────────────────────────────────────────
// Calculados em runtime a partir de commercialOpportunities.
// A qualidade de cada KPI reflete a qualidade dos dados de origem.
// Campos com quality "sem_dado" NÃO entram nos totais.

export function getCommercialKPIs(): CommercialKPIs {
  const opps = commercialOpportunities;

  const activeContracts = opps.filter(
    (o) =>
      o.stage === "Fee Recorrente" ||
      o.stage === "Contrato Ativo" ||
      o.stage === "Receita Operacional",
  ).length;

  const activeProposals = opps.filter(
    (o) =>
      o.proposal?.status === "Enviado" ||
      o.proposal?.status === "Pronto para Envio",
  ).length;

  const activeNegotiations = opps.filter(
    (o) =>
      o.stage === "Negociação" ||
      o.proposal?.status === "Em Negociação",
  ).length;

  // MRR: somar apenas campos com quality != "sem_dado"
  const mrrEntries = opps.filter(
    (o) => o.economics.monthlyFee !== null && o.economics.monthlyFeeQuality !== "sem_dado",
  );
  const mrr = mrrEntries.reduce((s, o) => s + (o.economics.monthlyFee ?? 0), 0);
  const mrrQuality: "real" | "estimado" | "manual" =
    mrrEntries.every((o) => o.economics.monthlyFeeQuality === "real")
      ? "real"
      : mrrEntries.some((o) => o.economics.monthlyFeeQuality === "estimado")
        ? "estimado"
        : "manual";

  // Pipeline potencial: somar contractValue onde quality != "sem_dado"
  const pipelineEntries = opps.filter(
    (o) =>
      o.economics.contractValue !== null &&
      o.economics.contractValueQuality !== "sem_dado",
  );
  const pipelinePotential = pipelineEntries.reduce(
    (s, o) => s + (o.economics.contractValue ?? 0),
    0,
  );
  const pipelinePotentialQuality: "real" | "estimado" | "manual" =
    pipelineEntries.every((o) => o.economics.contractValueQuality === "real")
      ? "real"
      : "estimado";

  const lastActivityDate = opps.reduce(
    (latest, o) => (o.lastUpdated > latest ? o.lastUpdated : latest),
    "2000-01-01",
  );

  return {
    totalOpportunities:       opps.length,
    activeProposals,
    activeNegotiations,
    activeContracts,
    mrr,
    mrrQuality,
    arr:                      mrr * 12,
    arrQuality:               mrrQuality,
    pipelinePotential,
    pipelinePotentialQuality,
    upsidePotential:          null, // sem dado confiável no momento
    lastActivityDate,
  };
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export function getCommercialOpportunityById(id: string): CommercialOpportunity | null {
  return commercialOpportunities.find((o) => o.id === id) ?? null;
}

export function getActiveCommercialContracts(): CommercialOpportunity[] {
  return commercialOpportunities.filter(
    (o) =>
      o.stage === "Fee Recorrente" ||
      o.stage === "Contrato Ativo" ||
      o.stage === "Receita Operacional",
  );
}

export function getOpportunitiesWithProposals(): CommercialOpportunity[] {
  return commercialOpportunities.filter((o) => o.proposal !== null);
}
