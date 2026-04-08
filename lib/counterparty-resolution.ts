// ─── AWQ Counterparty Resolution — Camada 2 ──────────────────────────────────
//
// Centralised counterparty registry for reconciliation and audit trail.
//
// DESIGN:
//   Each counterparty has a canonical name, optional CNPJ, entity type,
//   known aliases (bank description patterns), and confidence level.
//
//   The classifier (financial-classifier.ts) already handles MATCHING
//   patterns → categories. This registry adds the IDENTITY layer:
//   who is the counterparty, what type of entity, and how confident
//   are we in the identification?
//
// USAGE:
//   1. Import resolveCounterparty(description) for name/CNPJ lookup
//   2. Import COUNTERPARTY_REGISTRY for full audit display
//   3. Pages import for display; classifier imports for enrichment
//
// EXPANSION:
//   Add new entries when new counterparties appear in bank statements.
//   CNPJ should be populated when confirmed by NF, contract, or CNPJ lookup.

// ─── Types ────────────────────────────────────────────────────────────────────

export type CounterpartyType =
  | "client"               // paying customer (generates revenue)
  | "supplier"             // operational supplier / vendor
  | "freelancer"           // individual contractor / MEI
  | "partner"              // sócio / partner (person)
  | "intercompany"         // AWQ group entity (Holding, Producoes, etc.)
  | "bank"                 // banking institution (fees, tariffs)
  | "government"           // tax authority, regulatory body
  | "investment_vehicle"   // CDB, LCI, fund — not a person/entity
  | "saas_vendor"          // SaaS / software subscription
  | "media_platform"       // advertising platform (Meta, Google, etc.)
  | "utility"              // energy, water, internet, telecom
  | "unknown";

export type ResolutionConfidence =
  | "confirmed"    // CNPJ verified or contract-backed
  | "probable"     // pattern match with high specificity
  | "inferred"     // reasonable inference from context
  | "ambiguous";   // multiple possible matches

export interface CounterpartyEntry {
  id:               string;
  canonicalName:    string;
  cnpj:             string | null;
  type:             CounterpartyType;
  aliases:          string[];         // bank description patterns (lowercase)
  confidence:       ResolutionConfidence;
  note:             string | null;
  buAffinity:       string | null;    // which BU this counterparty is primarily associated with
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const COUNTERPARTY_REGISTRY: CounterpartyEntry[] = [
  // ── Clients (confirmed from Cora print Mar–Apr 2026) ───────────────────────
  {
    id:            "cp_at_films",
    canonicalName: "AT FILMS",
    cnpj:          null,
    type:          "client",
    aliases:       ["at films"],
    confidence:    "probable",
    note:          "R$9.000 Pix recebido 01/04/2026. Produção audiovisual / conteúdo.",
    buAffinity:    "AWQ_Holding",
  },
  {
    id:            "cp_live_roupas",
    canonicalName: "Live Roupas Esportivas Ltda",
    cnpj:          null,
    type:          "client",
    aliases:       ["live roupas esportivas", "live roupas"],
    confidence:    "probable",
    note:          "R$5.000 Pix recebido 30/03/2026. Projeto/evento esportivo.",
    buAffinity:    "AWQ_Holding",
  },
  {
    id:            "cp_centro_ensino",
    canonicalName: "Centro de Ensino Moderno Ltda",
    cnpj:          null,
    type:          "client",
    aliases:       ["centro de ensino moderno", "ensino moderno"],
    confidence:    "probable",
    note:          "R$3.200 Pix recebido 02/04/2026. Cliente recorrente.",
    buAffinity:    "AWQ_Holding",
  },
  {
    id:            "cp_mariana",
    canonicalName: "Mariana Patrocínio R Almeida",
    cnpj:          null,
    type:          "client",
    aliases:       ["mariana patrocinio", "mariana patroc"],
    confidence:    "ambiguous",
    note:          "R$260 Pix recebido 03/04/2026. Pessoa física — possivelmente cliente avulso ou reembolso.",
    buAffinity:    "AWQ_Holding",
  },
  {
    id:            "cp_enerdy",
    canonicalName: "ENERDY",
    cnpj:          null,
    type:          "client",
    aliases:       ["enerdy"],
    confidence:    "confirmed",
    note:          "Fee recorrente de advisory/incubação. R$2.000/mês × 36 meses. Contrato ativo. AWQ Venture.",
    buAffinity:    "venture",
  },
  // ── JACQES known clients (from snapshot data / market knowledge) ───────────
  {
    id:            "cp_ambev",
    canonicalName: "Ambev S.A.",
    cnpj:          "07.526.557/0001-00",
    type:          "client",
    aliases:       ["ambev", "ab inbev"],
    confidence:    "confirmed",
    note:          "JACQES top client. ~20% MRR concentration.",
    buAffinity:    "JACQES",
  },
  {
    id:            "cp_samsung",
    canonicalName: "Samsung Eletrônica da Amazônia Ltda",
    cnpj:          "00.280.273/0001-37",
    type:          "client",
    aliases:       ["samsung"],
    confidence:    "confirmed",
    note:          "JACQES client. ~16% MRR.",
    buAffinity:    "JACQES",
  },
  {
    id:            "cp_natura",
    canonicalName: "Natura Cosméticos S.A.",
    cnpj:          "71.673.990/0001-77",
    type:          "client",
    aliases:       ["natura", "natura&co"],
    confidence:    "confirmed",
    note:          "JACQES client. ~14% MRR.",
    buAffinity:    "JACQES",
  },
  // ── Intercompany ───────────────────────────────────────────────────────────
  {
    id:            "cp_awq_producoes",
    canonicalName: "AWQ Producoes Ltda",
    cnpj:          null,
    type:          "intercompany",
    aliases:       ["awq producoes", "awq produções", "awq prod ltda", "awq producao"],
    confidence:    "confirmed",
    note:          "Intercompany. Total confirmed: R$14.000 (3 Pix transfers Mar–Apr 2026).",
    buAffinity:    "AWQ_Holding",
  },
  // ── Partner / Sócio ────────────────────────────────────────────────────────
  {
    id:            "cp_miguel_costa",
    canonicalName: "Miguel Costa de Souza",
    cnpj:          null,
    type:          "partner",
    aliases:       ["miguel costa de souza", "miguel costa"],
    confidence:    "confirmed",
    note:          "Sócio. R$2.000 total pró-labore/retirada (2× R$1.000). NÃO investimento.",
    buAffinity:    null,
  },
  // ── Banking / fees ─────────────────────────────────────────────────────────
  {
    id:            "cp_itau_fee",
    canonicalName: "Itaú Unibanco — Tarifas",
    cnpj:          "60.701.190/0001-04",
    type:          "bank",
    aliases:       ["tar manut conta", "tar pix pgto", "tar pix transf", "tarifa manutenção"],
    confidence:    "confirmed",
    note:          "Tarifas Itaú Empresas. R$87 + R$21,60 confirmadas por print.",
    buAffinity:    null,
  },
  {
    id:            "cp_cora_cartao",
    canonicalName: "Cora — Reserva Cartão",
    cnpj:          null,
    type:          "bank",
    aliases:       ["reserva de limite", "reserva limite", "limite para cartao", "limite para cartão"],
    confidence:    "confirmed",
    note:          "Reserva de garantia para limite de cartão. Interno à conta. 2×R$500 = R$1.000.",
    buAffinity:    null,
  },
  // ── SaaS vendors ───────────────────────────────────────────────────────────
  {
    id:            "cp_google_workspace",
    canonicalName: "Google Workspace",
    cnpj:          null,
    type:          "saas_vendor",
    aliases:       ["google workspace", "google gsuite", "g suite"],
    confidence:    "confirmed",
    note:          null,
    buAffinity:    null,
  },
  {
    id:            "cp_anthropic",
    canonicalName: "Anthropic",
    cnpj:          null,
    type:          "saas_vendor",
    aliases:       ["anthropic", "claude"],
    confidence:    "confirmed",
    note:          null,
    buAffinity:    null,
  },
];

// ─── Resolution function ──────────────────────────────────────────────────────

export interface ResolvedCounterparty {
  entry:      CounterpartyEntry | null;
  confidence: ResolutionConfidence;
  matchedOn:  string | null;           // which alias matched
}

/**
 * Resolve a bank description to a known counterparty.
 * Returns null entry if no match found.
 */
export function resolveCounterparty(description: string): ResolvedCounterparty {
  const d = description.toLowerCase();

  for (const entry of COUNTERPARTY_REGISTRY) {
    for (const alias of entry.aliases) {
      if (d.includes(alias)) {
        return {
          entry,
          confidence: entry.confidence,
          matchedOn:  alias,
        };
      }
    }
  }

  return { entry: null, confidence: "ambiguous", matchedOn: null };
}

/**
 * Get all counterparties of a specific type.
 */
export function getCounterpartiesByType(type: CounterpartyType): CounterpartyEntry[] {
  return COUNTERPARTY_REGISTRY.filter((e) => e.type === type);
}

/**
 * Get counterparty by canonical name.
 */
export function getCounterpartyByName(name: string): CounterpartyEntry | undefined {
  return COUNTERPARTY_REGISTRY.find(
    (e) => e.canonicalName.toLowerCase() === name.toLowerCase()
  );
}
