// ─── Deal Seed Data ───────────────────────────────────────────────────────────
// SOURCE OF TRUTH: AWQ Venture
// Exports: dealWorkspaces (full), getDealById(), getDealHoldingSummaries()

import type { DealWorkspace, Proposal10Blocks, Proposal13Blocks } from "./deal-types";
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

// ─── P007 — Grupo Energdy (único deal real confirmado) ────────────────────────

const energdyBlocks: Proposal10Blocks = {
  versao:       1,
  criadoEm:     "2025-01-01",
  atualizadoEm: "2026-04-09",

  b1: {
    diagnostico:
      "O Grupo Energdy opera no setor de Energia / Utilities com capacidade operacional instalada, base de clientes em formação e contratos em andamento. A empresa se encontra em estágio de incubação estratégica, com operação confirmada mas ainda sem estrutura de governança, captação formal de capital ou visibilidade institucional.",
    situacaoAtual:
      "Fee mensal de advisory de R$2.000/mês ativo desde 2025, com contrato de 36 meses totalizando R$72.000. A empresa está em fase de avaliação para participação estratégica ou aquisição parcial pela AWQ Venture.",
    problema:
      "A empresa não possui acesso a capital inteligente, rede de distribuição estratégica, estrutura de governança mínima ou reputação institucional para acelerar crescimento. Operar isoladamente neste setor significa concorrer com players capitalizados sem as ferramentas necessárias.",
    ruptura:
      "O setor de energia brasileiro está em momento de transformação estrutural: descentralização energética, mercado livre em expansão, e entrada de novos competidores capitalizados. Empresas sem parceria estratégica até o final de 2026 perderão janela de posicionamento.",
    oportunidade:
      "AWQ Venture identifica potencial de participação estratégica ou aquisição parcial, alavancando o contrato de advisory como base de confiança e validação operacional. O ticket avaliado é de R$5.000.000 com score interno 8.1/10.",
    riscoNaoAgir:
      "Manutenção de fee de advisory como único vínculo, sem captura de upside de valorização, sem direitos de governança e sem proteção contra diluição futura. A janela de entrada em termos favoráveis se fecha com a chegada de outros investidores.",
  },

  b2: {
    alavancasPrincipais: [
      "Capital paciente com orientação estratégica (não meramente financeira)",
      "Rede de distribuição e clientes da AWQ Venture e holding parceira",
      "Governança institucional: board advisory, reporting e compliance mínimo",
      "Acesso a estrutura jurídica e financeira da AWQ para M&A e captação futura",
      "Credibilidade institucional para atrair novos contratos e parceiros",
    ],
    assimetriaDeal:
      "AWQ entra em momento pré-capitalização formal, com valuation ainda em formação, fee como âncora de relacionamento já comprovado, e score de 8.1 indicando alta potencialidade. A relação risco/retorno é favorável para AWQ.",
    papelAWQ:
      "AWQ Venture atua como operador-investidor: não apenas aporta capital, mas entrega governança, rede, estrutura de gestão e capacidade de saída. É parceiro de construção, não apenas de financiamento.",
    resultadoEsperado:
      "Em 24–36 meses: Grupo Energdy com governança estruturada, receita escalável, posicionamento institucional no setor e capacidade de atrair rodada Series A ou strategic buyer.",
    horizonte: "36 meses operacionais · saída estimada Q3 2028–2029",
  },

  b3: {
    oQueEntrega: [
      "Capital de participação estratégica (ticket a definir — avaliado em R$5M)",
      "Advisory mensal continuado (R$2K/mês — já ativo)",
      "Estrutura de governança: board advisory, routinas de reporting trimestrais",
      "Acesso à rede de clientes e parceiros da AWQ Holding",
      "Suporte a captação futura e estruturação de term sheets",
      "Modelo de precificação e proposta comercial institucional",
    ],
    oQueCoordena: [
      "Introduções estratégicas com distribuidores e clientes do setor de energia",
      "Conexão com jurídico especializado em M&A e estruturação societária",
      "Pipeline de co-investidores para rodadas futuras",
    ],
    foraDoCampo: [
      "Gestão operacional diária da empresa",
      "Contratação e gestão de equipe",
      "Decisões técnicas do setor (operação, infraestrutura, engenharia)",
      "Garantias sobre receita ou market share",
    ],
    dedicacao: "Parceria ativa com reuniões mensais de alinhamento + revisões trimestrais de scorecard",
  },

  b4: {
    ativo:           "Participação societária no Grupo Energdy (Energia / Utilities)",
    veiculo:         "A definir — Aquisição Parcial ou Participação Estratégica (SPE ou direta)",
    naturezaDireito: "Participação com direitos econômicos e de governança (tag-along, veto em decisões materiais, seats board)",
    conversaoFutura: "Opção de call para posição majoritária em 24–36 meses a múltiplo prefixado ou por evento de liquidez",
    valorReferencia: "Ticket avaliado: R$5.000.000 · Contrato advisory ativo: R$72.000 (R$2K × 36 meses)",
  },

  b5: {
    feeDescricao:     "Advisory e incubação estratégica mensal",
    feeValor:         "R$2.000/mês",
    feePrazo:         "36 meses (contrato ativo — confirmado)",
    upsideDescricao:  "Participação societária com direito a upside de valorização do ativo no evento de saída",
    upsidePercentual: "A definir na negociação do SHA (referência: 20–35% conforme ticket aportado)",
    gates: [
      "Gate 1 — Formalização do SHA e estrutura societária: liberação da Tranche 1",
      "Gate 2 — Atingimento de meta operacional ou receita validada: liberação da Tranche 2",
      "Gate 3 — Auditoria financeira sem ressalvas materiais",
    ],
    tranches: [
      { label: "Tranche 1", valor: "A definir (referência: 60% do ticket total)", condicao: "Assinatura do SHA + due diligence aprovada", prazo: "D+30 do fechamento" },
      { label: "Tranche 2", valor: "A definir (referência: 40% restantes)",       condicao: "Gate operacional atingido",                  prazo: "D+180 do fechamento" },
    ],
    baseline:
      "Receita base do Grupo Energdy no momento do aporte — a ser auditada e documentada como piso de referência para cálculo de upside e earnout.",
    earnin:
      "Acelerador de participação: se Grupo Energdy atingir 2× o baseline de receita em 18 meses, AWQ pode exercer opção de aumento de participação sem desembolso adicional.",
  },

  b6: {
    financeiras: [
      { nome: "Receita Recorrente (MRR)", formula: "Soma de contratos ativos no mês / meses ativos", baseline: "R$2.000/mês (advisory)", meta: "R$20.000/mês em 24 meses", auditavel: true },
      { nome: "ARR (Receita Recorrente Anual)", formula: "MRR × 12", baseline: "R$24.000/ano", meta: "R$240.000/ano em 24 meses", auditavel: true },
      { nome: "EBITDA Ajustado", formula: "Resultado operacional antes de depreciação e amortização", baseline: "A definir pós-auditoria", meta: "Positivo em 18 meses", auditavel: true },
      { nome: "Runway (meses)", formula: "Caixa disponível / Burn mensal", baseline: "A definir", meta: "Mínimo 12 meses após aporte", auditavel: true },
    ],
    comerciais: [
      { nome: "Número de Contratos Ativos", formula: "Contagem de contratos vigentes com pagamento em dia", baseline: "1 (advisory AWQ)", meta: "5 contratos em 18 meses", auditavel: true },
      { nome: "Ticket Médio por Contrato", formula: "Receita total / número de contratos", baseline: "R$2.000/mês", meta: "R$5.000/mês em 24 meses", auditavel: true },
      { nome: "Taxa de Renovação", formula: "Contratos renovados / contratos vencidos", baseline: "100% (advisory)", meta: "≥ 85%", auditavel: true },
    ],
    institucionais: [
      { nome: "Governança Implantada", formula: "Checklist: board ativo, reporting, compliance", baseline: "Informal", meta: "Formalizada em 90 dias", auditavel: false },
      { nome: "Documentação Societária", formula: "SHA assinado, cap table auditado, CNPJ regular", baseline: "Em andamento", meta: "100% em D+60 do aporte", auditavel: true },
    ],
    periodicidade: "Revisão trimestral de scorecard com AWQ Venture",
    auditor:       "A definir — contador externo aceito por AWQ",
  },

  b7: {
    direitosAWQ: [
      "Assento no board advisory (com voto consultivo)",
      "Veto em decisões materiais: novas emissões, alienação de ativos, mudança de controle",
      "Acesso irrestrito a dados financeiros e operacionais mensais",
      "Tag-along em qualquer cessão de participação",
      "Opção de call para maioria conforme previsto no SHA",
    ],
    rotinasReporting: [
      "Relatório financeiro mensal (DRE, fluxo de caixa, runway)",
      "Reunião de alinhamento mensal com sócio AWQ designado",
      "Scorecard trimestral de métricas do Bloco 6",
      "Relatório anual auditado por contador externo",
    ],
    alcadasDecisao:
      "Decisões operacionais (até R$10K): autonomia total da empresa. Decisões financeiras relevantes (R$10K–R$100K): notificação prévia AWQ. Decisões estratégicas e acima de R$100K: co-aprovação AWQ obrigatória.",
    representacao:
      "AWQ Venture indica um membro para o board advisory com mandato de 24 meses, renovável.",
    conflito:
      "Conflitos de interesse declarados formalmente. Resolução por mediação em 30 dias; arbitragem se não resolvido. Câmara: CAMARB ou CAM-CCBC.",
  },

  b8: {
    goodLeaver:
      "Fundador/sócio que sai por acordo mútuo, aposentadoria ou doença recebe fair value da participação calculado por múltiplo de receita vigente, com prazo de pagamento de 12 meses.",
    badLeaver:
      "Fundador/sócio que sai por violação contratual, concorrência ou ato lesivo recebe valor nominal da participação (sem prêmio de liquidez), com lock-up de 24 meses para qualquer nova atividade concorrente.",
    antiDiluicao:
      "Proteção broad-based weighted average: em caso de novas rodadas, AWQ mantém percentual ajustado por fórmula padrão de mercado. Direito de preferência em novas emissões com prazo de exercício de 15 dias.",
    changeOfControl:
      "Qualquer mudança de controle acionário acima de 30% exige aprovação prévia da AWQ Venture. Em caso de venda da empresa, AWQ tem direito de drag-along proporcional.",
    tagDragAlong:
      "Tag-along: AWQ acompanha qualquer venda nas mesmas condições. Drag-along: AWQ pode exigir venda conjunta se oferta superar 2× o valuation de entrada por investidor estratégico qualificado.",
    clausulasPenais: [
      "Multa de 10% do ticket aportado por violação de exclusividade de negociação durante due diligence",
      "Multa de 20% do ticket por descumprimento de condição precedente sem justa causa",
      "Recompra compulsória a valor de entrada por omissão material de informação pré-aporte",
    ],
    lockup:
      "Lock-up de 18 meses para os fundadores após aporte. AWQ não tem lock-up após 12 meses.",
  },

  b9: {
    marcos: [
      { numero: 1, label: "Aceite da proposta",             descricao: "Confirmação formal de interesse pelo Grupo Energdy",            prazo: "Até 30/04/2026",     dependencia: "Resposta à esta proposta" },
      { numero: 2, label: "Due diligence",                  descricao: "Auditoria financeira, societária e operacional",                 prazo: "Até 31/05/2026",     dependencia: "Entrega de documentação completa" },
      { numero: 3, label: "Negociação do SHA",              descricao: "Shareholders Agreement e termos finais de participação",         prazo: "Até 15/06/2026",     dependencia: "DD aprovada sem ressalvas materiais" },
      { numero: 4, label: "Fechamento e Tranche 1",         descricao: "Assinatura do SHA e desembolso da primeira tranche",             prazo: "Até 30/06/2026",     dependencia: "SHA assinado por todas as partes" },
      { numero: 5, label: "Implantação de governança",      descricao: "Board ativo, reporting instalado, compliance básico",            prazo: "D+60 do fechamento", dependencia: "Tranche 1 liberada" },
      { numero: 6, label: "Revisão de scorecard (Gate 2)",  descricao: "Avaliação de métricas operacionais para liberação da Tranche 2", prazo: "D+180 do fechamento",dependencia: "Relatório auditado aprovado" },
    ],
    prazoTotal:          "Fechamento estimado Q3 2026 · ciclo completo 36 meses",
    janelaRevisao:       "Revisão anual do SHA e condições econômicas no aniversário do fechamento",
    condicoesAbertura:   ["Aceite formal desta proposta", "Entrega de documentação societária completa"],
    condicoesFechamento: [
      "Due diligence sem ressalvas materiais",
      "SHA assinado por todas as partes",
      "Cap table limpo e aprovado por advogado AWQ",
      "Fundadores com vesting formalizado (cliff 12 meses, total 36 meses)",
    ],
  },

  b10: {
    perguntasEstruturadas: [
      "Você concorda com o diagnóstico apresentado sobre o momento atual do Grupo Energdy?",
      "A tese de parceria (AWQ como operador-investidor) faz sentido para o estágio da empresa?",
      "O escopo de atuação proposto (o que AWQ entrega, coordena e não faz) está alinhado com suas expectativas?",
      "Os termos econômicos (fee continuado + participação societária + estrutura de tranches) são aceitáveis como base de negociação?",
      "As proteções contratuais propostas (good/bad leaver, anti-diluição, tag-drag) são razoáveis para ambas as partes?",
      "Você está pronto para avançar para due diligence e negociação do SHA dentro do cronograma proposto?",
    ],
    ctaLabel:    "Responda a esta proposta",
    ctaDescricao: "Avalie cada bloco individualmente. Aprove, solicite ajuste ou envie contraproposta. Ao final, confirme sua decisão geral para que a equipe AWQ Venture inicie os próximos passos.",
    caminhos: [
      { opcao: "aprovacao",      label: "Aprovar Proposta",           descricao: "Você concorda com os termos apresentados e autoriza AWQ a iniciar due diligence formal.",         cta: "Aprovar todos os termos" },
      { opcao: "ajuste",         label: "Solicitar Ajustes",          descricao: "Há pontos específicos que precisam de revisão. Indique cada um e AWQ preparará nova versão.",       cta: "Enviar ajustes para AWQ" },
      { opcao: "contraproposta", label: "Enviar Contraproposta",      descricao: "Você tem termos alternativos. Descreva sua contraproposta e AWQ avaliará formalmente.",             cta: "Enviar contraproposta" },
    ],
    prazoResposta:     "Resposta esperada em até 10 dias úteis a partir do recebimento",
    contatoNegociacao: "AWQ Venture · contato@awqventure.com.br",
  },
};

const grupoEnergdy: DealWorkspace = {
  ...stubDeal(
    "P007",
    "Grupo Energdy",
    "Energia / Utilities",
    "Due Diligence",
    5_000_000,
    8.1,
    "Alta",
    "Médio",
    "Advisory Contract",
    "Cliente ativo de advisory e incubação estratégica (fee R$2K/mês, 36 meses, contrato R$72K confirmado). Avaliação para participação estratégica ou aquisição parcial em andamento.",
    "Q3 2026",
  ),
  proposal10Blocks: energdyBlocks,
};

// Apenas deals reais confirmados.
export const dealWorkspaces: DealWorkspace[] = [
  grupoEnergdy,
];

// ─── Query helpers ────────────────────────────────────────────────────────────

export function getDealById(id: string): DealWorkspace | null {
  return dealWorkspaces.find((d) => d.id === id) ?? null;
}

export function getDealHoldingSummaries() {
  return dealWorkspaces.map(toDealHoldingSummary);
}
