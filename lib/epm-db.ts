// ─── EPM — Supabase Database Layer ────────────────────────────────────────────
//
// Covers: Cash Forecast, Driver Scenarios, IC Transactions, FX Rates,
//         FC Transactions, Fiscal Periods, Budget Versions, Approval Log.
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (epm_* tables)
//   DATABASE_URL unset → returns [] / no-op

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekForecast {
  id: string;
  week: string;
  start_date: string;
  inflow: number;
  outflow: number;
  type: "actual" | "forecast";
}

export interface DriverScenario {
  id: string;
  name: "Bear" | "Base" | "Bull";
  color: string;
  bg: string;
  drivers: { label: string; value: number; unit: string; impact_line: string }[];
  projected_revenue: number;
  projected_ebitda: number;
  projected_cash: number;
}

export interface ICTransaction {
  id: string;
  date: string;
  from_entity: string;
  to_entity: string;
  description: string;
  amount: number;
  type: "SERVICE" | "LOAN" | "MANAGEMENT_FEE" | "REIMBURSEMENT";
  ar_booked: boolean;
  ap_booked: boolean;
  status: "MATCHED" | "UNMATCHED_AR" | "UNMATCHED_AP" | "ELIMINATED";
}

export interface FXRate {
  id: string;
  currency: string;
  symbol: string;
  flag: string;
  rate_brl: number;
  rate_prev: number;
  source: string;
  as_of: string;
}

export interface FCTransaction {
  id: string;
  date: string;
  entity: string;
  description: string;
  currency: string;
  amount_fc: number;
  rate_at_booking: number;
  rate_current: number;
  type: "EXPENSE" | "REVENUE" | "ASSET";
  category: string;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
  note?: string;
}

export interface FiscalPeriod {
  id: string;
  period_code: string;
  period_type: "MONTH" | "QUARTER" | "YEAR";
  start_date: string;
  end_date: string;
  status: "OPEN" | "REVIEWING" | "CLOSED" | "LOCKED";
  closed_by?: string;
  closed_at?: string;
  checklist: ChecklistItem[];
}

export interface BudgetVersion {
  id: string;
  version_name: string;
  fiscal_year: number;
  scenario: "BEAR" | "BASE" | "BULL";
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "LOCKED" | "ARCHIVED";
  approved_by?: string;
  approved_at?: string;
  submitted_by?: string;
  submitted_at?: string;
  notes?: string;
  budget_revenue: number;
  budget_ebitda: number;
  budget_net_income: number;
  growth_vs_ly: number;
  ebitda_margin: number;
}

export interface ApprovalEvent {
  id: string;
  version_name: string;
  action: string;
  by: string;
  at: string;
  comment: string;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _ready = false;

export async function initEPMDB(): Promise<void> {
  if (_ready || !sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS epm_cash_forecast_weeks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        week TEXT NOT NULL,
        start_date DATE NOT NULL,
        inflow NUMERIC NOT NULL DEFAULT 0,
        outflow NUMERIC NOT NULL DEFAULT 0,
        type TEXT NOT NULL DEFAULT 'forecast',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_driver_scenarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        bg TEXT NOT NULL,
        drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
        projected_revenue NUMERIC NOT NULL DEFAULT 0,
        projected_ebitda NUMERIC NOT NULL DEFAULT 0,
        projected_cash NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_ic_transactions (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        from_entity TEXT NOT NULL,
        to_entity TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        type TEXT NOT NULL,
        ar_booked BOOLEAN NOT NULL DEFAULT false,
        ap_booked BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'ELIMINATED',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_fx_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        currency TEXT NOT NULL UNIQUE,
        symbol TEXT NOT NULL,
        flag TEXT NOT NULL,
        rate_brl NUMERIC NOT NULL DEFAULT 1,
        rate_prev NUMERIC NOT NULL DEFAULT 1,
        source TEXT NOT NULL DEFAULT 'BCB PTAX',
        as_of DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_fc_transactions (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        entity TEXT NOT NULL,
        description TEXT NOT NULL,
        currency TEXT NOT NULL,
        amount_fc NUMERIC NOT NULL DEFAULT 0,
        rate_at_booking NUMERIC NOT NULL DEFAULT 1,
        rate_current NUMERIC NOT NULL DEFAULT 1,
        type TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_fiscal_periods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        period_code TEXT NOT NULL UNIQUE,
        period_type TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        closed_by TEXT,
        closed_at TIMESTAMPTZ,
        checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_budget_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version_name TEXT NOT NULL UNIQUE,
        fiscal_year INTEGER NOT NULL,
        scenario TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'DRAFT',
        approved_by TEXT,
        approved_at TIMESTAMPTZ,
        submitted_by TEXT,
        submitted_at TIMESTAMPTZ,
        notes TEXT,
        budget_revenue NUMERIC NOT NULL DEFAULT 0,
        budget_ebitda NUMERIC NOT NULL DEFAULT 0,
        budget_net_income NUMERIC NOT NULL DEFAULT 0,
        growth_vs_ly NUMERIC NOT NULL DEFAULT 0,
        ebitda_margin NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_approval_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        version_name TEXT NOT NULL,
        action TEXT NOT NULL,
        by TEXT NOT NULL,
        at DATE NOT NULL,
        comment TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    _ready = true;
    // Also init extended tables
    await initAnnualReportTables();
    await initBoardPackTables();
  } catch { /* silent — no DB in dev */ }
}

// ─── Cash Forecast ────────────────────────────────────────────────────────────

export async function getCashForecastWeeks(): Promise<WeekForecast[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM epm_cash_forecast_weeks ORDER BY start_date`;
    return rows.map(r => ({
      id: r.id as string,
      week: r.week as string,
      start_date: r.start_date as string,
      inflow: Number(r.inflow),
      outflow: Number(r.outflow),
      type: r.type as "actual" | "forecast",
    }));
  } catch { return []; }
}

export async function upsertCashForecastWeek(w: Omit<WeekForecast, "id"> & { id?: string }): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO epm_cash_forecast_weeks (id, week, start_date, inflow, outflow, type)
      VALUES (${w.id ?? crypto.randomUUID()}, ${w.week}, ${w.start_date}, ${w.inflow}, ${w.outflow}, ${w.type})
      ON CONFLICT (id) DO UPDATE SET
        week = EXCLUDED.week, start_date = EXCLUDED.start_date,
        inflow = EXCLUDED.inflow, outflow = EXCLUDED.outflow, type = EXCLUDED.type
    `;
  } catch { /* no-op */ }
}

// ─── Driver Scenarios ─────────────────────────────────────────────────────────

export async function getDriverScenarios(): Promise<DriverScenario[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM epm_driver_scenarios ORDER BY created_at`;
    return rows.map(r => ({
      id: r.id as string,
      name: r.name as "Bear" | "Base" | "Bull",
      color: r.color as string,
      bg: r.bg as string,
      drivers: typeof r.drivers === "string" ? JSON.parse(r.drivers) : (r.drivers ?? []),
      projected_revenue: Number(r.projected_revenue),
      projected_ebitda: Number(r.projected_ebitda),
      projected_cash: Number(r.projected_cash),
    }));
  } catch { return []; }
}

export async function upsertDriverScenario(s: Omit<DriverScenario, "id"> & { id?: string }): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO epm_driver_scenarios (id, name, color, bg, drivers, projected_revenue, projected_ebitda, projected_cash)
      VALUES (${s.id ?? crypto.randomUUID()}, ${s.name}, ${s.color}, ${s.bg},
              ${JSON.stringify(s.drivers)}::jsonb,
              ${s.projected_revenue}, ${s.projected_ebitda}, ${s.projected_cash})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, color = EXCLUDED.color, bg = EXCLUDED.bg,
        drivers = EXCLUDED.drivers,
        projected_revenue = EXCLUDED.projected_revenue,
        projected_ebitda = EXCLUDED.projected_ebitda,
        projected_cash = EXCLUDED.projected_cash
    `;
  } catch { /* no-op */ }
}

// ─── IC Transactions ──────────────────────────────────────────────────────────

export async function getICTransactions(): Promise<ICTransaction[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM epm_ic_transactions ORDER BY date, id`;
    return rows.map(r => ({
      id: r.id as string,
      date: r.date as string,
      from_entity: r.from_entity as string,
      to_entity: r.to_entity as string,
      description: r.description as string,
      amount: Number(r.amount),
      type: r.type as ICTransaction["type"],
      ar_booked: Boolean(r.ar_booked),
      ap_booked: Boolean(r.ap_booked),
      status: r.status as ICTransaction["status"],
    }));
  } catch { return []; }
}

export async function upsertICTransaction(t: ICTransaction): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO epm_ic_transactions
        (id, date, from_entity, to_entity, description, amount, type, ar_booked, ap_booked, status)
      VALUES (${t.id}, ${t.date}, ${t.from_entity}, ${t.to_entity}, ${t.description},
              ${t.amount}, ${t.type}, ${t.ar_booked}, ${t.ap_booked}, ${t.status})
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date, from_entity = EXCLUDED.from_entity, to_entity = EXCLUDED.to_entity,
        description = EXCLUDED.description, amount = EXCLUDED.amount, type = EXCLUDED.type,
        ar_booked = EXCLUDED.ar_booked, ap_booked = EXCLUDED.ap_booked, status = EXCLUDED.status
    `;
  } catch { /* no-op */ }
}

export async function deleteICTransaction(id: string): Promise<void> {
  if (!sql) return;
  try {
    await sql`DELETE FROM epm_ic_transactions WHERE id = ${id}`;
  } catch { /* no-op */ }
}

// ─── FX Rates ────────────────────────────────────────────────────────────────

export async function getFXRates(): Promise<FXRate[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM epm_fx_rates ORDER BY currency`;
    return rows.map(r => ({
      id: r.id as string,
      currency: r.currency as string,
      symbol: r.symbol as string,
      flag: r.flag as string,
      rate_brl: Number(r.rate_brl),
      rate_prev: Number(r.rate_prev),
      source: r.source as string,
      as_of: r.as_of as string,
    }));
  } catch { return []; }
}

export async function upsertFXRate(fx: Omit<FXRate, "id"> & { id?: string }): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO epm_fx_rates (id, currency, symbol, flag, rate_brl, rate_prev, source, as_of)
      VALUES (${fx.id ?? crypto.randomUUID()}, ${fx.currency}, ${fx.symbol}, ${fx.flag},
              ${fx.rate_brl}, ${fx.rate_prev}, ${fx.source}, ${fx.as_of})
      ON CONFLICT (currency) DO UPDATE SET
        symbol = EXCLUDED.symbol, flag = EXCLUDED.flag,
        rate_brl = EXCLUDED.rate_brl, rate_prev = EXCLUDED.rate_prev,
        source = EXCLUDED.source, as_of = EXCLUDED.as_of
    `;
  } catch { /* no-op */ }
}

// ─── FC Transactions ──────────────────────────────────────────────────────────

export async function getFCTransactions(): Promise<FCTransaction[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM epm_fc_transactions ORDER BY date, id`;
    return rows.map(r => ({
      id: r.id as string,
      date: r.date as string,
      entity: r.entity as string,
      description: r.description as string,
      currency: r.currency as string,
      amount_fc: Number(r.amount_fc),
      rate_at_booking: Number(r.rate_at_booking),
      rate_current: Number(r.rate_current),
      type: r.type as FCTransaction["type"],
      category: r.category as string,
    }));
  } catch { return []; }
}

export async function upsertFCTransaction(t: FCTransaction): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO epm_fc_transactions
        (id, date, entity, description, currency, amount_fc, rate_at_booking, rate_current, type, category)
      VALUES (${t.id}, ${t.date}, ${t.entity}, ${t.description}, ${t.currency},
              ${t.amount_fc}, ${t.rate_at_booking}, ${t.rate_current}, ${t.type}, ${t.category})
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date, entity = EXCLUDED.entity, description = EXCLUDED.description,
        currency = EXCLUDED.currency, amount_fc = EXCLUDED.amount_fc,
        rate_at_booking = EXCLUDED.rate_at_booking, rate_current = EXCLUDED.rate_current,
        type = EXCLUDED.type, category = EXCLUDED.category
    `;
  } catch { /* no-op */ }
}

// ─── Fiscal Periods ───────────────────────────────────────────────────────────

export async function getFiscalPeriods(): Promise<FiscalPeriod[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM epm_fiscal_periods ORDER BY start_date, period_type`;
    return rows.map(r => ({
      id: r.id as string,
      period_code: r.period_code as string,
      period_type: r.period_type as FiscalPeriod["period_type"],
      start_date: r.start_date as string,
      end_date: r.end_date as string,
      status: r.status as FiscalPeriod["status"],
      closed_by: r.closed_by as string | undefined,
      closed_at: r.closed_at as string | undefined,
      checklist: typeof r.checklist === "string" ? JSON.parse(r.checklist) : (r.checklist ?? []),
    }));
  } catch { return []; }
}

export async function upsertFiscalPeriod(p: Omit<FiscalPeriod, "id"> & { id?: string }): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO epm_fiscal_periods
        (id, period_code, period_type, start_date, end_date, status, closed_by, closed_at, checklist)
      VALUES (${p.id ?? crypto.randomUUID()}, ${p.period_code}, ${p.period_type},
              ${p.start_date}, ${p.end_date}, ${p.status},
              ${p.closed_by ?? null}, ${p.closed_at ?? null},
              ${JSON.stringify(p.checklist)}::jsonb)
      ON CONFLICT (period_code) DO UPDATE SET
        period_type = EXCLUDED.period_type, start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date, status = EXCLUDED.status,
        closed_by = EXCLUDED.closed_by, closed_at = EXCLUDED.closed_at,
        checklist = EXCLUDED.checklist
    `;
  } catch { /* no-op */ }
}

// ─── Budget Versions ──────────────────────────────────────────────────────────

export async function getBudgetVersions(): Promise<BudgetVersion[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM epm_budget_versions ORDER BY fiscal_year, scenario`;
    return rows.map(r => ({
      id: r.id as string,
      version_name: r.version_name as string,
      fiscal_year: Number(r.fiscal_year),
      scenario: r.scenario as BudgetVersion["scenario"],
      status: r.status as BudgetVersion["status"],
      approved_by: r.approved_by as string | undefined,
      approved_at: r.approved_at as string | undefined,
      submitted_by: r.submitted_by as string | undefined,
      submitted_at: r.submitted_at as string | undefined,
      notes: r.notes as string | undefined,
      budget_revenue: Number(r.budget_revenue),
      budget_ebitda: Number(r.budget_ebitda),
      budget_net_income: Number(r.budget_net_income),
      growth_vs_ly: Number(r.growth_vs_ly),
      ebitda_margin: Number(r.ebitda_margin),
    }));
  } catch { return []; }
}

export async function upsertBudgetVersion(v: Omit<BudgetVersion, "id"> & { id?: string }): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO epm_budget_versions
        (id, version_name, fiscal_year, scenario, status, approved_by, approved_at,
         submitted_by, submitted_at, notes, budget_revenue, budget_ebitda,
         budget_net_income, growth_vs_ly, ebitda_margin)
      VALUES (${v.id ?? crypto.randomUUID()}, ${v.version_name}, ${v.fiscal_year},
              ${v.scenario}, ${v.status}, ${v.approved_by ?? null}, ${v.approved_at ?? null},
              ${v.submitted_by ?? null}, ${v.submitted_at ?? null}, ${v.notes ?? null},
              ${v.budget_revenue}, ${v.budget_ebitda}, ${v.budget_net_income},
              ${v.growth_vs_ly}, ${v.ebitda_margin})
      ON CONFLICT (version_name) DO UPDATE SET
        fiscal_year = EXCLUDED.fiscal_year, scenario = EXCLUDED.scenario,
        status = EXCLUDED.status, approved_by = EXCLUDED.approved_by,
        approved_at = EXCLUDED.approved_at, submitted_by = EXCLUDED.submitted_by,
        submitted_at = EXCLUDED.submitted_at, notes = EXCLUDED.notes,
        budget_revenue = EXCLUDED.budget_revenue, budget_ebitda = EXCLUDED.budget_ebitda,
        budget_net_income = EXCLUDED.budget_net_income, growth_vs_ly = EXCLUDED.growth_vs_ly,
        ebitda_margin = EXCLUDED.ebitda_margin
    `;
  } catch { /* no-op */ }
}

// ─── Approval Log ─────────────────────────────────────────────────────────────

export async function getApprovalLog(): Promise<ApprovalEvent[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM epm_approval_log ORDER BY at, created_at`;
    return rows.map(r => ({
      id: r.id as string,
      version_name: r.version_name as string,
      action: r.action as string,
      by: r.by as string,
      at: r.at as string,
      comment: r.comment as string,
    }));
  } catch { return []; }
}

export async function addApprovalEvent(e: Omit<ApprovalEvent, "id">): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO epm_approval_log (version_name, action, by, at, comment)
      VALUES (${e.version_name}, ${e.action}, ${e.by}, ${e.at}, ${e.comment})
    `;
  } catch { /* no-op */ }
}

// ─── Annual Report ────────────────────────────────────────────────────────────

export interface AnnualTrendRow {
  id: string;        // year label e.g. "FY2024"
  revenue: number;
  ebitda: number;
  cash_end: number;
  employees: number;
}

export interface AnnualPLLine {
  id: string;
  sort_order: number;
  line: string;
  amount: number;
  budget: number;
  type: string;
  year_label: string;
}

export interface AnnualCFRow {
  id: string;
  sort_order: number;
  label: string;
  section: string;
  amount: number;
  year_label: string;
}

export interface AnnualBalanceSheet {
  id: string;        // year label
  data_json: Record<string, unknown>;
}

let _annualReady = false;

export async function initAnnualReportTables(): Promise<void> {
  if (_annualReady || !sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS epm_annual_trend (
        id TEXT PRIMARY KEY,
        revenue NUMERIC NOT NULL DEFAULT 0,
        ebitda NUMERIC NOT NULL DEFAULT 0,
        cash_end NUMERIC NOT NULL DEFAULT 0,
        employees INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_annual_pl_lines (
        id TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL DEFAULT 0,
        line TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        budget NUMERIC NOT NULL DEFAULT 0,
        type TEXT NOT NULL DEFAULT '',
        year_label TEXT NOT NULL DEFAULT 'FY2025',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_annual_cf_rows (
        id TEXT PRIMARY KEY,
        sort_order INTEGER NOT NULL DEFAULT 0,
        label TEXT NOT NULL,
        section TEXT NOT NULL,
        amount NUMERIC NOT NULL DEFAULT 0,
        year_label TEXT NOT NULL DEFAULT 'FY2025',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_annual_balance_sheet (
        id TEXT PRIMARY KEY,
        data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    _annualReady = true;
  } catch { /* silent */ }
}

export async function getAnnualTrend(): Promise<AnnualTrendRow[]> {
  if (!sql) return [];
  try {
    await initAnnualReportTables();
    const rows = await sql`SELECT * FROM epm_annual_trend ORDER BY id`;
    return rows.map(r => ({ id: r.id as string, revenue: Number(r.revenue), ebitda: Number(r.ebitda), cash_end: Number(r.cash_end), employees: Number(r.employees) }));
  } catch { return []; }
}

export async function getAnnualPLLines(yearLabel: string): Promise<AnnualPLLine[]> {
  if (!sql) return [];
  try {
    await initAnnualReportTables();
    const rows = await sql`SELECT * FROM epm_annual_pl_lines WHERE year_label = ${yearLabel} ORDER BY sort_order`;
    return rows.map(r => ({ id: r.id as string, sort_order: Number(r.sort_order), line: r.line as string, amount: Number(r.amount), budget: Number(r.budget), type: r.type as string, year_label: r.year_label as string }));
  } catch { return []; }
}

export async function getAnnualCFRows(yearLabel: string): Promise<AnnualCFRow[]> {
  if (!sql) return [];
  try {
    await initAnnualReportTables();
    const rows = await sql`SELECT * FROM epm_annual_cf_rows WHERE year_label = ${yearLabel} ORDER BY sort_order`;
    return rows.map(r => ({ id: r.id as string, sort_order: Number(r.sort_order), label: r.label as string, section: r.section as string, amount: Number(r.amount), year_label: r.year_label as string }));
  } catch { return []; }
}

export async function getAnnualBalanceSheet(id: string): Promise<AnnualBalanceSheet | null> {
  if (!sql) return null;
  try {
    await initAnnualReportTables();
    const rows = await sql`SELECT * FROM epm_annual_balance_sheet WHERE id = ${id}`;
    if (!rows.length) return null;
    const r = rows[0];
    return { id: r.id as string, data_json: typeof r.data_json === "string" ? JSON.parse(r.data_json) : (r.data_json as Record<string, unknown>) };
  } catch { return null; }
}

// ─── Initiatives & Risks (Board Pack) ────────────────────────────────────────

export interface Initiative {
  id: string;
  label: string;
  status: "on_track" | "at_risk" | "completed" | "not_started";
  owner: string;
  deadline: string;
  update_text: string;
  sort_order: number;
}

export interface Risk {
  id: string;
  description: string;
  probability: "HIGH" | "MEDIUM" | "LOW";
  impact: "HIGH" | "MEDIUM" | "LOW";
  mitigation: string;
  sort_order: number;
}

let _boardReady = false;

export async function initBoardPackTables(): Promise<void> {
  if (_boardReady || !sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS epm_initiatives (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_started',
        owner TEXT NOT NULL DEFAULT '',
        deadline TEXT NOT NULL DEFAULT '',
        update_text TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS epm_risks (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        probability TEXT NOT NULL DEFAULT 'MEDIUM',
        impact TEXT NOT NULL DEFAULT 'MEDIUM',
        mitigation TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    _boardReady = true;
  } catch { /* silent */ }
}

export async function getInitiatives(): Promise<Initiative[]> {
  if (!sql) return [];
  try {
    await initBoardPackTables();
    const rows = await sql`SELECT * FROM epm_initiatives ORDER BY sort_order, created_at`;
    return rows.map(r => ({ id: r.id as string, label: r.label as string, status: r.status as Initiative["status"], owner: r.owner as string, deadline: r.deadline as string, update_text: r.update_text as string, sort_order: Number(r.sort_order) }));
  } catch { return []; }
}

export async function upsertInitiative(item: Initiative): Promise<void> {
  if (!sql) return;
  try {
    await initBoardPackTables();
    await sql`
      INSERT INTO epm_initiatives (id, label, status, owner, deadline, update_text, sort_order)
      VALUES (${item.id}, ${item.label}, ${item.status}, ${item.owner}, ${item.deadline}, ${item.update_text}, ${item.sort_order})
      ON CONFLICT (id) DO UPDATE SET
        label = EXCLUDED.label, status = EXCLUDED.status, owner = EXCLUDED.owner,
        deadline = EXCLUDED.deadline, update_text = EXCLUDED.update_text, sort_order = EXCLUDED.sort_order
    `;
  } catch { /* no-op */ }
}

export async function deleteInitiative(id: string): Promise<void> {
  if (!sql) return;
  try { await sql`DELETE FROM epm_initiatives WHERE id = ${id}`; } catch { /* no-op */ }
}

export async function getRisks(): Promise<Risk[]> {
  if (!sql) return [];
  try {
    await initBoardPackTables();
    const rows = await sql`SELECT * FROM epm_risks ORDER BY sort_order, created_at`;
    return rows.map(r => ({ id: r.id as string, description: r.description as string, probability: r.probability as Risk["probability"], impact: r.impact as Risk["impact"], mitigation: r.mitigation as string, sort_order: Number(r.sort_order) }));
  } catch { return []; }
}

export async function upsertRisk(item: Risk): Promise<void> {
  if (!sql) return;
  try {
    await initBoardPackTables();
    await sql`
      INSERT INTO epm_risks (id, description, probability, impact, mitigation, sort_order)
      VALUES (${item.id}, ${item.description}, ${item.probability}, ${item.impact}, ${item.mitigation}, ${item.sort_order})
      ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description, probability = EXCLUDED.probability,
        impact = EXCLUDED.impact, mitigation = EXCLUDED.mitigation, sort_order = EXCLUDED.sort_order
    `;
  } catch { /* no-op */ }
}

export async function deleteRisk(id: string): Promise<void> {
  if (!sql) return;
  try { await sql`DELETE FROM epm_risks WHERE id = ${id}`; } catch { /* no-op */ }
}
