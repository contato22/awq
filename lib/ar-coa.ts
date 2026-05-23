// AR Chart of Accounts — Section 1.1.2 (CONTAS A RECEBER CLIENTES)
// Plano de contas AWQ Group — hierarquia completa em 6 níveis.

export interface ARCoaNode {
  code:          string;
  label:         string;
  isLeaf:        boolean;
  isDeductible?: boolean;  // PDD / ajustes (negative balance)
  pddRate?:      number;   // 0-1 fraction for PDD accounts
  currency?:     "BRL" | "USD" | "EUR" | "OTHER";
  children?:     ARCoaNode[];
}

export const AR_COA_TREE: ARCoaNode = {
  code: "1.1.2.0.0.0", label: "CONTAS A RECEBER (CLIENTES)", isLeaf: false,
  children: [
    {
      code: "1.1.2.1.0.0", label: "CLIENTES NACIONAIS — SERVICES", isLeaf: false,
      children: [
        {
          code: "1.1.2.1.1.0", label: "AR — JACQES (Marketing Services)", isLeaf: false,
          children: [
            { code: "1.1.2.1.1.1", label: "JACQES — Tier 1 (R$997/mês)", isLeaf: true },
            { code: "1.1.2.1.1.2", label: "JACQES — Tier 2 (R$1.790/mês)", isLeaf: true },
            { code: "1.1.2.1.1.3", label: "JACQES — Tier 3 (R$3.200/mês)", isLeaf: true },
            { code: "1.1.2.1.1.4", label: "JACQES — Custom/Enterprise", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.1.2.0", label: "AR — CAZA (Video Production)", isLeaf: false,
          children: [
            { code: "1.1.2.1.2.1", label: "CAZA — Projects <R$10K", isLeaf: true },
            { code: "1.1.2.1.2.2", label: "CAZA — Projects R$10-30K", isLeaf: true },
            { code: "1.1.2.1.2.3", label: "CAZA — Projects R$30-50K", isLeaf: true },
            { code: "1.1.2.1.2.4", label: "CAZA — Projects >R$50K", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.1.3.0", label: "AR — ADVISOR (Strategic Consulting)", isLeaf: false,
          children: [
            { code: "1.1.2.1.3.1", label: "ADVISOR — Retainer R$20-30K", isLeaf: true },
            { code: "1.1.2.1.3.2", label: "ADVISOR — Retainer R$30-50K", isLeaf: true },
            { code: "1.1.2.1.3.3", label: "ADVISOR — Project-Based", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.1.4.0", label: "AR — ENRD", isLeaf: false,
          children: [
            { code: "1.1.2.1.4.1", label: "ENRD — Enerdy", isLeaf: true },
            { code: "1.1.2.1.4.2", label: "ENRD — Coral Home", isLeaf: true },
            { code: "1.1.2.1.4.3", label: "ENRD — Other Clients", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.1.5.0", label: "AR — SERVICES OTHER", isLeaf: false,
          children: [
            { code: "1.1.2.1.5.1", label: "White-Label Services (Partners)", isLeaf: true },
            { code: "1.1.2.1.5.2", label: "One-Off Projects (Misc)", isLeaf: true },
          ],
        },
      ],
    },
    {
      code: "1.1.2.2.0.0", label: "CLIENTES INTERNACIONAIS", isLeaf: false,
      children: [
        {
          code: "1.1.2.2.1.0", label: "AR — International (USD)", isLeaf: false, currency: "USD",
          children: [
            { code: "1.1.2.2.1.1", label: "US Clients", isLeaf: true, currency: "USD" },
            { code: "1.1.2.2.1.2", label: "LatAm Clients (USD invoiced)", isLeaf: true, currency: "USD" },
          ],
        },
        {
          code: "1.1.2.2.2.0", label: "AR — International (EUR)", isLeaf: false, currency: "EUR",
          children: [
            { code: "1.1.2.2.2.1", label: "Europe Clients", isLeaf: true, currency: "EUR" },
          ],
        },
        { code: "1.1.2.2.3.0", label: "AR — International (Other Currency)", isLeaf: true, currency: "OTHER" },
      ],
    },
    {
      code: "1.1.2.3.0.0", label: "CLIENTES — CAPITAL REVENUES", isLeaf: false,
      children: [
        {
          code: "1.1.2.3.1.0", label: "AR — M&A ADVISORY", isLeaf: false,
          children: [
            { code: "1.1.2.3.1.1", label: "M&A — Retainer Fees (Upfront)", isLeaf: true },
            { code: "1.1.2.3.1.2", label: "M&A — Success Fees (Transaction close)", isLeaf: true },
            { code: "1.1.2.3.1.3", label: "M&A — Milestone Payments", isLeaf: true },
            { code: "1.1.2.3.1.4", label: "M&A — Advisory Ongoing (Post-Close)", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.3.2.0", label: "AR — DEBT FACILITATION", isLeaf: false,
          children: [
            { code: "1.1.2.3.2.1", label: "Debt — Origination Fees (1-3%)", isLeaf: true },
            { code: "1.1.2.3.2.2", label: "Debt — Servicing Fees (Ongoing)", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.3.3.0", label: "AR — BOARD ADVISORY", isLeaf: false,
          children: [
            { code: "1.1.2.3.3.1", label: "Board Fees — Portfolio Co A", isLeaf: true },
            { code: "1.1.2.3.3.2", label: "Board Fees — Portfolio Co B", isLeaf: true },
            { code: "1.1.2.3.3.3", label: "Board Fees — External (Non-Portfolio)", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.3.4.0", label: "AR — FRACTIONAL CFO/COO", isLeaf: false,
          children: [
            { code: "1.1.2.3.4.1", label: "Fractional CFO — Portco A", isLeaf: true },
            { code: "1.1.2.3.4.2", label: "Fractional CFO — Portco B", isLeaf: true },
            { code: "1.1.2.3.4.3", label: "Fractional COO — Portco C", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.3.5.0", label: "AR — EQUITY DISTRIBUTIONS", isLeaf: false,
          children: [
            { code: "1.1.2.3.5.1", label: "Dividends Receivable — Portfolio", isLeaf: true },
            { code: "1.1.2.3.5.2", label: "Capital Gains — Exit Proceeds Pending", isLeaf: true },
            { code: "1.1.2.3.5.3", label: "Earnout Receivable (Contingent Payment)", isLeaf: true },
          ],
        },
      ],
    },
    {
      code: "1.1.2.4.0.0", label: "CLIENTES — PLATFORM (SaaS)", isLeaf: false,
      children: [
        {
          code: "1.1.2.4.1.0", label: "AR — CONTROL TOWER SaaS", isLeaf: false,
          children: [
            { code: "1.1.2.4.1.1", label: "SaaS — SMB Tier (R$500-1K/mês)", isLeaf: true },
            { code: "1.1.2.4.1.2", label: "SaaS — Growth Tier (R$1-3K/mês)", isLeaf: true },
            { code: "1.1.2.4.1.3", label: "SaaS — Enterprise Tier (R$3-5K/mês)", isLeaf: true },
            { code: "1.1.2.4.1.4", label: "SaaS — Custom/White-Label", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.4.2.0", label: "AR — BENCHMARKING/DATA", isLeaf: false,
          children: [
            { code: "1.1.2.4.2.1", label: "Data Subscriptions — Monthly", isLeaf: true },
            { code: "1.1.2.4.2.2", label: "Data Subscriptions — Annual Prepaid", isLeaf: true },
            { code: "1.1.2.4.2.3", label: "Custom Reports (One-Off)", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.4.3.0", label: "AR — RECRUITING FEES", isLeaf: false,
          children: [
            { code: "1.1.2.4.3.1", label: "Recruiting — 50% Upfront (Pending)", isLeaf: true },
            { code: "1.1.2.4.3.2", label: "Recruiting — 50% Post-90d Guarantee", isLeaf: true },
            { code: "1.1.2.4.3.3", label: "Recruiting — Replacement Guarantee", isLeaf: true },
          ],
        },
      ],
    },
    {
      code: "1.1.2.5.0.0", label: "AR — PARTES RELACIONADAS", isLeaf: false,
      children: [
        {
          code: "1.1.2.5.1.0", label: "AR — Portfolio Companies (Intragroup)", isLeaf: false,
          children: [
            { code: "1.1.2.5.1.1", label: "AR — Enerdy (Services provided)", isLeaf: true },
            { code: "1.1.2.5.1.2", label: "AR — Portco A", isLeaf: true },
            { code: "1.1.2.5.1.3", label: "AR — Portco B", isLeaf: true },
          ],
        },
        {
          code: "1.1.2.5.2.0", label: "AR — Sócios (Shareholder Advances)", isLeaf: false,
          children: [
            { code: "1.1.2.5.2.1", label: "AR — Miguel (Adiantamentos)", isLeaf: true },
            { code: "1.1.2.5.2.2", label: "AR — Danilo (Adiantamentos)", isLeaf: true },
            { code: "1.1.2.5.2.3", label: "AR — Gabriel (Adiantamentos)", isLeaf: true },
          ],
        },
      ],
    },
    {
      code: "1.1.2.6.0.0", label: "(-) AJUSTES VALOR REALIZÁVEL", isLeaf: false, isDeductible: true,
      children: [
        {
          code: "1.1.2.6.1.0", label: "(-) PDD — SERVICES", isLeaf: false, isDeductible: true,
          children: [
            { code: "1.1.2.6.1.1", label: "(-) PDD JACQES (3%)", isLeaf: true, isDeductible: true, pddRate: 0.03 },
            { code: "1.1.2.6.1.2", label: "(-) PDD CAZA (2%)", isLeaf: true, isDeductible: true, pddRate: 0.02 },
            { code: "1.1.2.6.1.3", label: "(-) PDD ADVISOR (1%)", isLeaf: true, isDeductible: true, pddRate: 0.01 },
            { code: "1.1.2.6.1.4", label: "(-) PDD ENRD (4%)", isLeaf: true, isDeductible: true, pddRate: 0.04 },
          ],
        },
        {
          code: "1.1.2.6.2.0", label: "(-) PDD — CAPITAL", isLeaf: false, isDeductible: true,
          children: [
            { code: "1.1.2.6.2.1", label: "(-) PDD M&A Fees (0.5%)", isLeaf: true, isDeductible: true, pddRate: 0.005 },
            { code: "1.1.2.6.2.2", label: "(-) PDD Board Fees (1%)", isLeaf: true, isDeductible: true, pddRate: 0.01 },
            { code: "1.1.2.6.2.3", label: "(-) PDD Fractional (2%)", isLeaf: true, isDeductible: true, pddRate: 0.02 },
          ],
        },
        {
          code: "1.1.2.6.3.0", label: "(-) PDD — PLATFORM", isLeaf: false, isDeductible: true,
          children: [
            { code: "1.1.2.6.3.1", label: "(-) PDD SaaS (2%)", isLeaf: true, isDeductible: true, pddRate: 0.02 },
            { code: "1.1.2.6.3.2", label: "(-) PDD Recruiting (5%)", isLeaf: true, isDeductible: true, pddRate: 0.05 },
          ],
        },
        {
          code: "1.1.2.6.4.0", label: "(-) DESCONTOS & DEVOLUÇÕES", isLeaf: false, isDeductible: true,
          children: [
            { code: "1.1.2.6.4.1", label: "(-) Descontos Concedidos", isLeaf: true, isDeductible: true },
            { code: "1.1.2.6.4.2", label: "(-) Devoluções/Cancelamentos", isLeaf: true, isDeductible: true },
            { code: "1.1.2.6.4.3", label: "(-) Abatimentos (Quality issues)", isLeaf: true, isDeductible: true },
          ],
        },
      ],
    },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function flattenARCoa(node: ARCoaNode = AR_COA_TREE): ARCoaNode[] {
  const result: ARCoaNode[] = [node];
  for (const child of node.children ?? []) {
    result.push(...flattenARCoa(child));
  }
  return result;
}

export function getLeafAccounts(node: ARCoaNode = AR_COA_TREE): ARCoaNode[] {
  if (node.isLeaf) return [node];
  return (node.children ?? []).flatMap(getLeafAccounts);
}

/** Estimated PDD rate based on account code prefix. */
export function getPddRate(accountCode: string): number {
  if (accountCode.startsWith("1.1.2.1.1")) return 0.03; // JACQES
  if (accountCode.startsWith("1.1.2.1.2")) return 0.02; // CAZA
  if (accountCode.startsWith("1.1.2.1.3")) return 0.01; // ADVISOR
  if (accountCode.startsWith("1.1.2.1.4")) return 0.04; // ENRD
  if (accountCode.startsWith("1.1.2.1.5")) return 0.02; // OTHER SERVICES
  if (accountCode.startsWith("1.1.2.2"))   return 0.02; // INTERNATIONAL
  if (accountCode.startsWith("1.1.2.3.1")) return 0.005; // M&A
  if (accountCode.startsWith("1.1.2.3.2")) return 0.01;  // DEBT
  if (accountCode.startsWith("1.1.2.3.3")) return 0.01;  // BOARD
  if (accountCode.startsWith("1.1.2.3.4")) return 0.02;  // FRACTIONAL
  if (accountCode.startsWith("1.1.2.3.5")) return 0.05;  // EQUITY
  if (accountCode.startsWith("1.1.2.4.1")) return 0.02;  // SAAS
  if (accountCode.startsWith("1.1.2.4.2")) return 0.02;  // DATA
  if (accountCode.startsWith("1.1.2.4.3")) return 0.05;  // RECRUITING
  if (accountCode.startsWith("1.1.2.5"))   return 0;     // INTERCOMPANY
  return 0.02; // default
}

/** Flat map for O(1) lookups by code. */
export const AR_COA_MAP: Map<string, ARCoaNode> = new Map(
  flattenARCoa().map((n) => [n.code, n])
);
