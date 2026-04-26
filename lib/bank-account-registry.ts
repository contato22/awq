// ─── AWQ Bank Account Registry ────────────────────────────────────────────────
//
// CANONICAL source of truth for the known bank account topology of AWQ Group.
//
// PURPOSE:
//   1. Entity inference  — ingest pipeline reads this to assign EntityLayer
//   2. Coverage gaps     — financial-query reads this to detect missing extracts
//   3. Management UI     — /awq/management renders this as the account matrix
//   4. Reconciliation    — reconciler reads this to know which accounts are AWQ-owned
//
// RULES:
//   • Every bank account used by AWQ Group must be registered here BEFORE ingest.
//   • Do NOT add account-specific financial values here — those belong in
//     financial-db.ts (from ingested documents).
//   • Do NOT hardcode balances here — this is topology, not accounting.
//
// HOW TO ADD A NEW ACCOUNT:
//   1. Add an entry to KNOWN_ACCOUNTS with the correct bank, accountName and entity.
//   2. Run the ingest pipeline for that account's PDF.
//   3. The classifier's inferEntityFromAccount() function will auto-match via this file.

import type { EntityLayer, BankName } from "./financial-db";

// ─── Account descriptor ────────────────────────────────────────────────────────

export type AccountUsageType =
  | "operating_cash"         // day-to-day receipts and disbursements
  | "investment_vehicle"     // financial applications / redemptions (CDB, LCI, etc.)
  | "payroll"                // salary/pro-labore disbursements
  | "tax"                    // DARF, DAS, tributos
  | "shared_multiuse";       // mixed — requires careful classification

export interface KnownBankAccount {
  /** Identifier slug — unique within this registry */
  id: string;
  /** Exact bank name matching BankName union (used to route parsers) */
  bank: BankName;
  /** Human account name as it will appear on uploaded documents and UI */
  accountName: string;
  /** Masked account number if known — null if not yet determined */
  accountNumberHint: string | null;
  /** AWQ entity this account belongs to */
  entity: EntityLayer;
  /** Primary usage — affects classification and exclusion from consolidated */
  usage: AccountUsageType;
  /** Parser format used — determines which parser runs first */
  parserFormat: "cora" | "itau" | "nubank" | "inter" | "btg" | "generic";
  /** Whether this account participates in intercompany reconciliation */
  participatesInIntercompany: boolean;
  /** Period when this account became active (YYYY-MM) */
  activeSince: string;
  /** Set to YYYY-MM when closed; null = still active */
  closedAt: string | null;
  /** Narrative note for governance/management display */
  notes: string;
}

// ─── Registry ─────────────────────────────────────────────────────────────────
//
// Q1 2026 known topology. Add new accounts here as they are onboarded.

export const KNOWN_ACCOUNTS: KnownBankAccount[] = [
  // ── AWQ Holding ────────────────────────────────────────────────────────────
  {
    id:                        "awq-cora-holding",
    bank:                      "Cora",
    accountName:               "Conta PJ AWQ Holding",
    accountNumberHint:         null,
    entity:                    "AWQ_Holding",
    usage:                     "operating_cash",
    parserFormat:              "cora",
    participatesInIntercompany: true,
    activeSince:               "2024-01",
    closedAt:                  null,
    notes:
      "Conta operacional principal da holding AWQ. Recebe distribuições das BUs " +
      "e paga despesas consolidadas. Sujeita a transferências intercompany com JACQES e Caza Vision.",
  },

  // ── JACQES ─────────────────────────────────────────────────────────────────
  {
    id:                        "jacqes-cora-operating",
    bank:                      "Cora",
    accountName:               "Conta PJ JACQES",
    accountNumberHint:         null,
    entity:                    "JACQES",
    usage:                     "operating_cash",
    parserFormat:              "cora",
    participatesInIntercompany: true,
    activeSince:               "2023-06",
    closedAt:                  null,
    notes:
      "Conta operacional da JACQES. Recebe receitas de clientes (Ambev, Samsung, Natura, etc.) " +
      "e paga fornecedores, folha e tributos. Banco Cora (conta PJ). " +
      "Identificada em ingest por accountName contendo 'JACQES'.",
  },

  // ── Caza Vision ────────────────────────────────────────────────────────────
  {
    id:                        "caza-itau-operating",
    bank:                      "Itaú",
    accountName:               "Conta PJ Caza Vision",
    accountNumberHint:         null,
    entity:                    "Caza_Vision",
    usage:                     "operating_cash",
    parserFormat:              "itau",
    participatesInIntercompany: true,
    activeSince:               "2022-03",
    closedAt:                  null,
    notes:
      "Conta operacional da Caza Vision. Recebe receitas de clientes (Banco XP, Nubank, etc.) " +
      "e paga despesas de produção. Banco Itaú PJ. " +
      "Formato do extrato: Itaú PJ com colunas Data | Histórico | Doc | Valor | D/C | Saldo.",
  },

  // ── AWQ Holding — Itaú Empresas (investment account with CDB DI) ──────────
  //
  // EMPIRICAL: confirmed by bank print 02–04 Apr 2026.
  // This is the AWQ Holding treasury investment account at Itaú Empresas.
  // It is NOT the Caza Vision operating account.
  //
  // CLASSIFICATION RULES (mandatory — evidenced by print):
  //   "APLICACAO CDB DI"           → aplicacao_financeira   (NOT despesa operacional)
  //   "TAR MANUT CONTA"            → tarifa_bancaria        (NOT investimento)
  //   "TAR PIX PGTO TRANSF"        → tarifa_bancaria        (NOT investimento)
  //   saldo em conta R$1.193,58    → investmentCashAccountBalance (NOT saldo investido)
  //   saldo total investido R$15.762,62 → captured by closingBalance of investment sub-account
  //
  // DO NOT confuse with caza-itau-operating (Caza Vision PJ account — also Itaú).
  {
    id:                        "awq-itau-empresas-investment",
    bank:                      "Itaú",
    accountName:               "Conta Itaú Empresas AWQ",
    accountNumberHint:         null,
    entity:                    "AWQ_Holding",
    usage:                     "investment_vehicle",
    parserFormat:              "itau",
    participatesInIntercompany: false,
    activeSince:               "2024-01",
    closedAt:                  null,
    notes:
      "Conta Itaú Empresas da AWQ Holding com aplicações em CDB DI (renda fixa). " +
      "Saldo investido confirmado por print: R$15.762,62 (CDB DI). " +
      "Saldo em conta: R$1.193,58 — operacional, NÃO saldo investido. " +
      "Tarifas (R$87 manutenção + R$21,60 Pix) são tarifa_bancaria, jamais investimento. " +
      "APLICACAO CDB DI é aplicacao_financeira — excluída do P&L operacional.",
  },

  // ── AWQ Venture (future BTG investment vehicle — aspirational) ─────────────
  //
  // NOTE: As of Q1 2026, the confirmed real investment vehicle is awq-itau-empresas-investment.
  // This BTG account is aspirational/planned — no document ingested yet.
  // Do NOT attribute financial values from awq-group-data.ts Venture BU to this account.
  {
    id:                        "venture-btg-investment",
    bank:                      "BTG Empresas",
    accountName:               "Conta Investimentos AWQ Venture",
    accountNumberHint:         null,
    entity:                    "AWQ_Holding",
    usage:                     "investment_vehicle",
    parserFormat:              "btg",
    participatesInIntercompany: false,
    activeSince:               "2023-01",
    closedAt:                  null,
    notes:
      "Conta de investimentos BTG (aspiracional / planejamento). " +
      "Conta real confirmada em 2026: awq-itau-empresas-investment (Itaú Empresas). " +
      "Sem extrato ingerido — sem dados reais.",
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

/** All active accounts (not closed). */
export const activeAccounts = KNOWN_ACCOUNTS.filter((a) => a.closedAt === null);

/** Active operating accounts (participating in P&L consolidation). */
export const operatingAccounts = activeAccounts.filter(
  (a) => a.usage === "operating_cash" && a.participatesInIntercompany
);

/** Active investment accounts (excluded from P&L). */
export const investmentAccounts = activeAccounts.filter(
  (a) => a.usage === "investment_vehicle"
);

/** Entities that MUST have at least one "done" document for full coverage. */
export const REQUIRED_COVERAGE_ENTITIES: EntityLayer[] = Array.from(
  new Set(operatingAccounts.map((a) => a.entity))
);

/**
 * Infer EntityLayer from bank name and account name by matching against registry.
 * Falls back to matching by bank only, then returns "Unknown".
 *
 * Called by financial-classifier.ts — replaces the hardcoded Cora/Itaú checks.
 */
export function inferEntityFromRegistry(bank: string, accountName: string): EntityLayer {
  const bLower = bank.toLowerCase();
  const aLower = accountName.toLowerCase();

  // 1. Try exact accountName match first (most specific)
  for (const acct of KNOWN_ACCOUNTS) {
    if (
      acct.bank.toLowerCase() === bLower &&
      aLower.includes(acct.accountName.toLowerCase().split(" ").slice(-2).join(" ").toLowerCase())
    ) {
      return acct.entity;
    }
  }

  // 2. Try bank + keyword in accountName
  for (const acct of KNOWN_ACCOUNTS) {
    if (acct.bank.toLowerCase() === bLower) {
      // Match by entity hints in accountName
      const entityKeywords: Record<EntityLayer, string[]> = {
        AWQ_Holding:  ["awq", "holding", "venture"],
        JACQES:       ["jacqes"],
        Caza_Vision:  ["caza", "vision"],
        Intercompany: ["interco", "intercompany"],
        Socio_PF:     ["socio", "pf", "pessoal"],
        Unknown:      [],
      };
      const hints = entityKeywords[acct.entity] ?? [];
      if (hints.some((h) => aLower.includes(h))) {
        return acct.entity;
      }
    }
  }

  // 3. Fall back to bank-only inference (legacy behavior)
  if (bLower.includes("cora")) {
    // Cora can be AWQ_Holding or JACQES — default to AWQ_Holding
    if (aLower.includes("jacqes")) return "JACQES";
    return "AWQ_Holding";
  }
  if (bLower.includes("itaú") || bLower.includes("itau")) {
    // Itaú can be Caza_Vision (operating PJ) OR AWQ_Holding (Itaú Empresas investment).
    // Distinguish by account name keywords.
    if (aLower.includes("caza") || aLower.includes("vision")) return "Caza_Vision";
    if (aLower.includes("awq") || aLower.includes("holding") || aLower.includes("empresas")) return "AWQ_Holding";
    // Ambiguous Itaú account — return Unknown to surface the gap in coverage reports.
    return "Unknown";
  }
  if (bLower.includes("btg")) return "AWQ_Holding";  // BTG used by Venture (held under AWQ Holding)
  if (bLower.includes("nubank") && aLower.includes("caza")) return "Caza_Vision";
  if (bLower.includes("inter") && aLower.includes("jacqes")) return "JACQES";

  return "Unknown";
}

/**
 * Get the known account descriptor for a given bank/accountName combination.
 * Returns null if not registered.
 */
export function findKnownAccount(bank: string, accountName: string): KnownBankAccount | null {
  const bLower = bank.toLowerCase();
  const aLower = accountName.toLowerCase();
  return (
    KNOWN_ACCOUNTS.find(
      (a) =>
        a.bank.toLowerCase() === bLower &&
        (aLower.includes(a.accountName.toLowerCase().split(" ").slice(-1)[0]) ||
          a.accountName.toLowerCase().includes(aLower.split(" ").pop() ?? ""))
    ) ?? null
  );
}

/**
 * Check whether a given bank/entity combination is an investment vehicle.
 * Investment vehicles MUST NOT contribute to P&L or FCO.
 */
export function isInvestmentVehicle(bank: string, accountName: string): boolean {
  const acct = findKnownAccount(bank, accountName);
  return acct?.usage === "investment_vehicle";
}

// ─── Coverage report ──────────────────────────────────────────────────────────

export interface AccountCoverageStatus {
  account:      KnownBankAccount;
  hasData:      boolean;    // at least one "done" document for this account
  documentIds:  string[];
  periodStart:  string | null;
  periodEnd:    string | null;
  closingBalance: number | null;
}

/**
 * Build a coverage report for the management page.
 * Accepts the list of "done" FinancialDocuments (not imported here to avoid cycles).
 */
export function buildAccountCoverageReport(
  doneDocs: Array<{
    id: string;
    bank: string;
    accountName: string;
    periodStart: string | null;
    periodEnd: string | null;
    closingBalance: number | null;
  }>
): AccountCoverageStatus[] {
  return KNOWN_ACCOUNTS.map((acct): AccountCoverageStatus => {
    const matching = doneDocs.filter(
      (d) =>
        d.bank.toLowerCase() === acct.bank.toLowerCase() &&
        (d.accountName.toLowerCase().includes(acct.id.split("-").pop() ?? "") ||
          acct.accountName.toLowerCase().includes(d.accountName.toLowerCase().split(" ").pop() ?? "") ||
          d.accountName.toLowerCase().includes(acct.entity.toLowerCase().replace("_", " ").toLowerCase()) ||
          // Caza-specific: "caza" in account name
          (acct.entity === "Caza_Vision" && d.accountName.toLowerCase().includes("caza")) ||
          (acct.entity === "JACQES" && d.accountName.toLowerCase().includes("jacqes")) ||
          (acct.entity === "AWQ_Holding" && !d.accountName.toLowerCase().includes("jacqes") && !d.accountName.toLowerCase().includes("caza"))
        )
    );

    const periods = matching.map((d) => d.periodStart).filter(Boolean) as string[];
    const ends    = matching.map((d) => d.periodEnd).filter(Boolean) as string[];

    return {
      account:        acct,
      hasData:        matching.length > 0,
      documentIds:    matching.map((d) => d.id),
      periodStart:    periods.length > 0 ? periods.sort()[0] : null,
      periodEnd:      ends.length > 0 ? ends.sort().reverse()[0] : null,
      closingBalance: matching.length > 0 ? (matching[matching.length - 1].closingBalance ?? null) : null,
    };
  });
}
