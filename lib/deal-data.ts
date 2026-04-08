// ─── Deal Seed Data ───────────────────────────────────────────────────────────
// SOURCE OF TRUTH: AWQ Venture
// Exports: dealWorkspaces (full), getDealById(), getDealHoldingSummaries()

import type { DealWorkspace } from "./deal-types";
import { toDealHoldingSummary } from "./deal-types";

// ─── P001 — MedIA Health (fully populated — Due Diligence) ───────────────────

const mediaHealth: DealWorkspace = {
  id:             "P001",
  companyName:    "MedIA Health",
  stage:          "Due Diligence",
  assignee:       "Miguel Costa",
  lastUpdated:    "2026-04-05",
  sendStatus:     "Pronto para Envio",
  operationType:  "Aquisição Parcial",
  valuationRange: "R$3,5M – R$5,0M",
  proposedValue:  4_000_000,
  dealScore:      8.4,
  riskLevel:      "Médio",
  priority:       "Alta",

  identification: {
    companyName:      "MedIA Health Tecnologia Ltda.",
    sector:           "HealthTech",
    location:         "São Paulo, SP",
    mainContact:      "Dr. Felipe Moura",
    mainContactRole:  "CEO & Fundador",
    mainContactEmail: "felipe@mediahealth.com.br",
    mainContactPhone: "+55 11 9 8888-0001",
    dealStage:        "Due Diligence",
    dealOrigin:       "Network — indicação via parceiro LP",
    website:          "https://mediahealth.com.br",
  },

  strategicThesis: {
    strategicRationale:
      "MedIA Health opera no segmento de IA diagnóstica para imagem médica, mercado com TAM estimado de R$4B no Brasil até 2028. A empresa possui IP proprietário em visão computacional aplicada a radiologia e patologia, segmento com altíssima barreira de entrada regulatória e técnica.",
    whyNow:
      "A empresa acaba de obter homologação ANVISA para seu módulo de triagem de pneumonia. Esse marco regulatório cria uma janela de 12 meses de vantagem competitiva sobre concorrentes ainda em fase de certificação. Ingresso pré-Series A maximiza retorno.",
    synergies:
      "Cross-sell imediato com clínicas e hospitais da rede JACQES. Possibilidade de co-desenvolvimento com BU de tecnologia da AWQ. Redução de custo operacional de laudos em parceiros já clientes da holding.",
    valueCreationThesis:
      "Aquisição parcial (35%) com opção de call para controle majoritário em 24 meses. Aceleração via distribuição na rede AWQ + capital de giro para escala de go-to-market B2B. Saída estimada em 48–60 meses via strategic buyer (rede de hospitais ou Big Pharma).",
    awqVentureFit:
      "Alinhamento direto com tese HealthTech da AWQ Venture. Fundador técnico de alta qualidade, board complementar ao perfil AWQ. Governança madura para estágio da empresa.",
  },

  assetDiagnosis: {
    summary:
      "Empresa com 3 anos de operação, ARR de R$1,2M, crescimento MoM de 8%, equipe de 18 pessoas (12 tech). Produto no mercado com 40+ contratos ativos em clínicas privadas de médio porte. Churn baixo (< 4% anual). Inadimplência controlada. Cap table limpo.",
    strengths: [
      "IP próprio: algoritmo de triagem certificado pela ANVISA (módulo pneumonia)",
      "Receita recorrente B2B com contratos anuais e renovação > 90%",
      "Equipe técnica sênior com publicações em NeurIPS e MICCAI",
      "NPS de 71 junto a clientes ativos",
      "CAC < R$8K com LTV > R$90K (LTV:CAC = 11,2×)",
    ],
    weaknesses: [
      "Time comercial subdesenvolvido — apenas 2 vendedores para todo Brasil",
      "Dependência de 3 clientes (40% da receita total)",
      "Infraestrutura de cloud não otimizada (burn elevado vs. receita)",
      "Sem CFO dedicado — financeiro gerenciado pelo CEO",
    ],
    operationalMaturity: 3,
    commercialMaturity:  2,
    risks: [
      "Concentração de receita em 3 clientes principais",
      "Regulatório: ANVISA pode ampliar exigências para módulos ainda não certificados",
      "Key-man risk: CTO e CEO fundadores altamente dependentes",
    ],
  },

  financials: {
    estimatedRevenue:    1_200_000,
    estimatedEbitda:     180_000,
    ebitdaMargin:        15,
    askValuation:        5_000_000,
    proposedValuation:   4_000_000,
    impliedMultiple:     3.33,
    offerStructure:
      "35% via aporte primário de R$1,4M + earnout de R$600K vinculado a meta ARR R$2M em 12 meses. Opção de call AWQ para maioria em 24 meses a múltiplo prefixado 4,5×.",
    dealType:            "Aquisição Parcial",
    targetOwnership:     35,
    estimatedInvestment: 1_400_000,
    expectedUpside:      185,
    financialNotes:
      "Valuation calculado por múltiplo de receita (3,3× ARR). Peer median no segmento healthtech B2B Brasil = 4,1×. Desconto aplicado por concentração de receita e maturidade comercial ainda em desenvolvimento.",
    revenueConfidence:   "probable",
  },

  riskDiligence: {
    legalRisks:
      "Nenhum litígio identificado. Contratos de trabalho regulares. Verificar cláusulas de exclusividade em 2 contratos de parceria tecnológica. IP registrado em nome da empresa (não dos fundadores).",
    financialRisks:
      "Runway atual: 9 meses sem aporte. Sem dívida financeira relevante. Necessidade de regularização de 2 obrigações fiscais de menor valor (DARF atrasados < R$12K). Burn mensal R$95K vs receita R$100K.",
    operationalRisks:
      "Infraestrutura em cloud não auditada. SLA com clientes sem penalidade contratual robusta. Plano de contingência de infraestrutura não documentado.",
    integrationRisks:
      "Cultura técnica pode ter fricção com governança mais formal da AWQ. Necessidade de onboarding de CFO externo nos primeiros 90 dias.",
    diligencePending: [
      "Auditoria financeira Q1 2026 (ainda não entregue)",
      "Validação de contratos com 3 maiores clientes",
      "Review de cláusulas de IP com advogado especializado",
      "Auditoria de infraestrutura cloud (custo vs. capacidade)",
      "Referência dos fundadores com investidores anteriores",
    ],
    blockers: [],
  },

  proposalStructure: {
    economicProposal:
      "Aporte primário de R$1,4M por 35% da empresa. Earnout de R$600K contingente a ARR R$2M atingido em 12 meses. Opção de call para controle (51%) em 24 meses ao múltiplo 4,5× sobre ARR vigente.",
    paymentStructure:
      "Desembolso em 2 tranches: R$900K no fechamento + R$500K após auditoria financeira aprovada (D+60). Earnout pago em D+365 se meta atingida.",
    stages: [
      { label: "Assinatura do MOU",       description: "Memorando de entendimento, exclusividade 60 dias",   targetDate: "2026-04-20" },
      { label: "Due Diligence Final",      description: "Auditoria, validação contratual e IP review",         targetDate: "2026-05-15" },
      { label: "Negociação do SHA",        description: "Shareholders Agreement e termos finais",              targetDate: "2026-05-30" },
      { label: "Fechamento e Desembolso", description: "Tranche 1 — R$900K + integração inicial",            targetDate: "2026-06-10" },
      { label: "Tranche 2",               description: "R$500K após auditoria aprovada",                      targetDate: "2026-08-10" },
    ],
    conditions: [
      "Auditoria financeira sem ressalvas materiais",
      "Validação de IP sem ônus ou litígio",
      "Cap table limpo e livre de cláusulas restritivas",
      "CTO e CEO comprometidos via vesting de 3 anos com cliff 12 meses",
    ],
    timeline: "Fechamento estimado em 60–75 dias a partir da assinatura do MOU",
    nextSteps: [
      "Enviar proposta formal ao CEO Felipe Moura",
      "Agendar reunião de alinhamento com board",
      "Contratar firma de auditoria M&A",
      "Aprovação interna AWQ Venture (Comitê de Investimento)",
    ],
  },

  governance: {
    createdBy:     "Miguel Costa",
    createdAt:     "2026-03-10",
    updatedBy:     "Miguel Costa",
    updatedAt:     "2026-04-05",
    sourceOfTruth: "AWQ_Venture",
    status:        "Pronto para Envio",
    version:       4,
    internalOnly:  false,
    clientVisible: true,
    auditTrail: [
      { date: "2026-03-10", by: "Miguel Costa", action: "Deal criado — estágio: Triagem" },
      { date: "2026-03-18", by: "Miguel Costa", action: "Avançado para Prospecção — primeiro contato com CEO" },
      { date: "2026-03-28", by: "Miguel Costa", action: "Avançado para Due Diligence — materiais recebidos" },
      { date: "2026-04-02", by: "Miguel Costa", action: "Valuation revisado: R$5M → R$4M (ajuste por concentração de receita)" },
      { date: "2026-04-05", by: "Miguel Costa", action: "Status: Pronto para Envio — proposta econômica finalizada" },
    ],
  },
};

// ─── P002 — EduFlow (Term Sheet) ──────────────────────────────────────────────

const eduFlow: DealWorkspace = {
  id:             "P002",
  companyName:    "EduFlow",
  stage:          "Term Sheet",
  assignee:       "Miguel Costa",
  lastUpdated:    "2026-04-01",
  sendStatus:     "Enviado",
  operationType:  "Investimento Minoritário",
  valuationRange: "R$2,5M – R$3,5M",
  proposedValue:  3_000_000,
  dealScore:      7.9,
  riskLevel:      "Baixo",
  priority:       "Alta",

  identification: {
    companyName:      "EduFlow Educação Corporativa Ltda.",
    sector:           "EdTech",
    location:         "Belo Horizonte, MG",
    mainContact:      "Ana Figueiredo",
    mainContactRole:  "CEO",
    mainContactEmail: "ana@eduflow.com.br",
    mainContactPhone: null,
    dealStage:        "Term Sheet",
    dealOrigin:       "Indicação — LP parceiro",
    website:          "https://eduflow.com.br",
  },

  strategicThesis: {
    strategicRationale:  "LMS corporativo com 200+ clientes ativos. Mercado EdTech B2B em forte expansão.",
    whyNow:              "Term sheet já enviado. Janela de exclusividade de 30 dias. Risco de perda para competidor.",
    synergies:           "Integração com base de clientes PME da AWQ. Possibilidade de white-label.",
    valueCreationThesis: "Minoritário com tag-along. Saída via strategic buyer em 36 meses.",
    awqVentureFit:       "Fit com tese EdTech corporativo. Receita previsível.",
  },

  assetDiagnosis: {
    summary:             "ARR R$900K, crescimento 12% MoM, 200+ clientes, churn 3%.",
    strengths:           ["Receita recorrente alta previsibilidade", "NPS 68", "Equipe de produto consolidada"],
    weaknesses:          ["Produto monolítico — tech debt relevante", "Mercado geograficamente concentrado em MG/SP"],
    operationalMaturity: 4,
    commercialMaturity:  3,
    risks:               ["Pressão de preço de concorrentes bem capitalizados", "Dependência de 5 clientes-chave"],
  },

  financials: {
    estimatedRevenue:    900_000,
    estimatedEbitda:     135_000,
    ebitdaMargin:        15,
    askValuation:        3_500_000,
    proposedValuation:   3_000_000,
    impliedMultiple:     3.33,
    offerStructure:      "25% via aporte de R$750K. Sem earnout.",
    dealType:            "Investimento Minoritário",
    targetOwnership:     25,
    estimatedInvestment: 750_000,
    expectedUpside:      130,
    financialNotes:      "Valuation em negociação. Fundadora quer 3,5×. AWQ propõe 3,3× com opção de call.",
    revenueConfidence:   "probable",
  },

  riskDiligence: {
    legalRisks:       "Em revisão. Nenhum litígio identificado até o momento.",
    financialRisks:   "Runway 14 meses. Sem dívida relevante.",
    operationalRisks: "Tech debt no produto core. Migração para microsserviços em andamento.",
    integrationRisks: "Baixo. Modelo de parceria, sem integração operacional prevista.",
    diligencePending: ["Auditoria financeira em andamento", "Revisão cap table"],
    blockers:         [],
  },

  proposalStructure: {
    economicProposal:  "R$750K por 25%. Opção de call para 40% em 18 meses.",
    paymentStructure:  "Tranche única no fechamento.",
    stages: [
      { label: "Negociação SHA",   description: "Ajustes finais no term sheet",      targetDate: "2026-04-15" },
      { label: "Fechamento",       description: "Assinatura e desembolso",            targetDate: "2026-04-30" },
    ],
    conditions:  ["Cap table limpo", "Auditoria sem ressalvas"],
    timeline:    "Fechamento em 30 dias",
    nextSteps:   ["Finalizar SHA", "Aprovação comitê AWQ Venture"],
  },

  governance: {
    createdBy:     "Miguel Costa",
    createdAt:     "2026-03-01",
    updatedBy:     "Miguel Costa",
    updatedAt:     "2026-04-01",
    sourceOfTruth: "AWQ_Venture",
    status:        "Enviado",
    version:       3,
    internalOnly:  false,
    clientVisible: true,
    auditTrail: [
      { date: "2026-03-01", by: "Miguel Costa", action: "Deal criado" },
      { date: "2026-03-20", by: "Miguel Costa", action: "Term sheet enviado" },
      { date: "2026-04-01", by: "Miguel Costa", action: "Resposta recebida — em negociação final" },
    ],
  },
};

// ─── P003–P006 (rascunhos — campos essenciais) ────────────────────────────────

function stubDeal(
  id: string,
  companyName: string,
  sector: string,
  stage: DealWorkspace["stage"],
  ticket: number,
  score: number,
  priority: DealWorkspace["priority"],
  risk: DealWorkspace["riskLevel"],
  source: string,
  description: string,
  eta: string,
): DealWorkspace {
  return {
    id,
    companyName,
    stage,
    assignee:       "AWQ Venture",
    lastUpdated:    "2026-04-01",
    sendStatus:     "Rascunho",
    operationType:  "Aquisição Parcial",
    valuationRange: `R$${(ticket * 0.8 / 1_000_000).toFixed(1)}M – R$${(ticket * 1.2 / 1_000_000).toFixed(1)}M`,
    proposedValue:  ticket,
    dealScore:      score,
    riskLevel:      risk,
    priority,

    identification: {
      companyName,
      sector,
      location:         "Brasil",
      mainContact:      "—",
      mainContactRole:  "—",
      mainContactEmail: null,
      mainContactPhone: null,
      dealStage:        stage,
      dealOrigin:       source,
      website:          null,
    },

    strategicThesis: {
      strategicRationale:  description,
      whyNow:              "Em avaliação.",
      synergies:           "A definir.",
      valueCreationThesis: "A definir.",
      awqVentureFit:       "Em análise.",
    },

    assetDiagnosis: {
      summary:             "Diagnóstico preliminar em andamento.",
      strengths:           [],
      weaknesses:          [],
      operationalMaturity: 2,
      commercialMaturity:  2,
      risks:               [],
    },

    financials: {
      estimatedRevenue:    null,
      estimatedEbitda:     null,
      ebitdaMargin:        null,
      askValuation:        ticket,
      proposedValuation:   ticket,
      impliedMultiple:     null,
      offerStructure:      "A definir.",
      dealType:            "Aquisição Parcial",
      targetOwnership:     30,
      estimatedInvestment: ticket * 0.3,
      expectedUpside:      null,
      financialNotes:      "Dados financeiros ainda não recebidos.",
      revenueConfidence:   "estimated",
    },

    riskDiligence: {
      legalRisks:       "Não avaliado.",
      financialRisks:   "Não avaliado.",
      operationalRisks: "Não avaliado.",
      integrationRisks: "Não avaliado.",
      diligencePending: ["Informações financeiras", "Due diligence a iniciar"],
      blockers:         [],
    },

    proposalStructure: {
      economicProposal:  "A definir.",
      paymentStructure:  "A definir.",
      stages:            [],
      conditions:        [],
      timeline:          eta,
      nextSteps:         ["Primeiro contato", "Solicitar materiais"],
    },

    governance: {
      createdBy:     "AWQ Venture",
      createdAt:     "2026-04-01",
      updatedBy:     "AWQ Venture",
      updatedAt:     "2026-04-01",
      sourceOfTruth: "AWQ_Venture",
      status:        "Rascunho",
      version:       1,
      internalOnly:  true,
      clientVisible: false,
      auditTrail: [{ date: "2026-04-01", by: "AWQ Venture", action: "Deal criado — estágio inicial" }],
    },
  };
}

// ─── Full Dataset ─────────────────────────────────────────────────────────────

export const dealWorkspaces: DealWorkspace[] = [
  mediaHealth,
  eduFlow,
  stubDeal("P003", "CarbonX",    "CleanTech",    "Prospecção", 8_000_000, 7.2, "Média", "Médio",  "Evento",       "Créditos de carbono tokenizados para mercado voluntário. Pré-receita.", "Q3 2026"),
  stubDeal("P004", "RetailAI",   "RetailTech",   "Prospecção", 2_500_000, 6.8, "Média", "Médio",  "Cold Inbound", "Precificação dinâmica e gestão de estoque por IA para varejo físico.",  "Q3 2026"),
  stubDeal("P005", "CyberShield","Cybersecurity","Triagem",    5_000_000, 7.5, "Alta",  "Alto",   "Network",      "Proteção de endpoints para PMEs com modelo managed service.",           "Q4 2026"),
  stubDeal("P006", "FarmAI",     "AgTech",       "Triagem",    1_800_000, 6.1, "Baixa", "Baixo",  "Cold Inbound", "Previsão de colheita e risco climático via sensoriamento remoto.",       "Q4 2026"),
];

// ─── Query helpers ────────────────────────────────────────────────────────────

export function getDealById(id: string): DealWorkspace | null {
  return dealWorkspaces.find((d) => d.id === id) ?? null;
}

export function getDealHoldingSummaries() {
  return dealWorkspaces.map(toDealHoldingSummary);
}
