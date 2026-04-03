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
  // ── Known clients (revenue)
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
    patterns: ["nubank", "nu pagamentos"],
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
  // ── Banking fees
  {
    patterns: ["tarifa", "ted tarifa", "tarifa ted", "tarifa pix", "tarifa manutencao", "tarifa mensal", "cot bancaria", "cobrança bancaria"],
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
  // ── Financial investments
  {
    patterns: ["aplicacao", "aplicação", "invest. aut", "investimento automatico", "cdb", "lci", "lca", "fundo de investimento", "rdb"],
    name: null,
    category: "aplicacao_financeira",
    entity: null,
    confidence: "probable",
  },
  {
    patterns: ["resgate", "resg.", "resgat"],
    name: null,
    category: "resgate_financeiro",
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
  receita_recorrente:           "Receita Recorrente",
  receita_projeto:              "Receita de Projeto",
  receita_eventual:             "Receita Eventual",
  aporte_socio:                 "Aporte do Sócio",
  transferencia_interna_recebida: "Transferência Interna (entrada)",
  transferencia_interna_enviada:  "Transferência Interna (saída)",
  fornecedor_operacional:       "Fornecedor Operacional",
  freelancer_terceiro:          "Freelancer / Terceiro",
  folha_remuneracao:            "Folha / Remuneração",
  prolabore_retirada:           "Pró-labore / Retirada",
  imposto_tributo:              "Imposto / Tributo",
  tarifa_bancaria:              "Tarifa Bancária",
  software_assinatura:          "Software / Assinatura",
  marketing_midia:              "Marketing / Mídia",
  deslocamento_combustivel:     "Deslocamento / Combustível",
  alimentacao_representacao:    "Alimentação / Representação",
  despesa_pessoal_misturada:    "Despesa Pessoal Misturada",
  aplicacao_financeira:         "Aplicação Financeira",
  resgate_financeiro:           "Resgate Financeiro",
  despesa_ambigua:              "Despesa Ambígua",
  recebimento_ambiguo:          "Recebimento Ambíguo",
  unclassified:                 "Não Classificado",
};

export const ENTITY_LABELS: Record<EntityLayer, string> = {
  AWQ_Holding:   "AWQ Holding",
  JACQES:        "JACQES",
  Caza_Vision:   "Caza Vision",
  Intercompany:  "Intercompany",
  Socio_PF:      "Sócio / PF",
  Unknown:       "Não identificado",
};

// Revenue categories — used to compute total revenue, excluding intercompany
export const REVENUE_CATEGORIES: ManagerialCategory[] = [
  "receita_recorrente",
  "receita_projeto",
  "receita_eventual",
];

// Excluded from consolidated P&L
export const CONSOLIDATION_EXCLUDED_CATEGORIES: ManagerialCategory[] = [
  "transferencia_interna_recebida",
  "transferencia_interna_enviada",
  "aplicacao_financeira",
  "resgate_financeiro",
];
