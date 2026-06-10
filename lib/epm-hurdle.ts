// ─── EPM Hurdle Rate — Data Access Layer ─────────────────────────────────────
//
// Serves the /awq/epm/hurdle page with:
//   • Per-BU hurdle rates (WACC + risk premium) — DB with static fallback
//   • Project pipeline with IRR, ROIC, CAPEX, payback — DB with static fallback
//   • Derived WACC from real BU data (getBUData + buildDreQuery)
//
// DO NOT import in client components.

import { sql, USE_DB } from "./db";
import { getBUData, getConsolidated }    from "./epm-planning-db";
import { buildDreQuery }                 from "./dre-query";
import { listProjects, contractValue }   from "./ppm-db";
import { getAPARKPIs }                   from "./ap-ar-db";
import type { BuCode as APARBuCode }     from "./ap-ar-db";
import { getCashPositionByEntity }       from "./financial-db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HurdleStatus = "approved" | "rejected" | "watch" | "pending";

export interface BuHurdleConfig {
  bu_id:            string;
  bu:               string;
  hurdle:           number;
  wacc:             number;
  riskPremium:      number;
  /** Real BU financials enriched at query time */
  revenue?:         number;
  ebitda?:          number;
  roic?:            number;
  capitalAllocated?: number;
  projectCount:     number;
}

export interface HurdleProject {
  id:          string;
  name:        string;
  bu_id:       string;
  bu:          string;
  capex:       number;
  irr:         number | null;
  roic:        number | null;
  paybackMo:   number | null;
  hurdle:      number;
  status:      HurdleStatus;
  description: string;
  source:      "db" | "static";
}

export interface HurdleAnalysis {
  buHurdles:      BuHurdleConfig[];
  projects:       HurdleProject[];
  /** WACC derivation notes for each BU */
  waccDerivation: Record<string, { costOfDebt: number; costOfEquity: number; debtShare: number; equityShare: number }>;
  dataSource:     "db" | "static";
}

// ─── Static defaults ──────────────────────────────────────────────────────────
// These serve as fallback AND as the seed for the DB table.

const STATIC_HURDLES: Omit<BuHurdleConfig, "projectCount" | "revenue" | "ebitda" | "roic" | "capitalAllocated">[] = [
  { bu_id: "holding",  bu: "AWQ Holding",  hurdle: 15, wacc: 12, riskPremium: 3  },
  { bu_id: "jacqes",   bu: "JACQES",       hurdle: 18, wacc: 13, riskPremium: 5  },
  { bu_id: "venture",  bu: "AWQ Venture",  hurdle: 25, wacc: 15, riskPremium: 10 },
  { bu_id: "caza",     bu: "Caza Vision",  hurdle: 20, wacc: 14, riskPremium: 6  },
];

const STATIC_PROJECTS: Omit<HurdleProject, "hurdle" | "source">[] = [
  {
    id: "PRJ-001", name: "Expansão Sede SP",
    bu_id: "holding", bu: "AWQ Holding",
    capex: 850_000, irr: 22.4, roic: 19.1, paybackMo: 38,
    status: "approved",
    description: "Ampliação do escritório principal + infraestrutura de TI",
  },
  {
    id: "PRJ-002", name: "Sistema ERP Integrado",
    bu_id: "holding", bu: "AWQ Holding",
    capex: 320_000, irr: 11.2, roic: 9.8, paybackMo: 54,
    status: "rejected",
    description: "Migração para plataforma ERP unificada — IRR abaixo do hurdle",
  },
  {
    id: "PRJ-003", name: "Linha Produção JACQES v2",
    bu_id: "jacqes", bu: "JACQES",
    capex: 1_200_000, irr: 24.7, roic: 21.3, paybackMo: 30,
    status: "approved",
    description: "Nova linha de produção para escalar capacidade em 40%",
  },
  {
    id: "PRJ-004", name: "Automação Logística",
    bu_id: "jacqes", bu: "JACQES",
    capex: 450_000, irr: 17.1, roic: 15.4, paybackMo: 42,
    status: "watch",
    description: "IRR marginal — monitorar premissas de custo de frete",
  },
  {
    id: "PRJ-005", name: "Seed — TechCo A",
    bu_id: "venture", bu: "AWQ Venture",
    capex: 200_000, irr: 38.0, roic: null, paybackMo: null,
    status: "approved",
    description: "Rodada seed com participação de 12% — retorno estimado 3.8x",
  },
  {
    id: "PRJ-006", name: "Seed — FinTech B",
    bu_id: "venture", bu: "AWQ Venture",
    capex: 150_000, irr: 19.5, roic: null, paybackMo: null,
    status: "rejected",
    description: "IRR projetado abaixo do hurdle para Venture — risco não compensado",
  },
  {
    id: "PRJ-007", name: "Portfolio Series A",
    bu_id: "venture", bu: "AWQ Venture",
    capex: 500_000, irr: 31.2, roic: null, paybackMo: null,
    status: "approved",
    description: "Follow-on em portfólio existente com tração comprovada",
  },
  {
    id: "PRJ-008", name: "Expansão Caza RJ",
    bu_id: "caza", bu: "Caza Vision",
    capex: 280_000, irr: null, roic: null, paybackMo: null,
    status: "pending",
    description: "Análise em andamento — aguardando estudo de viabilidade de mercado",
  },
];

// ─── DB row mappers ───────────────────────────────────────────────────────────

function rowToHurdle(r: Record<string, unknown>): Omit<BuHurdleConfig, "projectCount"> {
  return {
    bu_id:       String(r.bu_id),
    bu:          String(r.bu_name),
    hurdle:      Number(r.hurdle_pct),
    wacc:        Number(r.wacc_pct),
    riskPremium: Number(r.risk_premium_pct),
  };
}

function rowToProject(r: Record<string, unknown>, hurdleMap: Map<string, number>): HurdleProject {
  const bu_id = String(r.bu_id);
  return {
    id:          String(r.id),
    name:        String(r.name),
    bu_id,
    bu:          String(r.bu_name),
    capex:       Number(r.capex),
    irr:         r.irr_pct    != null ? Number(r.irr_pct)     : null,
    roic:        r.roic_pct   != null ? Number(r.roic_pct)    : null,
    paybackMo:   r.payback_mo != null ? Number(r.payback_mo)  : null,
    hurdle:      hurdleMap.get(bu_id) ?? 15,
    status:      String(r.status) as HurdleStatus,
    description: String(r.description ?? ""),
    source:      "db",
  };
}

// ─── WACC derivation from real BU data ───────────────────────────────────────
// Approach:
//   Cost of equity (Re)  ≈ ROIC (from planning DB — proxy for expected return on equity)
//   Cost of debt   (Rd)  ≈ dreFinancialExpenses / capitalAllocated (from cash basis)
//   WACC = Re × (equity share) + Rd × (1 - 0.34) × (debt share)
//   Debt share assumed = 1 - equity share ≈ 0.30 for operational BUs, 0.10 for Venture
// This is an approximation — override with manual DB entries for precision.

async function deriveWACC(): Promise<Record<string, {
  costOfDebt: number; costOfEquity: number; debtShare: number; equityShare: number; wacc: number;
}>> {
  const result: Record<string, { costOfDebt: number; costOfEquity: number; debtShare: number; equityShare: number; wacc: number }> = {};

  try {
    const [buData, dre] = await Promise.all([
      getBUData(),
      buildDreQuery("all").catch(() => null),
    ]);

    const TAX_RATE  = 0.34; // IRPJ + CSLL (Brasil)
    const BU_DEBT_SHARES: Record<string, number> = {
      holding: 0.20, jacqes: 0.35, venture: 0.05, caza: 0.25,
    };

    for (const bu of buData) {
      const debtShare   = BU_DEBT_SHARES[bu.id] ?? 0.25;
      const equityShare = 1 - debtShare;
      // Cost of equity: use ROIC as proxy (represents return shareholders expect)
      const costOfEquity = bu.roic > 0 ? bu.roic * 100 : 12;
      // Cost of debt: derive from total financial expenses / capital if available
      let costOfDebt = 8; // default Selic-based estimate
      if (dre && dre.dreFinancialExpenses > 0 && bu.capitalAllocated > 0) {
        costOfDebt = Math.min((dre.dreFinancialExpenses / bu.capitalAllocated) * 100, 30);
      }
      const wacc = equityShare * costOfEquity + debtShare * costOfDebt * (1 - TAX_RATE);
      result[bu.id] = { costOfDebt, costOfEquity, debtShare, equityShare, wacc };
    }
  } catch { /* fall through — callers use static hurdle rates */ }

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getHurdleAnalysis(): Promise<HurdleAnalysis> {
  // Fetch real BU financial data and WACC derivation in parallel
  const [buData, waccMap] = await Promise.all([
    getBUData().catch(() => []),
    deriveWACC().catch(() => ({} as Record<string, { costOfDebt: number; costOfEquity: number; debtShare: number; equityShare: number; wacc: number }>)),
  ]);

  const buMap = new Map(buData.map((b) => [b.id, b]));

  // ── Hurdle rates ────────────────────────────────────────────────────────────
  let hurdleRows: Omit<BuHurdleConfig, "projectCount">[] = [];
  let projectRows: HurdleProject[] = [];
  let dataSource: "db" | "static" = "static";

  if (sql && USE_DB) {
    try {
      const rows = await sql`SELECT * FROM epm_hurdle_rates ORDER BY bu_id`;
      if (rows.length > 0) {
        hurdleRows  = rows.map((r) => rowToHurdle(r as Record<string, unknown>));
        dataSource  = "db";
      }
    } catch { /* fall through */ }
  }

  if (hurdleRows.length === 0) {
    hurdleRows = STATIC_HURDLES.map((h) => ({ ...h }));
  }

  // Override WACC with derived values when available and meaningful
  hurdleRows = hurdleRows.map((h) => {
    const derived = waccMap[h.bu_id];
    if (derived && derived.wacc > 0) {
      const wacc        = Math.round(derived.wacc * 10) / 10;
      const hurdle      = Math.round((wacc + h.riskPremium) * 10) / 10;
      return { ...h, wacc, hurdle };
    }
    return h;
  });

  const hurdleMap = new Map(hurdleRows.map((h) => [h.bu_id, h.hurdle]));

  // ── Projects ────────────────────────────────────────────────────────────────
  if (sql && USE_DB) {
    try {
      const rows = await sql`SELECT * FROM epm_hurdle_projects ORDER BY bu_id, id`;
      if (rows.length > 0) {
        projectRows = rows.map((r) => rowToProject(r as Record<string, unknown>, hurdleMap));
        dataSource  = "db";
      }
    } catch { /* fall through */ }
  }

  if (projectRows.length === 0) {
    projectRows = STATIC_PROJECTS.map((p) => ({
      ...p,
      hurdle: hurdleMap.get(p.bu_id) ?? 15,
      source: "static" as const,
    }));
  }

  // ── Enrich BU hurdle configs with real financial data ──────────────────────
  const buHurdles: BuHurdleConfig[] = hurdleRows.map((h) => {
    const bu  = buMap.get(h.bu_id);
    const prj = projectRows.filter((p) => p.bu_id === h.bu_id);
    return {
      ...h,
      revenue:          bu?.revenue,
      ebitda:           bu?.ebitda,
      roic:             bu?.roic !== undefined ? bu.roic * 100 : undefined,
      capitalAllocated: bu?.capitalAllocated,
      projectCount:     prj.length,
    };
  });

  return { buHurdles, projects: projectRows, waccDerivation: waccMap, dataSource };
}

// ─── Upsert helpers (for future admin UI) ────────────────────────────────────

export async function upsertHurdleRate(data: Omit<BuHurdleConfig, "projectCount" | "revenue" | "ebitda" | "roic" | "capitalAllocated">): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_hurdle_rates (bu_id, bu_name, wacc_pct, risk_premium_pct, hurdle_pct, updated_at)
    VALUES (${data.bu_id}, ${data.bu}, ${data.wacc}, ${data.riskPremium}, ${data.hurdle}, ${now})
    ON CONFLICT (bu_id) DO UPDATE SET
      bu_name          = EXCLUDED.bu_name,
      wacc_pct         = EXCLUDED.wacc_pct,
      risk_premium_pct = EXCLUDED.risk_premium_pct,
      hurdle_pct       = EXCLUDED.hurdle_pct,
      updated_at       = EXCLUDED.updated_at
  `;
}

export async function upsertHurdleProject(data: Omit<HurdleProject, "source">): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_hurdle_projects (
      id, name, bu_id, bu_name, capex, irr_pct, roic_pct, payback_mo,
      status, description, updated_at
    ) VALUES (
      ${data.id}, ${data.name}, ${data.bu_id}, ${data.bu}, ${data.capex},
      ${data.irr ?? null}, ${data.roic ?? null}, ${data.paybackMo ?? null},
      ${data.status}, ${data.description}, ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      name        = EXCLUDED.name,
      bu_id       = EXCLUDED.bu_id,
      bu_name     = EXCLUDED.bu_name,
      capex       = EXCLUDED.capex,
      irr_pct     = EXCLUDED.irr_pct,
      roic_pct    = EXCLUDED.roic_pct,
      payback_mo  = EXCLUDED.payback_mo,
      status      = EXCLUDED.status,
      description = EXCLUDED.description,
      updated_at  = EXCLUDED.updated_at
  `;
}

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

export async function initHurdleDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_hurdle_rates (
      bu_id            TEXT PRIMARY KEY,
      bu_name          TEXT NOT NULL,
      wacc_pct         NUMERIC(5,2) NOT NULL DEFAULT 12,
      risk_premium_pct NUMERIC(5,2) NOT NULL DEFAULT 3,
      hurdle_pct       NUMERIC(5,2) NOT NULL DEFAULT 15,
      updated_at       TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS epm_hurdle_projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      bu_id       TEXT NOT NULL,
      bu_name     TEXT NOT NULL,
      capex       NUMERIC(15,2) DEFAULT 0,
      irr_pct     NUMERIC(6,2),
      roic_pct    NUMERIC(6,2),
      payback_mo  INTEGER,
      status      TEXT NOT NULL DEFAULT 'pending',
      description TEXT,
      updated_at  TEXT
    )
  `;
}

export async function seedHurdleData(): Promise<{ seeded: string[] }> {
  const seeded: string[] = [];
  await initHurdleDB();

  for (const h of STATIC_HURDLES) {
    await upsertHurdleRate(h).catch(() => {});
  }
  seeded.push("epm_hurdle_rates");

  const hurdleMap = new Map(STATIC_HURDLES.map((h) => [h.bu_id, h.hurdle]));
  for (const p of STATIC_PROJECTS) {
    await upsertHurdleProject({ ...p, hurdle: hurdleMap.get(p.bu_id) ?? 15 }).catch(() => {});
  }
  seeded.push("epm_hurdle_projects");

  return { seeded };
}

// Computes summary metrics from an already-fetched HurdleAnalysis (no extra DB round-trip).
export function computeHurdleSummary(analysis: HurdleAnalysis) {
  const { projects, buHurdles } = analysis;
  const approved      = projects.filter((p) => p.status === "approved");
  const rejected      = projects.filter((p) => p.status === "rejected");
  const watch         = projects.filter((p) => p.status === "watch");
  const totalCapex    = projects.reduce((s, p) => s + p.capex, 0);
  const approvedCapex = approved.reduce((s, p) => s + p.capex, 0);
  const evaluated     = projects.filter((p) => p.status !== "pending");
  const approvalRate  = evaluated.length > 0 ? (approved.length / evaluated.length) * 100 : 0;
  const withIrr       = approved.filter((p) => p.irr !== null);
  const avgIrr        = withIrr.length > 0
    ? withIrr.reduce((s, p) => s + (p.irr as number), 0) / withIrr.length
    : null;
  const avgHurdle     = buHurdles.length > 0
    ? buHurdles.reduce((s, h) => s + h.hurdle, 0) / buHurdles.length
    : 0;
  return {
    total: projects.length, approved: approved.length,
    rejected: rejected.length, watch: watch.length,
    totalCapex, approvedCapex, approvalRate, avgIrr, avgHurdle,
  };
}

// Convenience wrapper for callers that don't have analysis in hand yet.
export async function getHurdleSummary() {
  return computeHurdleSummary(await getHurdleAnalysis());
}

// ─── PPM integration ─────────────────────────────────────────────────────────
// Maps PPM operational projects to hurdle-rate comparison rows.
// IRR proxy = (contractValue - budgetCost) / budgetCost × 100 (return on cost).

const PPM_BU_TO_HURDLE: Record<string, string> = {
  AWQ: "holding", JACQES: "jacqes", CAZA: "caza", VENTURE: "venture", ADVISOR: "advisor",
};

export interface PpmHurdleRow {
  id:            string;
  code:          string;
  name:          string;
  bu_id:         string;
  bu:            string;
  type:          string;
  phase:         string;
  health:        string;
  budgetCost:    number;
  actualCost:    number;
  contractRev:   number;
  actualRevenue: number;
  completionPct: number;
  expectedRoi:   number | null;
  actualRoi:     number | null;
  hurdle:        number;
  status:        HurdleStatus;
}

export async function getPPMHurdleRows(buHurdles: BuHurdleConfig[]): Promise<PpmHurdleRow[]> {
  try {
    const hMap = new Map(buHurdles.map((h) => [h.bu_id, h.hurdle]));
    const projects = await listProjects();
    return projects
      .filter((p) => PPM_BU_TO_HURDLE[p.bu_code] != null)
      .map((p) => {
        const bu_id = PPM_BU_TO_HURDLE[p.bu_code]!;
        const hurdle = hMap.get(bu_id) ?? 15;
        const cv = contractValue(p);
        const expectedRoi =
          cv > 0 && p.budget_cost > 0 ? ((cv - p.budget_cost) / p.budget_cost) * 100 : null;
        const actualRoi =
          p.actual_cost > 0 && p.budget_cost > 0
            ? ((p.actual_revenue - p.actual_cost) / p.budget_cost) * 100
            : null;
        let status: HurdleStatus = "pending";
        if (expectedRoi !== null) {
          if (p.health_status === "red" || expectedRoi < hurdle) status = "rejected";
          else if (expectedRoi < hurdle + 2 || p.health_status === "yellow") status = "watch";
          else status = "approved";
        }
        return {
          id: p.project_id, code: p.project_code, name: p.project_name,
          bu_id, bu: p.bu_name ?? p.bu_code,
          type: p.project_type, phase: p.phase, health: p.health_status,
          budgetCost: p.budget_cost, actualCost: p.actual_cost,
          contractRev: cv, actualRevenue: p.actual_revenue,
          completionPct: p.completion_pct ?? 0,
          expectedRoi, actualRoi, hurdle, status,
        };
      });
  } catch { return []; }
}

// ─── AR/AP & Capital context ──────────────────────────────────────────────────
// Aggregates AR outstanding, AP outstanding, DSO/DPO, and actual capital deployed
// (aplicacao_financeira bank transactions) per BU for cash-flow context.

const APAR_BU_TO_HURDLE: Record<string, string> = {
  AWQ: "holding", JACQES: "jacqes", CAZA: "caza", VENTURE: "venture", ADVISOR: "advisor",
};
const ENTITY_TO_HURDLE: Record<string, string> = {
  AWQ_Holding: "holding", JACQES: "jacqes", Caza_Vision: "caza",
};

export interface BuCashContext {
  arOutstanding:  number;
  arOverdue:      number;
  apOutstanding:  number;
  apOverdue:      number;
  dso:            number | null;
  dpo:            number | null;
  ccc:            number | null;
  capitalDeployed: number;
}

export async function getBUCashContext(): Promise<Record<string, BuCashContext>> {
  const ctx: Record<string, BuCashContext> = {};
  for (const hId of Object.values(APAR_BU_TO_HURDLE)) {
    ctx[hId] = { arOutstanding: 0, arOverdue: 0, apOutstanding: 0, apOverdue: 0, dso: null, dpo: null, ccc: null, capitalDeployed: 0 };
  }

  // AR/AP KPIs per BU — parallel fetch
  await Promise.all(
    Object.entries(APAR_BU_TO_HURDLE).map(async ([buCode, hId]) => {
      try {
        const kpis = await getAPARKPIs(buCode as APARBuCode);
        ctx[hId] = {
          ...ctx[hId],
          arOutstanding: kpis.totalAROutstanding,
          arOverdue:     kpis.totalAROverdue,
          apOutstanding: kpis.totalAPOutstanding,
          apOverdue:     kpis.totalAPOverdue,
          dso:           kpis.dso,
          dpo:           kpis.dpo,
          ccc:           kpis.ccc,
        };
      } catch { /* keep zeros */ }
    })
  );

  // Capital deployed from conciliação (aplicacao_financeira transactions)
  try {
    const positions = await getCashPositionByEntity();
    for (const pos of positions) {
      const hId = ENTITY_TO_HURDLE[pos.entity];
      if (hId && ctx[hId] != null) {
        ctx[hId].capitalDeployed += pos.investmentApplications;
      }
    }
  } catch { /* keep zeros */ }

  return ctx;
}
