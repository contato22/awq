// ─── EPM Hurdle Rate — Data Access Layer ─────────────────────────────────────
//
// Hurdle = Ke (build-up): Rf + matureERP + sizePremium + specificPremium + buRiskPremium
// Simples Nacional: T = 0 → afterTaxKd = Kd (sem escudo fiscal)
// IRR anualizado: (1 + ROI_total)^(12/durMonths) − 1
// ROIC nunca é usado como Ke — são grandezas separadas.
//
// DO NOT import in client components.

import { sql, USE_DB }                   from "./db";
import { getBUData }                     from "./epm-planning-db";
import { listProjects, contractValue }   from "./ppm-db";
import { getAPARKPIs }                   from "./ap-ar-db";
import type { BuCode as APARBuCode }     from "./ap-ar-db";
import { getCashPositionByEntity }       from "./financial-db";

// ─── Centralized constants (update here when rates change) ───────────────────

export const HURDLE_CONFIG = {
  rf:              14.5,  // Selic meta BCB jun/2026
  matureERP:       4.23,  // Damodaran Country Risk Premium Brasil jan/2026
  sizePremium:     3.5,   // Prêmio tamanho (small-cap AWQ)
  specificPremium: 4.0,   // Prêmio específico operacional
  rfSource:        "Selic/BCB jun/2026",
  erpSource:       "Damodaran jan/2026",
  rfDate:          "2026-06-01",
  erpDate:         "2026-01-15",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type HurdleStatus = "approved" | "rejected" | "watch" | "pending";

export interface BuHurdleConfig {
  bu_id:             string;
  bu:                string;
  hurdle:            number;    // Ke from build-up (the bar)
  // Build-up components
  rf:                number;
  matureERP:         number;
  sizePremium:       number;
  specificPremium:   number;
  buRiskPremium:     number;
  regime:            string;   // 'simples' | 'lucro_real'
  rfSource:          string;
  erpSource:         string;
  // Real BU financials (enriched at query time)
  revenue?:          number;
  ebitda?:           number;
  roicReal?:         number;   // actual ROIC — separate from hurdle!
  capitalAllocated?: number;
  eva?:              number;   // (roicReal - hurdle) * capitalAllocated
  projectCount:      number;
}

export interface HurdleProject {
  id:            string;
  name:          string;
  bu_id:         string;
  bu:            string;
  capex:         number;
  irr:           number | null;           // IRR total (from DB / static)
  irrAnnualized: number | null;           // (1 + irr/100)^(12/dur) − 1 × 100
  roic:          number | null;
  paybackMo:     number | null;
  durationMo:    number | null;           // project duration in months
  hurdle:        number;
  spread:        number | null;           // irrAnnualized − hurdle
  status:        HurdleStatus;
  npvApprox:     number | null;           // (irr - hurdle)/hurdle * capex
  description:   string;
  source:        "db" | "static";
}

export interface HurdleAnalysis {
  buHurdles:      BuHurdleConfig[];
  projects:       HurdleProject[];
  dataSource:     "db" | "static";
  projectsFromDb: boolean;  // false = tabela vazia ou inacessível (nunca dados fictícios)
  inputsMeta: {
    rfDaysAgo:  number;
    erpDaysAgo: number;
    stale:      boolean;
    rfSource:   string;
    erpSource:  string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Annualizes a total-period ROI to annual IRR. Returns pct (e.g. 22.4). */
export function annualizeRoi(roiPct: number, durationMonths: number): number {
  if (durationMonths <= 0) return roiPct;
  return (Math.pow(1 + roiPct / 100, 12 / durationMonths) - 1) * 100;
}

/** NPV approximation: (irr − hurdle)/hurdle × capex */
export function approxNPV(irrAnnualized: number, hurdle: number, capex: number): number {
  if (hurdle <= 0) return 0;
  return ((irrAnnualized - hurdle) / hurdle) * capex;
}

/** Status from spread (pp). */
export function statusFromSpread(spread: number | null): HurdleStatus {
  if (spread === null) return "pending";
  if (spread >= 0) return "approved";
  if (spread >= -2) return "watch";
  return "rejected";
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function buildInputsMeta(): HurdleAnalysis["inputsMeta"] {
  const rfDaysAgo  = daysSince(HURDLE_CONFIG.rfDate);
  const erpDaysAgo = daysSince(HURDLE_CONFIG.erpDate);
  return {
    rfDaysAgo,
    erpDaysAgo,
    stale:     rfDaysAgo > 90 || erpDaysAgo > 90,
    rfSource:  HURDLE_CONFIG.rfSource,
    erpSource: HURDLE_CONFIG.erpSource,
  };
}

// ─── Static defaults (fallback + seed) ───────────────────────────────────────

const STATIC_HURDLES: Omit<BuHurdleConfig, "projectCount">[] = [
  {
    bu_id: "jacqes",  bu: "JACQES",
    hurdle: 22.2, rf: 14.5, matureERP: 4.23, sizePremium: 3.5, specificPremium: 4.0, buRiskPremium: -4.0,
    regime: "simples", rfSource: HURDLE_CONFIG.rfSource, erpSource: HURDLE_CONFIG.erpSource,
  },
  {
    bu_id: "advisor", bu: "Advisor",
    hurdle: 24.2, rf: 14.5, matureERP: 4.23, sizePremium: 3.5, specificPremium: 4.0, buRiskPremium: -2.0,
    regime: "simples", rfSource: HURDLE_CONFIG.rfSource, erpSource: HURDLE_CONFIG.erpSource,
  },
  {
    bu_id: "caza",    bu: "Caza Vision",
    hurdle: 26.2, rf: 14.5, matureERP: 4.23, sizePremium: 3.5, specificPremium: 4.0, buRiskPremium: 0.0,
    regime: "simples", rfSource: HURDLE_CONFIG.rfSource, erpSource: HURDLE_CONFIG.erpSource,
  },
  {
    bu_id: "venture", bu: "AWQ Venture",
    hurdle: 35.2, rf: 14.5, matureERP: 4.23, sizePremium: 3.5, specificPremium: 4.0, buRiskPremium: 9.0,
    regime: "simples", rfSource: HURDLE_CONFIG.rfSource, erpSource: HURDLE_CONFIG.erpSource,
  },
];

// Sem STATIC_PROJECTS — projetos de capital só vêm do DB (epm_hurdle_projects).
// Use /api/setup/migrate para criar a tabela e cadastre projetos reais.

// ─── DB row mappers ───────────────────────────────────────────────────────────

function rowToHurdle(r: Record<string, unknown>): Omit<BuHurdleConfig, "projectCount"> {
  const cfg = HURDLE_CONFIG;
  return {
    bu_id:           String(r.bu_id),
    bu:              String(r.bu_name),
    hurdle:          Number(r.hurdle_pct),
    rf:              r.rf_pct              != null ? Number(r.rf_pct)              : cfg.rf,
    matureERP:       r.mature_erp_pct      != null ? Number(r.mature_erp_pct)      : cfg.matureERP,
    sizePremium:     r.size_premium_pct    != null ? Number(r.size_premium_pct)    : cfg.sizePremium,
    specificPremium: r.specific_premium_pct!= null ? Number(r.specific_premium_pct): cfg.specificPremium,
    buRiskPremium:   r.bu_risk_premium_pct != null ? Number(r.bu_risk_premium_pct) : 0,
    regime:          r.regime              != null ? String(r.regime)              : "simples",
    rfSource:        r.rf_source           != null ? String(r.rf_source)           : cfg.rfSource,
    erpSource:       r.erp_source          != null ? String(r.erp_source)          : cfg.erpSource,
  };
}

function rowToProject(
  r: Record<string, unknown>,
  hurdleMap: Map<string, number>,
): HurdleProject {
  const bu_id       = String(r.bu_id);
  const hurdle      = hurdleMap.get(bu_id) ?? 26.2;
  const irrTotal    = r.irr_pct != null ? Number(r.irr_pct) : null;
  const durMo       = r.duration_mo != null ? Number(r.duration_mo) : (r.payback_mo != null ? Number(r.payback_mo) : null);
  const irrAnn      = irrTotal !== null && durMo != null && durMo > 0
    ? annualizeRoi(irrTotal, durMo)
    : irrTotal;
  const spreadVal   = irrAnn !== null ? irrAnn - hurdle : null;
  const dbStatus    = String(r.status ?? "");
  const status      = (["approved","rejected","watch","pending"].includes(dbStatus) ? dbStatus : statusFromSpread(spreadVal)) as HurdleStatus;
  return {
    id:            String(r.id),
    name:          String(r.name),
    bu_id,
    bu:            String(r.bu_name),
    capex:         Number(r.capex),
    irr:           irrTotal,
    irrAnnualized: irrAnn,
    roic:          r.roic_pct   != null ? Number(r.roic_pct)   : null,
    paybackMo:     r.payback_mo != null ? Number(r.payback_mo) : null,
    durationMo:    durMo,
    hurdle,
    spread:        spreadVal,
    status,
    npvApprox:     irrAnn !== null ? approxNPV(irrAnn, hurdle, Number(r.capex)) : null,
    description:   String(r.description ?? ""),
    source:        "db",
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getHurdleAnalysis(): Promise<HurdleAnalysis> {
  const buData = await getBUData().catch(() => []);
  const buMap  = new Map(buData.map((b) => [b.id, b]));

  // ── Hurdle rates ────────────────────────────────────────────────────────────
  let hurdleRows: Omit<BuHurdleConfig, "projectCount">[] = [];
  let projectRows: HurdleProject[] = [];
  let dataSource: "db" | "static" = "static";

  if (sql && USE_DB) {
    try {
      const rows = await sql`SELECT * FROM epm_hurdle_rates ORDER BY bu_id`;
      if (rows.length > 0) {
        hurdleRows = rows.map((r) => rowToHurdle(r as Record<string, unknown>));
        dataSource = "db";
      }
    } catch { /* fall through */ }
  }

  if (hurdleRows.length === 0) {
    hurdleRows = STATIC_HURDLES.map((h) => ({ ...h }));
  }

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

  const projectsFromDb = projectRows.length > 0;
  // Nenhum fallback fictício — se a tabela estiver vazia, projects = []

  // ── Enrich BU hurdle configs with real financial data ──────────────────────
  const buHurdles: BuHurdleConfig[] = hurdleRows.map((h) => {
    const bu       = buMap.get(h.bu_id);
    const prj      = projectRows.filter((p) => p.bu_id === h.bu_id);
    const roicReal = bu?.roic !== undefined ? bu.roic * 100 : undefined;
    const eva      = roicReal !== undefined && bu?.capitalAllocated
      ? (roicReal - h.hurdle) * bu.capitalAllocated
      : undefined;
    return {
      ...h,
      revenue:          bu?.revenue,
      ebitda:           bu?.ebitda,
      roicReal,
      capitalAllocated: bu?.capitalAllocated,
      eva,
      projectCount:     prj.length,
    };
  });

  return { buHurdles, projects: projectRows, dataSource, projectsFromDb, inputsMeta: buildInputsMeta() };
}

// ─── Summary (synchronous — zero DB round-trips) ─────────────────────────────

export function computeHurdleSummary(analysis: HurdleAnalysis) {
  const { projects, buHurdles } = analysis;
  const approved      = projects.filter((p) => p.status === "approved");
  const rejected      = projects.filter((p) => p.status === "rejected");
  const watch         = projects.filter((p) => p.status === "watch");
  const totalCapex    = projects.reduce((s, p) => s + p.capex, 0);
  const approvedCapex = approved.reduce((s, p) => s + p.capex, 0);
  const evaluated     = projects.filter((p) => p.status !== "pending");
  const approvalRate  = evaluated.length > 0 ? (approved.length / evaluated.length) * 100 : 0;

  // Weighted spread across projects with known annualized IRR
  const withIrr = projects.filter((p) => p.irrAnnualized !== null && p.status !== "pending");
  const totalWtCapex = withIrr.reduce((s, p) => s + p.capex, 0);
  const weightedSpread = totalWtCapex > 0
    ? withIrr.reduce((s, p) => s + (p.spread ?? 0) * p.capex, 0) / totalWtCapex
    : null;

  const avgIrr = withIrr.length > 0
    ? withIrr.reduce((s, p) => s + (p.irrAnnualized as number), 0) / withIrr.length
    : null;
  const totalNPV = projects.reduce((s, p) => s + (p.npvApprox ?? 0), 0);
  const totalEVA = buHurdles.reduce((s, h) => s + (h.eva ?? 0), 0);
  const avgHurdle = buHurdles.length > 0
    ? buHurdles.reduce((s, h) => s + h.hurdle, 0) / buHurdles.length
    : 0;

  return {
    total: projects.length, approved: approved.length,
    rejected: rejected.length, watch: watch.length,
    totalCapex, approvedCapex, approvalRate, avgIrr,
    weightedSpread, totalNPV, totalEVA, avgHurdle,
  };
}

export async function getHurdleSummary() {
  return computeHurdleSummary(await getHurdleAnalysis());
}

// ─── Upsert helpers (future admin UI) ────────────────────────────────────────

export async function upsertHurdleRate(data: Omit<BuHurdleConfig, "projectCount" | "revenue" | "ebitda" | "roicReal" | "capitalAllocated" | "eva">): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_hurdle_rates
      (bu_id, bu_name, wacc_pct, risk_premium_pct, hurdle_pct,
       rf_pct, mature_erp_pct, size_premium_pct, specific_premium_pct,
       bu_risk_premium_pct, regime, rf_source, erp_source, updated_at)
    VALUES
      (${data.bu_id}, ${data.bu}, ${data.hurdle}, ${data.buRiskPremium}, ${data.hurdle},
       ${data.rf}, ${data.matureERP}, ${data.sizePremium}, ${data.specificPremium},
       ${data.buRiskPremium}, ${data.regime}, ${data.rfSource}, ${data.erpSource}, ${now})
    ON CONFLICT (bu_id) DO UPDATE SET
      bu_name              = EXCLUDED.bu_name,
      hurdle_pct           = EXCLUDED.hurdle_pct,
      rf_pct               = EXCLUDED.rf_pct,
      mature_erp_pct       = EXCLUDED.mature_erp_pct,
      size_premium_pct     = EXCLUDED.size_premium_pct,
      specific_premium_pct = EXCLUDED.specific_premium_pct,
      bu_risk_premium_pct  = EXCLUDED.bu_risk_premium_pct,
      regime               = EXCLUDED.regime,
      rf_source            = EXCLUDED.rf_source,
      erp_source           = EXCLUDED.erp_source,
      updated_at           = EXCLUDED.updated_at
  `;
}

export async function upsertHurdleProject(data: Omit<HurdleProject, "source" | "spread" | "npvApprox">): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_hurdle_projects
      (id, name, bu_id, bu_name, capex, irr_pct, roic_pct, payback_mo,
       duration_mo, status, description, updated_at)
    VALUES
      (${data.id}, ${data.name}, ${data.bu_id}, ${data.bu}, ${data.capex},
       ${data.irr ?? null}, ${data.roic ?? null}, ${data.paybackMo ?? null},
       ${data.durationMo ?? null}, ${data.status}, ${data.description}, ${now})
    ON CONFLICT (id) DO UPDATE SET
      name        = EXCLUDED.name,
      bu_id       = EXCLUDED.bu_id,
      bu_name     = EXCLUDED.bu_name,
      capex       = EXCLUDED.capex,
      irr_pct     = EXCLUDED.irr_pct,
      roic_pct    = EXCLUDED.roic_pct,
      payback_mo  = EXCLUDED.payback_mo,
      duration_mo = EXCLUDED.duration_mo,
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
      bu_id                TEXT PRIMARY KEY,
      bu_name              TEXT NOT NULL,
      wacc_pct             NUMERIC(5,2) NOT NULL DEFAULT 26.2,
      risk_premium_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
      hurdle_pct           NUMERIC(5,2) NOT NULL DEFAULT 26.2,
      rf_pct               NUMERIC(5,2),
      mature_erp_pct       NUMERIC(5,2),
      size_premium_pct     NUMERIC(5,2),
      specific_premium_pct NUMERIC(5,2),
      bu_risk_premium_pct  NUMERIC(5,2),
      regime               TEXT DEFAULT 'simples',
      rf_source            TEXT,
      erp_source           TEXT,
      inputs_updated_at    TIMESTAMPTZ DEFAULT now(),
      updated_at           TEXT
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
      duration_mo INTEGER,
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
  // epm_hurdle_projects não recebe dados fictícios — cadastre projetos reais via upsertHurdleProject()
  seeded.push("epm_hurdle_projects (vazio — cadastre projetos reais)");
  return { seeded };
}

// ─── PPM integration ─────────────────────────────────────────────────────────
// IRR_anualizado = (1 + ROI_total)^(12 / durationMonths) − 1

const PPM_BU_TO_HURDLE: Record<string, string> = {
  AWQ: "holding", JACQES: "jacqes", CAZA: "caza", VENTURE: "venture", ADVISOR: "advisor",
};

export interface PpmHurdleRow {
  id:              string;
  code:            string;
  name:            string;
  bu_id:           string;
  bu:              string;
  type:            string;
  phase:           string;
  health:          string;
  budgetCost:      number;
  actualCost:      number;
  contractRev:     number;
  actualRevenue:   number;
  completionPct:   number;
  durationMo:      number | null;
  expectedRoi:     number | null;   // ROI total (not annualized)
  irrAnnualized:   number | null;   // annualized IRR
  actualRoi:       number | null;
  hurdle:          number;
  spread:          number | null;
  status:          HurdleStatus;
}

export async function getPPMHurdleRows(buHurdles: BuHurdleConfig[]): Promise<PpmHurdleRow[]> {
  try {
    const hMap = new Map(buHurdles.map((h) => [h.bu_id, h.hurdle]));
    // Hurdle consolidado do grupo = média simples das BUs operacionais
    const grupoHurdle = buHurdles.length > 0
      ? buHurdles.reduce((s, h) => s + h.hurdle, 0) / buHurdles.length
      : 26.2;
    const projects = await listProjects();
    return projects
      .filter((p) => PPM_BU_TO_HURDLE[p.bu_code] != null)
      .map((p) => {
        const bu_id  = PPM_BU_TO_HURDLE[p.bu_code]!;
        // Projetos AWQ (Holding) usam o hurdle consolidado, não um hurdle de BU operacional
        const hurdle = hMap.get(bu_id) ?? grupoHurdle;
        const cv     = contractValue(p);

        // Duration from dates
        const durationMo = (() => {
          try {
            const start = new Date(p.start_date + "T00:00:00").getTime();
            const end   = new Date(p.planned_end_date + "T00:00:00").getTime();
            const mo    = (end - start) / (1000 * 60 * 60 * 24 * 30.44);
            return mo > 0 ? Math.round(mo * 10) / 10 : null;
          } catch { return null; }
        })();

        const expectedRoi = cv > 0 && p.budget_cost > 0
          ? ((cv - p.budget_cost) / p.budget_cost) * 100
          : null;
        const irrAnnualized = expectedRoi !== null && durationMo != null && durationMo > 0
          ? annualizeRoi(expectedRoi, durationMo)
          : expectedRoi;
        const actualRoi = p.actual_cost > 0 && p.budget_cost > 0
          ? ((p.actual_revenue - p.actual_cost) / p.budget_cost) * 100
          : null;

        const spreadVal  = irrAnnualized !== null ? irrAnnualized - hurdle : null;
        const status     = statusFromSpread(spreadVal);

        return {
          id: p.project_id, code: p.project_code, name: p.project_name,
          bu_id, bu: p.bu_name ?? p.bu_code,
          type: p.project_type, phase: p.phase, health: p.health_status,
          budgetCost: p.budget_cost, actualCost: p.actual_cost,
          contractRev: cv, actualRevenue: p.actual_revenue,
          completionPct: p.completion_pct ?? 0,
          durationMo, expectedRoi, irrAnnualized, actualRoi,
          hurdle, spread: spreadVal, status,
        };
      });
  } catch { return []; }
}

// ─── AR/AP & Capital context ──────────────────────────────────────────────────

const APAR_BU_TO_HURDLE: Record<string, string> = {
  AWQ: "holding", JACQES: "jacqes", CAZA: "caza", VENTURE: "venture", ADVISOR: "advisor",
};
const ENTITY_TO_HURDLE: Record<string, string> = {
  AWQ_Holding: "holding", JACQES: "jacqes", Caza_Vision: "caza",
};

export interface BuCashContext {
  arOutstanding:   number;
  arOverdue:       number;
  apOutstanding:   number;
  apOverdue:       number;
  dso:             number | null;
  dpo:             number | null;
  ccc:             number | null;
  capitalDeployed: number;
  fundingGap:      number | null;  // CAPEX_approved - capitalDeployed
}

export async function getBUCashContext(
  approvedCapexByBu?: Record<string, number>,
): Promise<Record<string, BuCashContext>> {
  const ctx: Record<string, BuCashContext> = {};
  for (const hId of Object.values(APAR_BU_TO_HURDLE)) {
    ctx[hId] = {
      arOutstanding: 0, arOverdue: 0, apOutstanding: 0, apOverdue: 0,
      dso: null, dpo: null, ccc: null, capitalDeployed: 0, fundingGap: null,
    };
  }

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

  try {
    const positions = await getCashPositionByEntity();
    for (const pos of positions) {
      const hId = ENTITY_TO_HURDLE[pos.entity];
      if (hId && ctx[hId] != null) {
        ctx[hId].capitalDeployed += pos.investmentApplications;
      }
    }
  } catch { /* keep zeros */ }

  if (approvedCapexByBu) {
    for (const [hId, capex] of Object.entries(approvedCapexByBu)) {
      if (ctx[hId]) {
        ctx[hId].fundingGap = capex - ctx[hId].capitalDeployed;
      }
    }
  }

  return ctx;
}
