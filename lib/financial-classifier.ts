// ─── AWQ Financial Classifier — Rule-based transaction classification ──────────
//
// DESIGN PRINCIPLES:
//   1. Rules are explicit and auditable — every classification has a traceable reason
//   2. Uncertainty is honest — ambiguous cases stay ambiguous, not forced to a category
//   3. Rules are additive — new patterns can be added without breaking existing ones
//   4. Confidence levels are real — "confirmed" only when pattern is unambiguous
//
// ENTITY MAPPING (from platform architecture):
//   Cora account → AWQ Holding / JACQES (context-dependent)
//   Itaú account → Caza Vision
//
// DO NOT import this module in client components.

import type {
  BankTransaction,
  EntityLayer,
  ManagerialCategory,
  ClassificationConfidence,
} from "./financial-db";

// ─── Classification result ────────────────────────────────────────────────────

export interface ClassificationResult {
  entity: EntityLayer;
  category: ManagerialCategory;
  confidence: ClassificationConfidence;
  note: string | null;
  counterpartyName: string | null;
}

// ─── Counterparty dictionary ──────────────────────────────────────────────────
// Pattern → { name, category, entity }
// Patterns are tested case-insensitively against descriptionOriginal.

interface CounterpartyRule {
  patterns: string[];
  name: string | null;
  category: ManagerialCategory;
  entity: EntityLayer | null;  // null = inherit from account entity
  confidence: ClassificationConfidence;
}

const COUNTERPARTY_RULES: CounterpartyRule[] = [
  // ── Banking fees / IOF — checked FIRST to prevent client-name patterns from
  //    firing on fee descriptions that happen to contain a bank/client name.
  //    e.g. "Tarifa mensal Nubank" must NOT match the "nubank" client entry.
  {
    patterns: [
      "tarifa", "ted tarifa", "tarifa ted", "tarifa pix", "tarifa manutencao",
      "tarifa mensal", "cot bancaria", "cobrança bancaria",
      // Itaú Empresas specific (confirmed in print 02/04/2026):
      "tar manut conta", "tar pix pgto", "tar pix pagto", "tar pix transf",
      "tarifa manutenção", "manutenção conta", "manutencao conta",
    ],
    name: null,
    category: "tarifa_bancaria",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["iof"],
    name: "IOF",
    category: "imposto_tributo",
    entity: null,
    confidence: "confirmed",
  },
  // ── Cora credit card limit reserve (confirmed in print 30/03/2026)
  //    "Reserva de Limite para Cartão" — internal collateral deposit within Cora.
  //    Money leaves checking balance, becomes credit card guarantee.
  //    NOT investment, NOT operational expense — internal transfer excluded from P&L.
  {
    patterns: ["reserva de limite", "reserva limite", "limite para cartao", "limite para cartão", "garantia cartao"],
    name: "Reserva de Limite — Cartão Cora",
    category: "reserva_limite_cartao",
    entity: null,
    confidence: "confirmed",
  },
  // ── AWQ PRODUCOES LTDA — intercompany (confirmed in prints 30/03–02/04/2026)
  //    Pix from AWQ Holding → AWQ Producoes: intercompany transfer, NOT new investment,
  //    NOT operational expense. Excluded from consolidated P&L.
  {
    patterns: ["awq producoes", "awq produções", "awq prod ltda", "awq producao"],
    name: "AWQ Producoes Ltda",
    category: "transferencia_interna_enviada",
    entity: null,  // keep accountEntity — this is AWQ's own transaction
    confidence: "confirmed",
  },
  // ── MIGUEL COSTA DE SOUZA — sócio / PF (confirmed in prints 01/04 + 03/04/2026)
  //    Pix to individual: R$1.000 + R$1.000 = R$2.000. Partner withdrawal / pro-labore.
  //    NOT investment. NOT operational expense.
  //    entity=null: keep accountEntity (AWQ_Holding) — entity tracks the ACCOUNT, not the payee.
  {
    patterns: ["miguel costa de souza", "miguel costa"],
    name: "Miguel Costa de Souza",
    category: "prolabore_retirada",
    entity: null,  // keep accountEntity — counterpartyName already captures payee identity
    confidence: "probable",
  },
  // ── Financial investments — resgates BEFORE aplicacoes so that descriptions
  //    containing both a redemption keyword AND an instrument name (e.g. "Resgate CDB")
  //    are correctly classified as resgate_financeiro, not aplicacao_financeira.
  {
    patterns: ["resgate", "resg.", "resgat"],
    name: null,
    category: "resgate_financeiro",
    entity: null,
    confidence: "probable",
  },
  {
    // "APLICACAO CDB DI" confirmed in Itaú Empresas print 02/04/2026 — R$5.000,00
    // This is applicação financeira: money leaving operating account → CDB investment.
    // NOT an operational expense. NOT a debit from P&L.
    patterns: ["aplicacao", "aplicação", "invest. aut", "investimento automatico", "cdb", "lci", "lca", "fundo de investimento", "rdb"],
    name: null,
    category: "aplicacao_financeira",
    entity: null,
    confidence: "probable",
  },
  // ── Government / taxes
  {
    patterns: ["receita federal", "pgfn", "darf", "das ", "simples nacional", "simples nac"],
    name: "Receita Federal",
    category: "imposto_tributo",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["iss ", "issqn", "nota fiscal servico", "nfs-e"],
    name: "ISS / ISSQN",
    category: "imposto_tributo",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["inss", "previdencia social"],
    name: "INSS",
    category: "imposto_tributo",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["fgts"],
    name: "FGTS",
    category: "folha_remuneracao",
    entity: null,
    confidence: "confirmed",
  },
  // ── Common SaaS / software
  {
    patterns: ["google workspace", "google gsuite", "g suite"],
    name: "Google Workspace",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["notion", "notion.so"],
    name: "Notion",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["adobe", "creative cloud"],
    name: "Adobe",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["slack"],
    name: "Slack",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["anthropic", "claude"],
    name: "Anthropic",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["openai"],
    name: "OpenAI",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["github", "git hub"],
    name: "GitHub",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["vercel"],
    name: "Vercel",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["aws ", "amazon web services"],
    name: "AWS",
    category: "software_assinatura",
    entity: null,
    confidence: "confirmed",
  },
  // ── Marketing / media
  {
    patterns: ["meta ads", "facebook ads", "instagram ads", "fb ads"],
    name: "Meta Ads",
    category: "marketing_midia",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["google ads", "google adwords"],
    name: "Google Ads",
    category: "marketing_midia",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["linkedin ads", "linkedin mkt"],
    name: "LinkedIn Ads",
    category: "marketing_midia",
    entity: null,
    confidence: "confirmed",
  },
  // ── Known clients (revenue) — after fees and investment rules to prevent
  //    false positives on bank-generated descriptions that echo the bank name.
  //    e.g. "Rendimento Nubank" or "Tarifa mensal Nubank" are fees, not client revenue.
  {
    patterns: ["ambev", "ab inbev"],
    name: "Ambev",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["natura", "natura&co"],
    name: "Natura",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["ifood", "i food"],
    name: "iFood",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["samsung"],
    name: "Samsung Brasil",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["nike"],
    name: "Nike Brasil",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["banco xp", "bxp", "xp investimentos", "xp sa"],
    name: "Banco XP",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  {
    // "pagamento nubank" / "pix nubank s.a." = client payment.
    // "nubank" alone is intentionally NOT in this list — too broad; caught by tarifa rule above.
    patterns: ["pagamento nubank", "pix nubank", "nu pagamentos"],
    name: "Nubank",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["arezzo"],
    name: "Arezzo",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  {
    patterns: ["magazine luiza", "magalu"],
    name: "Magazine Luiza",
    category: "receita_recorrente",
    entity: null,
    confidence: "confirmed",
  },
  // ── AWQ Holding confirmed revenue counterparties (from Cora print Mar–Apr 2026) ──
  {
    // R$9.000 received 01/04/2026 on Cora AWQ — production project revenue
    patterns: ["at films"],
    name: "AT FILMS",
    category: "receita_projeto",
    entity: null,
    confidence: "probable",
  },
  {
    // R$5.000 received 30/03/2026 on Cora AWQ — project/event revenue
    patterns: ["live roupas esportivas", "live roupas"],
    name: "Live Roupas Esportivas Ltda",
    category: "receita_projeto",
    entity: null,
    confidence: "probable",
  },
  {
    // R$3.200 received 02/04/2026 on Cora AWQ
    patterns: ["centro de ensino moderno", "ensino moderno"],
    name: "Centro de Ensino Moderno Ltda",
    category: "receita_recorrente",
    entity: null,
    confidence: "probable",
  },
  {
    // R$260 received 03/04/2026 on Cora AWQ — may be individual client or reimbursement
    patterns: ["mariana patrocinio", "mariana patroc"],
    name: "Mariana Patrocínio R Almeida",
    category: "receita_eventual",
    entity: null,
    confidence: "ambiguous",
  },
  // ── ENERDY — AWQ Venture advisory/incubation fee (confirmed contract)
  //    R$2.000/mês × 36 meses = R$72K contrato bruto.
  //    This is operating fee revenue for Venture (hybrid BU), NOT investment.
  {
    patterns: ["enerdy"],
    name: "ENERDY",
    category: "receita_fee_venture",
    entity: null,
    confidence: "confirmed",
  },
  // ── IOF / juros / multas — separated from imposto_tributo for DRE accuracy
  {
    patterns: ["multa", "mora ", "juros debito", "juros db", "encargo"],
    name: null,
    category: "juros_multa_iof",
    entity: null,
    confidence: "probable",
  },
  // ── Rendimentos financeiros (CDB, LCI, LCA, fundo)
  {
    patterns: ["rendimento", "rend. cdb", "rend cdb", "juros cdb", "creditado cdb", "creditado lci", "creditado lca"],
    name: null,
    category: "rendimento_financeiro",
    entity: null,
    confidence: "probable",
  },
  // ── Aluguel / locação
  {
    patterns: ["aluguel", "locação", "locacao", "coworking", "escritorio aluguel"],
    name: null,
    category: "aluguel_locacao",
    entity: null,
    confidence: "probable",
  },
  // ── Energia, água, internet
  {
    patterns: ["celpe", "cemig", "copel", "enel ", "light ", "sabesp", "cosanpa", "claro", "vivo ", "tim ", "oi internet", "net combof", "serasa broadband"],
    name: null,
    category: "energia_agua_internet",
    entity: null,
    confidence: "probable",
  },
  // ── Viagem / hospedagem
  {
    patterns: ["airbnb", "booking.com", "hotel", "pousada", "hospedagem", "passagem aerea", "gol airlines", "latam airlines", "azul linhas"],
    name: null,
    category: "viagem_hospedagem",
    entity: null,
    confidence: "probable",
  },
  // ── Serviços contábeis / jurídicos
  {
    patterns: ["contabilidade", "contador", "juridico", "advocacia", "escritorio adv", "compliance"],
    name: null,
    category: "servicos_contabeis_juridicos",
    entity: null,
    confidence: "probable",
  },
  // ── Compra operacional via cartão
  {
    patterns: ["debito cartao", "fatura cartao", "compra cartao", "pagto fatura"],
    name: null,
    category: "cartao_compra_operacional",
    entity: null,
    confidence: "ambiguous",
  },
  // ── Ajuste de crédito bancário (estorno, devolução, crédito avulso)
  {
    patterns: ["estorno", "devolucao", "devoluçao", "devol pix", "ajuste credito", "credito ajuste"],
    name: null,
    category: "ajuste_bancario_credito",
    entity: null,
    confidence: "probable",
  },
];

// ─── Pattern rules — structural heuristics ────────────────────────────────────

interface PatternRule {
  test: (desc: string, amount: number, direction: "credit" | "debit") => boolean;
  category: ManagerialCategory;
  entity: EntityLayer | null;
  confidence: ClassificationConfidence;
  note: string;
}

const PATTERN_RULES: PatternRule[] = [
  // Rendimento financeiro — before Pix patterns
  {
    test: (d) => /(rendimento|rend\. )/i.test(d),
    category: "rendimento_financeiro",
    entity: null,
    confidence: "probable",
    note: "Rendimento financeiro detectado — confirmar instrumento (CDB, LCI, LCA, fundo).",
  },
  // Pix transfers — high ambiguity, need counterparty to resolve
  {
    test: (d) => /\bpix\b/i.test(d) && /(recebido|entrada|credito|receb)/i.test(d),
    category: "recebimento_ambiguo",
    entity: null,
    confidence: "ambiguous",
    note: "Pix recebido — contrapartida não identificada. Pode ser receita ou transferência interna.",
  },
  {
    test: (d) => /\bpix\b/i.test(d) && /(enviado|saida|saída|debito|debit)/i.test(d),
    category: "despesa_ambigua",
    entity: null,
    confidence: "ambiguous",
    note: "Pix enviado — contrapartida não identificada. Pode ser despesa ou transferência interna.",
  },
  // TED / DOC transfers
  {
    test: (d) => /\bted\b|\bdoc\b/i.test(d),
    category: "despesa_ambigua",
    entity: null,
    confidence: "ambiguous",
    note: "TED/DOC — verificar se é transferência interna entre contas AWQ ou pagamento externo.",
  },
  // Salary pattern
  {
    test: (d) => /(salario|salário|pagamento func|pgto func|folha|vencimento)/i.test(d),
    category: "folha_remuneracao",
    entity: null,
    confidence: "probable",
    note: "Padrão de folha de pagamento detectado.",
  },
  // Pro-labore / withdrawal pattern
  {
    test: (d) => /(pro.?labore|prolab|retirada socio|retirada sócio|distribuicao|distribuição lucro)/i.test(d),
    category: "prolabore_retirada",
    entity: "Socio_PF",
    confidence: "probable",
    note: "Padrão de pró-labore ou retirada de sócio detectado.",
  },
  // Freelancer / contractor
  {
    test: (d) => /(freelan|autonomo|autônomo|mei |prestador|pgto prestacao|serv terceiro)/i.test(d),
    category: "freelancer_terceiro",
    entity: null,
    confidence: "probable",
    note: "Padrão de pagamento a freelancer ou prestador autônomo.",
  },
  // Fuel / transport
  {
    test: (d) => /(combustivel|combustível|posto |petroleo|petrobrás|gasolina|abasteci|uber|99app|taxi)/i.test(d),
    category: "deslocamento_combustivel",
    entity: null,
    confidence: "probable",
    note: "Despesa de deslocamento ou combustível.",
  },
  // Food — could be operational or personal
  {
    test: (d, _a, dir) =>
      /(restaurante|lanchonete|padaria|alimentacao|refeic|ifood|rappi|uber eats)/i.test(d) &&
      dir === "debit",
    category: "alimentacao_representacao",
    entity: null,
    confidence: "ambiguous",
    note: "Alimentação — pode ser representação operacional ou despesa pessoal misturada. Verificar se é horário comercial.",
  },
  // Rent
  {
    test: (d) => /(aluguel|locacao|locação|escritorio|coworking)/i.test(d),
    category: "fornecedor_operacional",
    entity: null,
    confidence: "probable",
    note: "Aluguel ou locação comercial.",
  },
  // Personal expense red flags
  {
    test: (d) => /(farmacia|farmácia|drogasil|ultrafarma|academia|gym |netflix|spotify|amazon prime|globoplay|disney)/i.test(d),
    category: "despesa_pessoal_misturada",
    entity: "Socio_PF",
    confidence: "probable",
    note: "Despesa pessoal detectada em conta PJ — registrar como pessoal misturada.",
  },
  // Generic operational payment
  {
    test: (_d, _a, dir) => dir === "debit",
    category: "fornecedor_operacional",
    entity: null,
    confidence: "ambiguous",
    note: "Débito não classificado — fallback para fornecedor operacional ambíguo.",
  },
  // Generic credit
  {
    test: (_d, _a, dir) => dir === "credit",
    category: "recebimento_ambiguo",
    entity: null,
    confidence: "ambiguous",
    note: "Crédito não classificado — revisar origem.",
  },
];

// ─── Entity inference from account ───────────────────────────────────────────
//
// Delegates to lib/bank-account-registry.ts for full account topology.
// The registry is the canonical source — add new accounts there, not here.

import { inferEntityFromRegistry } from "./bank-account-registry";

export function inferEntityFromAccount(bank: string, accountName: string): EntityLayer {
  return inferEntityFromRegistry(bank, accountName);
}

// ─── Main classifier ──────────────────────────────────────────────────────────

export function classifyTransaction(
  desc: string,
  amount: number,
  direction: "credit" | "debit",
  accountEntity: EntityLayer
): ClassificationResult {
  const d = desc.toLowerCase();

  // 1. Try counterparty dictionary first (highest confidence)
  for (const rule of COUNTERPARTY_RULES) {
    for (const pattern of rule.patterns) {
      if (d.includes(pattern.toLowerCase())) {
        return {
          entity: rule.entity ?? accountEntity,
          category: rule.category,
          confidence: rule.confidence,
          note: null,
          counterpartyName: rule.name,
        };
      }
    }
  }

  // 2. Try structural pattern rules
  for (const rule of PATTERN_RULES) {
    if (rule.test(d, amount, direction)) {
      return {
        entity: rule.entity ?? accountEntity,
        category: rule.category,
        confidence: rule.confidence,
        note: rule.note,
        counterpartyName: null,
      };
    }
  }

  // 3. Final fallback — should not reach here given the catch-all rules above
  return {
    entity: accountEntity,
    category: "unclassified",
    confidence: "unclassifiable",
    note: "Lançamento não classificável pelas regras atuais — revisão manual necessária.",
    counterpartyName: null,
  };
}

// ─── Batch classify ───────────────────────────────────────────────────────────

export function classifyAll(
  transactions: Pick<
    BankTransaction,
    "id" | "descriptionOriginal" | "amount" | "direction" | "entity"
  >[]
): Map<string, ClassificationResult> {
  const results = new Map<string, ClassificationResult>();
  for (const txn of transactions) {
    results.set(
      txn.id,
      classifyTransaction(
        txn.descriptionOriginal,
        txn.amount,
        txn.direction,
        txn.entity
      )
    );
  }
  return results;
}

// ─── Category labels for display ─────────────────────────────────────────────

export const CATEGORY_LABELS: Record<ManagerialCategory, string> = {
  // ── Entradas ──────────────────────────────────────────────────────────────
  receita_recorrente:             "Receita Recorrente",
  receita_projeto:                "Receita de Projeto",
  receita_consultoria:            "Receita de Consultoria",
  receita_producao:               "Receita de Produção",
  receita_social_media:           "Receita Social Media",
  receita_revenue_share:          "Revenue Share",
  receita_fee_venture:            "Fee Recorrente Venture",
  receita_eventual:               "Receita Eventual",
  rendimento_financeiro:          "Rendimento Financeiro",
  aporte_socio:                   "Aporte do Sócio",
  transferencia_interna_recebida: "Transferência Intercompany (recebida)",
  ajuste_bancario_credito:        "Ajuste / Crédito Bancário",
  recebimento_ambiguo:            "Recebimento Ambíguo",
  // ── Saídas ────────────────────────────────────────────────────────────────
  fornecedor_operacional:         "Fornecedor Operacional",
  freelancer_terceiro:            "Freelancer / Terceiro",
  folha_remuneracao:              "Folha / Remuneração",
  prolabore_retirada:             "Pró-labore / Retirada",
  imposto_tributo:                "Imposto / Tributo",
  juros_multa_iof:                "Juros / Multa / IOF",
  tarifa_bancaria:                "Tarifa Bancária",
  software_assinatura:            "Software / Assinatura",
  marketing_midia:                "Marketing / Mídia Paga",
  deslocamento_combustivel:       "Deslocamento / Combustível",
  alimentacao_representacao:      "Alimentação / Representação",
  viagem_hospedagem:              "Viagem / Hospedagem",
  aluguel_locacao:                "Aluguel / Locação",
  energia_agua_internet:          "Energia / Água / Internet",
  servicos_contabeis_juridicos:   "Serviços Contábeis / Jurídicos",
  cartao_compra_operacional:      "Compra via Cartão Corporativo",
  despesa_pessoal_misturada:      "Despesa Pessoal Misturada",
  aplicacao_financeira:           "Aplicação Financeira",
  resgate_financeiro:             "Resgate Financeiro",
  transferencia_interna_enviada:  "Transferência Intercompany (enviada)",
  reserva_limite_cartao:          "Reserva Limite Cartão",
  despesa_ambigua:                "Despesa Ambígua",
  unclassified:                   "Não Classificado",
};

export const ENTITY_LABELS: Record<EntityLayer, string> = {
  AWQ_Holding:   "AWQ Holding",
  JACQES:        "JACQES",
  Caza_Vision:   "Caza Vision",
  Intercompany:  "Intercompany",
  Socio_PF:      "Sócio / PF",
  Unknown:       "Não identificado",
};

// Revenue categories — full DRE revenue taxonomy
export const REVENUE_CATEGORIES: ManagerialCategory[] = [
  "receita_recorrente",
  "receita_projeto",
  "receita_consultoria",
  "receita_producao",
  "receita_social_media",
  "receita_revenue_share",
  "receita_fee_venture",
  "receita_eventual",
  "rendimento_financeiro",
  "ajuste_bancario_credito",
];

// Excluded from consolidated P&L (pass-through, no P&L impact)
export const CONSOLIDATION_EXCLUDED_CATEGORIES: ManagerialCategory[] = [
  "transferencia_interna_recebida",
  "transferencia_interna_enviada",
  "reserva_limite_cartao",
  "aplicacao_financeira",
  "resgate_financeiro",
];
