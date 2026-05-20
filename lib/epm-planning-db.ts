// ─── EPM Planning Data Access Layer ──────────────────────────────────────────
//
// Async read/write for all EPM planning/KPI data.
// When USE_DB=true: reads/writes from Supabase Postgres.
// When USE_DB=false: falls back to static data from awq-group-data / epm-gl-constants.
//
// DO NOT import in client components.

import { sql, USE_DB } from "./db";
import {
  buData as staticBuData,
  ventureContracts as staticVentureContracts,
  monthlyRevenue as staticMonthlyRevenue,
  categoryBudget as staticCategoryBudget,
  allocFlags as staticAllocFlags,
  holdingTreasurySnapshot as staticHoldingTreasury,
  holdingCash,
  riskSignals as staticRiskSignals,
  riskCategories as staticRiskCategories,
  buBudgetTargets as staticBuBudgetTargets,
  type BuData,
  type VentureContract,
  type MonthlyPoint,
  type CategoryBudgetItem,
  type HoldingTreasurySnapshot,
  type RiskSignal,
  type RiskCategory,
  type BuBudgetTargets,
  type AllocFlag,
} from "./awq-group-data";
import { CHART_OF_ACCOUNTS as staticChartOfAccounts, type AccountRef } from "./epm-gl-constants";

export type { BuData, VentureContract, MonthlyPoint, CategoryBudgetItem, HoldingTreasurySnapshot, AccountRef, RiskSignal, RiskCategory, AllocFlag };

// ─── Fiscal Rates (inlined from ap-ar-db to avoid circular deps) ─────────────

export type SupplierType =
  | "service_professional"
  | "service_cleaning"
  | "service_construction"
  | "goods"
  | "rent"
  | "other";

export interface FiscalRates {
  irrf_rate:   number;
  inss_rate:   number;
  iss_rate:    number;
  pis_rate:    number;
  cofins_rate: number;
}

const FISCAL_DEFAULTS: Record<SupplierType, FiscalRates> = {
  service_professional: { irrf_rate: 0.015, inss_rate: 0,    iss_rate: 0.05, pis_rate: 0.0065, cofins_rate: 0.03 },
  service_cleaning:     { irrf_rate: 0.01,  inss_rate: 0.11, iss_rate: 0.05, pis_rate: 0.0065, cofins_rate: 0.03 },
  service_construction: { irrf_rate: 0.015, inss_rate: 0.11, iss_rate: 0.05, pis_rate: 0.0065, cofins_rate: 0.03 },
  goods:                { irrf_rate: 0,     inss_rate: 0,    iss_rate: 0,    pis_rate: 0,      cofins_rate: 0    },
  rent:                 { irrf_rate: 0.015, inss_rate: 0,    iss_rate: 0,    pis_rate: 0,      cofins_rate: 0    },
  other:                { irrf_rate: 0,     inss_rate: 0,    iss_rate: 0,    pis_rate: 0,      cofins_rate: 0    },
};

// ─── Row mappers ─────────────────────────────────────────────────────────────

function rowToBU(r: Record<string, unknown>): BuData {
  return {
    id:               String(r.id),
    name:             String(r.name),
    sub:              String(r.sub),
    color:            String(r.color),
    accentColor:      String(r.accent_color),
    status:           String(r.status) as BuData["status"],
    economicType:     String(r.economic_type) as BuData["economicType"],
    revenue:          Number(r.revenue),
    grossProfit:      Number(r.gross_profit),
    ebitda:           Number(r.ebitda),
    netIncome:        Number(r.net_income),
    cashGenerated:    Number(r.cash_generated),
    cashBalance:      Number(r.cash_balance),
    customers:        Number(r.customers),
    ftes:             Number(r.ftes),
    capitalAllocated: Number(r.capital_allocated),
    roic:             Number(r.roic),
    budgetRevenue:    Number(r.budget_revenue),
    hrefOverview:     String(r.href_overview),
    hrefFinancial:    String(r.href_financial),
    hrefCustomers:    String(r.href_customers),
    hrefUnitEcon:     String(r.href_unit_econ),
    hrefBudget:       String(r.href_budget),
  };
}

function rowToContract(r: Record<string, unknown>): VentureContract & { id: string } {
  return {
    id:                 String(r.id),
    counterparty:       String(r.counterparty),
    monthlyFee:         Number(r.monthly_fee),
    durationMonths:     Number(r.duration_months),
    totalContractValue: Number(r.total_contract_value),
    arr:                Number(r.arr),
    startDate:          r.start_date ? String(r.start_date) : null,
    status:             String(r.status) as VentureContract["status"],
    note:               String(r.note),
  };
}

function rowToMonthly(r: Record<string, unknown>): MonthlyPoint {
  const jacqes  = Number(r.jacqes);
  const caza    = Number(r.caza);
  const advisor = Number(r.advisor);
  return {
    month:       String(r.month),
    jacqes,
    caza,
    advisor,
    total:       jacqes + caza + advisor,
    is_forecast: Boolean(r.is_forecast),
  };
}

function rowToCategory(r: Record<string, unknown>): CategoryBudgetItem & { id: string } {
  return {
    id:       String(r.id),
    category: String(r.category),
    budget:   Number(r.budget),
    actual:   Number(r.actual),
    bu:       String(r.bu),
  };
}

function rowToAccount(r: Record<string, unknown>): AccountRef {
  return {
    account_code:   String(r.account_code),
    account_name:   String(r.account_name),
    account_type:   String(r.account_type) as AccountRef["account_type"],
    normal_balance: String(r.normal_balance) as AccountRef["normal_balance"],
    level:          Number(r.level),
  };
}

function rowToFiscalRates(r: Record<string, unknown>): FiscalRates {
  return {
    irrf_rate:   Number(r.irrf_rate),
    inss_rate:   Number(r.inss_rate),
    iss_rate:    Number(r.iss_rate),
    pis_rate:    Number(r.pis_rate),
    cofins_rate: Number(r.cofins_rate),
  };
}

// ─── BU Data ─────────────────────────────────────────────────────────────────

export async function getBUData(): Promise<BuData[]> {
  if (sql && USE_DB) {
    const rows = await sql`SELECT * FROM epm_bu_data ORDER BY id`;
    if (rows.length > 0) return rows.map((r) => rowToBU(r as Record<string, unknown>));
  }
  return staticBuData;
}

export async function upsertBUData(data: BuData): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_bu_data (
      id, name, sub, color, accent_color, status, economic_type,
      revenue, gross_profit, ebitda, net_income, cash_generated, cash_balance,
      customers, ftes, capital_allocated, roic, budget_revenue,
      href_overview, href_financial, href_customers, href_unit_econ, href_budget, updated_at
    ) VALUES (
      ${data.id}, ${data.name}, ${data.sub}, ${data.color}, ${data.accentColor},
      ${data.status}, ${data.economicType}, ${data.revenue}, ${data.grossProfit},
      ${data.ebitda}, ${data.netIncome}, ${data.cashGenerated}, ${data.cashBalance},
      ${data.customers}, ${data.ftes}, ${data.capitalAllocated}, ${data.roic},
      ${data.budgetRevenue}, ${data.hrefOverview}, ${data.hrefFinancial},
      ${data.hrefCustomers}, ${data.hrefUnitEcon}, ${data.hrefBudget}, ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, sub = EXCLUDED.sub, color = EXCLUDED.color,
      accent_color = EXCLUDED.accent_color, status = EXCLUDED.status,
      economic_type = EXCLUDED.economic_type, revenue = EXCLUDED.revenue,
      gross_profit = EXCLUDED.gross_profit, ebitda = EXCLUDED.ebitda,
      net_income = EXCLUDED.net_income, cash_generated = EXCLUDED.cash_generated,
      cash_balance = EXCLUDED.cash_balance, customers = EXCLUDED.customers,
      ftes = EXCLUDED.ftes, capital_allocated = EXCLUDED.capital_allocated,
      roic = EXCLUDED.roic, budget_revenue = EXCLUDED.budget_revenue,
      href_overview = EXCLUDED.href_overview, href_financial = EXCLUDED.href_financial,
      href_customers = EXCLUDED.href_customers, href_unit_econ = EXCLUDED.href_unit_econ,
      href_budget = EXCLUDED.href_budget, updated_at = EXCLUDED.updated_at
  `;
}

export async function seedBUData(): Promise<void> {
  for (const bu of staticBuData) {
    if (!sql) throw new Error("Database not configured");
    const now = new Date().toISOString();
    await sql`
      INSERT INTO epm_bu_data (
        id, name, sub, color, accent_color, status, economic_type,
        revenue, gross_profit, ebitda, net_income, cash_generated, cash_balance,
        customers, ftes, capital_allocated, roic, budget_revenue,
        href_overview, href_financial, href_customers, href_unit_econ, href_budget, updated_at
      ) VALUES (
        ${bu.id}, ${bu.name}, ${bu.sub}, ${bu.color}, ${bu.accentColor},
        ${bu.status}, ${bu.economicType}, ${bu.revenue}, ${bu.grossProfit},
        ${bu.ebitda}, ${bu.netIncome}, ${bu.cashGenerated}, ${bu.cashBalance},
        ${bu.customers}, ${bu.ftes}, ${bu.capitalAllocated}, ${bu.roic},
        ${bu.budgetRevenue}, ${bu.hrefOverview}, ${bu.hrefFinancial},
        ${bu.hrefCustomers}, ${bu.hrefUnitEcon}, ${bu.hrefBudget}, ${now}
      )
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

// ─── Venture Contracts ───────────────────────────────────────────────────────

export async function getVentureContracts(): Promise<(VentureContract & { id: string })[]> {
  if (sql && USE_DB) {
    const rows = await sql`SELECT * FROM epm_venture_contracts ORDER BY counterparty`;
    if (rows.length > 0) return rows.map((r) => rowToContract(r as Record<string, unknown>));
  }
  return staticVentureContracts.map((c, i) => ({ ...c, id: `static-${i}` }));
}

export async function upsertVentureContract(data: VentureContract & { id?: string }): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  if (data.id) {
    await sql`
      INSERT INTO epm_venture_contracts (
        id, counterparty, monthly_fee, duration_months, total_contract_value,
        arr, start_date, status, note, created_at, updated_at
      ) VALUES (
        ${data.id}, ${data.counterparty}, ${data.monthlyFee}, ${data.durationMonths},
        ${data.totalContractValue}, ${data.arr}, ${data.startDate ?? null},
        ${data.status}, ${data.note}, ${now}, ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        counterparty = EXCLUDED.counterparty, monthly_fee = EXCLUDED.monthly_fee,
        duration_months = EXCLUDED.duration_months,
        total_contract_value = EXCLUDED.total_contract_value, arr = EXCLUDED.arr,
        start_date = EXCLUDED.start_date, status = EXCLUDED.status,
        note = EXCLUDED.note, updated_at = EXCLUDED.updated_at
    `;
  } else {
    await sql`
      INSERT INTO epm_venture_contracts (
        counterparty, monthly_fee, duration_months, total_contract_value,
        arr, start_date, status, note, created_at, updated_at
      ) VALUES (
        ${data.counterparty}, ${data.monthlyFee}, ${data.durationMonths},
        ${data.totalContractValue}, ${data.arr}, ${data.startDate ?? null},
        ${data.status}, ${data.note}, ${now}, ${now}
      )
    `;
  }
}

export async function seedVentureContracts(): Promise<void> {
  for (const c of staticVentureContracts) {
    if (!sql) throw new Error("Database not configured");
    const now = new Date().toISOString();
    await sql`
      INSERT INTO epm_venture_contracts (
        counterparty, monthly_fee, duration_months, total_contract_value,
        arr, start_date, status, note, created_at, updated_at
      ) VALUES (
        ${c.counterparty}, ${c.monthlyFee}, ${c.durationMonths}, ${c.totalContractValue},
        ${c.arr}, ${c.startDate ?? null}, ${c.status}, ${c.note}, ${now}, ${now}
      )
      ON CONFLICT DO NOTHING
    `;
  }
}

// ─── Monthly Revenue ─────────────────────────────────────────────────────────

export async function getMonthlyRevenue(): Promise<MonthlyPoint[]> {
  if (sql && USE_DB) {
    const rows = await sql`SELECT * FROM epm_monthly_revenue ORDER BY month`;
    if (rows.length > 0) return rows.map((r) => rowToMonthly(r as Record<string, unknown>));
  }
  return staticMonthlyRevenue;
}

export async function upsertMonthlyRevenue(data: MonthlyPoint): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_monthly_revenue (month, jacqes, caza, advisor, is_forecast, updated_at)
    VALUES (${data.month}, ${data.jacqes}, ${data.caza}, ${data.advisor}, ${data.is_forecast ?? false}, ${now})
    ON CONFLICT (month) DO UPDATE SET
      jacqes = EXCLUDED.jacqes, caza = EXCLUDED.caza, advisor = EXCLUDED.advisor,
      is_forecast = EXCLUDED.is_forecast, updated_at = EXCLUDED.updated_at
  `;
}

export async function seedMonthlyRevenue(): Promise<void> {
  for (const m of staticMonthlyRevenue) {
    if (!sql) throw new Error("Database not configured");
    const now = new Date().toISOString();
    await sql`
      INSERT INTO epm_monthly_revenue (month, jacqes, caza, advisor, is_forecast, updated_at)
      VALUES (${m.month}, ${m.jacqes}, ${m.caza}, ${m.advisor}, ${m.is_forecast ?? false}, ${now})
      ON CONFLICT (month) DO NOTHING
    `;
  }
}

// ─── Category Budget ─────────────────────────────────────────────────────────

export async function getCategoryBudget(): Promise<(CategoryBudgetItem & { id: string })[]> {
  if (sql && USE_DB) {
    const rows = await sql`SELECT * FROM epm_category_budget ORDER BY category`;
    if (rows.length > 0) return rows.map((r) => rowToCategory(r as Record<string, unknown>));
  }
  return staticCategoryBudget.map((c, i) => ({ ...c, id: `static-${i}` }));
}

export async function upsertCategoryBudgetItem(data: CategoryBudgetItem & { id?: string }): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  if (data.id) {
    await sql`
      INSERT INTO epm_category_budget (id, category, budget, actual, bu, updated_at)
      VALUES (${data.id}, ${data.category}, ${data.budget}, ${data.actual}, ${data.bu}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        category = EXCLUDED.category, budget = EXCLUDED.budget,
        actual = EXCLUDED.actual, bu = EXCLUDED.bu, updated_at = EXCLUDED.updated_at
    `;
  } else {
    await sql`
      INSERT INTO epm_category_budget (category, budget, actual, bu, updated_at)
      VALUES (${data.category}, ${data.budget}, ${data.actual}, ${data.bu}, ${now})
    `;
  }
}

export async function seedCategoryBudget(): Promise<void> {
  for (const c of staticCategoryBudget) {
    if (!sql) throw new Error("Database not configured");
    const now = new Date().toISOString();
    await sql`
      INSERT INTO epm_category_budget (category, budget, actual, bu, updated_at)
      VALUES (${c.category}, ${c.budget}, ${c.actual}, ${c.bu}, ${now})
      ON CONFLICT DO NOTHING
    `;
  }
}

// ─── Alloc Flags ─────────────────────────────────────────────────────────────

export async function getAllocFlags(): Promise<Record<string, string>> {
  if (sql && USE_DB) {
    const rows = await sql`SELECT * FROM epm_alloc_flags`;
    if (rows.length > 0) {
      const result: Record<string, string> = {};
      for (const r of rows) {
        result[String(r.bu_id)] = String(r.flag);
      }
      return result;
    }
  }
  return staticAllocFlags as Record<string, string>;
}

export async function upsertAllocFlag(buId: string, flag: string): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_alloc_flags (bu_id, flag, updated_at)
    VALUES (${buId}, ${flag}, ${now})
    ON CONFLICT (bu_id) DO UPDATE SET flag = EXCLUDED.flag, updated_at = EXCLUDED.updated_at
  `;
}

export async function seedAllocFlags(): Promise<void> {
  for (const [buId, flag] of Object.entries(staticAllocFlags)) {
    if (!sql) throw new Error("Database not configured");
    const now = new Date().toISOString();
    await sql`
      INSERT INTO epm_alloc_flags (bu_id, flag, updated_at)
      VALUES (${buId}, ${flag}, ${now})
      ON CONFLICT (bu_id) DO NOTHING
    `;
  }
}

// ─── Holding Treasury ────────────────────────────────────────────────────────

export async function getHoldingTreasury(): Promise<HoldingTreasurySnapshot> {
  if (sql && USE_DB) {
    const rows = await sql`SELECT * FROM epm_holding_treasury WHERE id = 'current'`;
    if (rows.length > 0) {
      const r = rows[0] as Record<string, unknown>;
      return {
        asOf:                  String(r.as_of),
        source:                String(r.source),
        totalInvestedReal:     Number(r.total_invested_real),
        lastApplicationAmount: Number(r.last_application_amount),
        lastApplicationDate:   String(r.last_application_date),
        investmentType:        String(r.investment_type),
        investmentBank:        String(r.investment_bank),
        investmentAccountCash: Number(r.investment_account_cash),
        bankFees:              Number(r.bank_fees),
        operationalCash:       Number(r.operational_cash),
        cardLimitTotal:        Number(r.card_limit_total),
        cardLimitCommitted:    Number(r.card_limit_committed),
        cardReserveDeposited:  Number(r.card_reserve_deposited),
        intercompanyTotal:     Number(r.intercompany_total),
        partnerWithdrawals:    Number(r.partner_withdrawals),
        confidence:            String(r.confidence) as HoldingTreasurySnapshot["confidence"],
        reconciledWith:        [],
        NOT_investment:        [],
        note:                  String(r.note),
      };
    }
  }
  return staticHoldingTreasury;
}

export async function upsertHoldingTreasury(data: HoldingTreasurySnapshot): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_holding_treasury (
      id, as_of, source, total_invested_real, last_application_amount, last_application_date,
      investment_type, investment_bank, investment_account_cash, bank_fees,
      operational_cash, card_limit_total, card_limit_committed, card_reserve_deposited,
      intercompany_total, partner_withdrawals, confidence, note, updated_at
    ) VALUES (
      'current', ${data.asOf}, ${data.source}, ${data.totalInvestedReal},
      ${data.lastApplicationAmount}, ${data.lastApplicationDate}, ${data.investmentType},
      ${data.investmentBank}, ${data.investmentAccountCash}, ${data.bankFees},
      ${data.operationalCash}, ${data.cardLimitTotal}, ${data.cardLimitCommitted},
      ${data.cardReserveDeposited}, ${data.intercompanyTotal}, ${data.partnerWithdrawals},
      ${data.confidence}, ${data.note}, ${now}
    )
    ON CONFLICT (id) DO UPDATE SET
      as_of = EXCLUDED.as_of, source = EXCLUDED.source,
      total_invested_real = EXCLUDED.total_invested_real,
      last_application_amount = EXCLUDED.last_application_amount,
      last_application_date = EXCLUDED.last_application_date,
      investment_type = EXCLUDED.investment_type, investment_bank = EXCLUDED.investment_bank,
      investment_account_cash = EXCLUDED.investment_account_cash,
      bank_fees = EXCLUDED.bank_fees, operational_cash = EXCLUDED.operational_cash,
      card_limit_total = EXCLUDED.card_limit_total,
      card_limit_committed = EXCLUDED.card_limit_committed,
      card_reserve_deposited = EXCLUDED.card_reserve_deposited,
      intercompany_total = EXCLUDED.intercompany_total,
      partner_withdrawals = EXCLUDED.partner_withdrawals,
      confidence = EXCLUDED.confidence, note = EXCLUDED.note, updated_at = EXCLUDED.updated_at
  `;
}

export async function seedHoldingTreasury(): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  const d = staticHoldingTreasury;
  await sql`
    INSERT INTO epm_holding_treasury (
      id, as_of, source, total_invested_real, last_application_amount, last_application_date,
      investment_type, investment_bank, investment_account_cash, bank_fees,
      operational_cash, card_limit_total, card_limit_committed, card_reserve_deposited,
      intercompany_total, partner_withdrawals, confidence, note, updated_at
    ) VALUES (
      'current', ${d.asOf}, ${d.source}, ${d.totalInvestedReal},
      ${d.lastApplicationAmount}, ${d.lastApplicationDate}, ${d.investmentType},
      ${d.investmentBank}, ${d.investmentAccountCash}, ${d.bankFees},
      ${d.operationalCash}, ${d.cardLimitTotal}, ${d.cardLimitCommitted},
      ${d.cardReserveDeposited}, ${d.intercompanyTotal}, ${d.partnerWithdrawals},
      ${d.confidence}, ${d.note}, ${now}
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

export async function getChartOfAccounts(): Promise<AccountRef[]> {
  if (sql && USE_DB) {
    const rows = await sql`SELECT * FROM epm_chart_of_accounts ORDER BY account_code`;
    if (rows.length > 0) return rows.map((r) => rowToAccount(r as Record<string, unknown>));
  }
  return staticChartOfAccounts;
}

export async function upsertAccount(data: AccountRef): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_chart_of_accounts (account_code, account_name, account_type, normal_balance, level, updated_at)
    VALUES (${data.account_code}, ${data.account_name}, ${data.account_type}, ${data.normal_balance}, ${data.level}, ${now})
    ON CONFLICT (account_code) DO UPDATE SET
      account_name = EXCLUDED.account_name, account_type = EXCLUDED.account_type,
      normal_balance = EXCLUDED.normal_balance, level = EXCLUDED.level,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function seedChartOfAccounts(): Promise<void> {
  for (const a of staticChartOfAccounts) {
    if (!sql) throw new Error("Database not configured");
    const now = new Date().toISOString();
    await sql`
      INSERT INTO epm_chart_of_accounts (account_code, account_name, account_type, normal_balance, level, updated_at)
      VALUES (${a.account_code}, ${a.account_name}, ${a.account_type}, ${a.normal_balance}, ${a.level}, ${now})
      ON CONFLICT (account_code) DO NOTHING
    `;
  }
}

// ─── Fiscal Rates ────────────────────────────────────────────────────────────

export async function getFiscalRates(): Promise<Record<SupplierType, FiscalRates>> {
  if (sql && USE_DB) {
    const rows = await sql`SELECT * FROM epm_fiscal_rates`;
    if (rows.length > 0) {
      const result = { ...FISCAL_DEFAULTS };
      for (const r of rows) {
        result[String(r.supplier_type) as SupplierType] = rowToFiscalRates(r as Record<string, unknown>);
      }
      return result;
    }
  }
  return { ...FISCAL_DEFAULTS };
}

export async function upsertFiscalRate(supplierType: SupplierType, rates: FiscalRates): Promise<void> {
  if (!sql) throw new Error("Database not configured");
  const now = new Date().toISOString();
  await sql`
    INSERT INTO epm_fiscal_rates (supplier_type, irrf_rate, inss_rate, iss_rate, pis_rate, cofins_rate, updated_at)
    VALUES (${supplierType}, ${rates.irrf_rate}, ${rates.inss_rate}, ${rates.iss_rate}, ${rates.pis_rate}, ${rates.cofins_rate}, ${now})
    ON CONFLICT (supplier_type) DO UPDATE SET
      irrf_rate = EXCLUDED.irrf_rate, inss_rate = EXCLUDED.inss_rate,
      iss_rate = EXCLUDED.iss_rate, pis_rate = EXCLUDED.pis_rate,
      cofins_rate = EXCLUDED.cofins_rate, updated_at = EXCLUDED.updated_at
  `;
}

export async function seedFiscalRates(): Promise<void> {
  for (const [type, rates] of Object.entries(FISCAL_DEFAULTS)) {
    if (!sql) throw new Error("Database not configured");
    const now = new Date().toISOString();
    await sql`
      INSERT INTO epm_fiscal_rates (supplier_type, irrf_rate, inss_rate, iss_rate, pis_rate, cofins_rate, updated_at)
      VALUES (${type}, ${rates.irrf_rate}, ${rates.inss_rate}, ${rates.iss_rate}, ${rates.pis_rate}, ${rates.cofins_rate}, ${now})
      ON CONFLICT (supplier_type) DO NOTHING
    `;
  }
}

// ─── Seed all ────────────────────────────────────────────────────────────────

export async function seedAllEPMPlanningData(): Promise<{ seeded: string[] }> {
  const seeded: string[] = [];
  await seedBUData();           seeded.push("epm_bu_data");
  await seedVentureContracts(); seeded.push("epm_venture_contracts");
  await seedMonthlyRevenue();   seeded.push("epm_monthly_revenue");
  await seedCategoryBudget();   seeded.push("epm_category_budget");
  await seedAllocFlags();       seeded.push("epm_alloc_flags");
  await seedHoldingTreasury();  seeded.push("epm_holding_treasury");
  await seedChartOfAccounts();  seeded.push("epm_chart_of_accounts");
  await seedFiscalRates();      seeded.push("epm_fiscal_rates");
  return { seeded };
}

// ─── Derived helpers ─────────────────────────────────────────────────────────

export async function getOperatingBUs(): Promise<BuData[]> {
  const all = await getBUData();
  return all.filter((b) => b.id !== "venture");
}

export async function getConsolidated() {
  const all = await getBUData();
  const operating = all.filter((b) => b.id !== "venture");
  return {
    revenue:          operating.reduce((s, b) => s + b.revenue,          0),
    grossProfit:      operating.reduce((s, b) => s + b.grossProfit,      0),
    ebitda:           operating.reduce((s, b) => s + b.ebitda,           0),
    netIncome:        operating.reduce((s, b) => s + b.netIncome,        0),
    cashGenerated:    operating.reduce((s, b) => s + b.cashGenerated,    0),
    cashBalance:      all.reduce      ((s, b) => s + b.cashBalance,      0) + holdingCash,
    customers:        operating.reduce((s, b) => s + b.customers,        0),
    ftes:             operating.reduce((s, b) => s + b.ftes,             0),
    capitalAllocated: all.reduce      ((s, b) => s + b.capitalAllocated, 0),
    budgetRevenue:    operating.reduce((s, b) => s + b.budgetRevenue,    0),
  };
}

export async function getConsolidatedMargins() {
  const c = await getConsolidated();
  return {
    grossMargin:  c.revenue > 0 ? c.grossProfit / c.revenue : 0,
    ebitdaMargin: c.revenue > 0 ? c.ebitda      / c.revenue : 0,
    netMargin:    c.revenue > 0 ? c.netIncome   / c.revenue : 0,
  };
}

export async function getBudgetVsActual(): Promise<number> {
  const c = await getConsolidated();
  return c.budgetRevenue > 0
    ? ((c.revenue - c.budgetRevenue) / c.budgetRevenue) * 100
    : 0;
}

export async function getBudgetLines() {
  const buds = await getBUData();
  function findBU(id: string) {
    const b = buds.find((x) => x.id === id);
    if (!b) return { revenue: 0, grossProfit: 0, ebitda: 0, netIncome: 0, cashGenerated: 0, budgetRevenue: 0 };
    return b;
  }
  const ZERO_BUDGET: BuBudgetTargets = { budgGrossProfit: 0, budgEbitda: 0, budgNetIncome: 0, budgCash: 0 };
  function budgetFor(id: string): BuBudgetTargets {
    return staticBuBudgetTargets[id] ?? ZERO_BUDGET;
  }
  return [
    {
      line: "Receita",
      jacquesBudg:   findBU("jacqes").budgetRevenue,
      jacquesActual: findBU("jacqes").revenue,
      cazaBudg:      findBU("caza").budgetRevenue,
      cazaActual:    findBU("caza").revenue,
      advisorBudg:   findBU("advisor").budgetRevenue,
      advisorActual: findBU("advisor").revenue,
      isExpense:     false,
    },
    {
      line: "Gross Profit",
      jacquesBudg:   budgetFor("jacqes").budgGrossProfit,
      jacquesActual: findBU("jacqes").grossProfit,
      cazaBudg:      budgetFor("caza").budgGrossProfit,
      cazaActual:    findBU("caza").grossProfit,
      advisorBudg:   budgetFor("advisor").budgGrossProfit,
      advisorActual: findBU("advisor").grossProfit,
      isExpense:     false,
    },
    {
      line: "EBITDA",
      jacquesBudg:   budgetFor("jacqes").budgEbitda,
      jacquesActual: findBU("jacqes").ebitda,
      cazaBudg:      budgetFor("caza").budgEbitda,
      cazaActual:    findBU("caza").ebitda,
      advisorBudg:   budgetFor("advisor").budgEbitda,
      advisorActual: findBU("advisor").ebitda,
      isExpense:     false,
    },
    {
      line: "Lucro Líquido",
      jacquesBudg:   budgetFor("jacqes").budgNetIncome,
      jacquesActual: findBU("jacqes").netIncome,
      cazaBudg:      budgetFor("caza").budgNetIncome,
      cazaActual:    findBU("caza").netIncome,
      advisorBudg:   budgetFor("advisor").budgNetIncome,
      advisorActual: findBU("advisor").netIncome,
      isExpense:     false,
    },
    {
      line: "Cash Gerado",
      jacquesBudg:   budgetFor("jacqes").budgCash,
      jacquesActual: findBU("jacqes").cashGenerated,
      cazaBudg:      budgetFor("caza").budgCash,
      cazaActual:    findBU("caza").cashGenerated,
      advisorBudg:   budgetFor("advisor").budgCash,
      advisorActual: findBU("advisor").cashGenerated,
      isExpense:     false,
    },
  ];
}

export async function getRiskSignals(): Promise<RiskSignal[]> {
  const buds = await getBUData();
  const operational = buds.filter((b) => b.economicType === "operational" && b.revenue > 0);
  const total = operational.reduce((s, b) => s + b.revenue, 0);
  const highest = operational.length > 0
    ? operational.reduce((max, b) => b.revenue > max.revenue ? b : max)
    : null;
  const highestPct = highest && total > 0
    ? Math.round((highest.revenue / total) * 100)
    : 0;

  return staticRiskSignals.map((r) => {
    if (r.id === "R2") {
      return {
        ...r,
        description: highest
          ? `${highest.name} representa ${highestPct}% da receita operacional do grupo.`
          : "Nenhuma BU com receita operacional confirmada.",
        severity: highestPct > 50 ? "high" : highestPct > 30 ? "medium" : "low",
        metric: highest ? `${highest.name} share: ${highestPct}%` : "—",
      };
    }
    return r;
  });
}

export async function getRiskCategories(): Promise<RiskCategory[]> {
  const buds = await getBUData();
  const operational = buds.filter((b) => b.economicType === "operational" && b.revenue > 0);
  const total = operational.reduce((s, b) => s + b.revenue, 0);
  const highest = operational.length > 0
    ? operational.reduce((max, b) => b.revenue > max.revenue ? b : max)
    : null;
  const highestPct = highest && total > 0
    ? Math.round((highest.revenue / total) * 100)
    : 0;

  return staticRiskCategories.map((cat) => {
    if (cat.id === "buDependency") {
      const details = operational.map((b) => ({
        label: b.name,
        share: Math.round((b.revenue / total) * 100),
        mrr:   b.revenue,
        risk:  (b.revenue / total) > 0.50 ? "Atenção" : "OK",
      }));
      return {
        ...cat,
        colorKey: (highestPct > 50 ? "red" : "amber") as RiskCategory["colorKey"],
        severity: (highestPct > 50 ? "high" : "medium") as RiskCategory["severity"],
        details,
        current: highest ? `${highest.name} = ${highestPct}% da receita` : "—",
      };
    }
    return cat;
  });
}

export async function getJACQESMRR(): Promise<{ current: number; q1: number }> {
  const monthly = await getMonthlyRevenue();
  const q1 = monthly
    .filter((m) => ["Jan/26", "Fev/26", "Mar/26"].includes(m.month))
    .reduce((max, m) => Math.max(max, m.jacqes), 0);
  const latest = monthly.length > 0 ? monthly[monthly.length - 1].jacqes : 0;
  return { current: latest, q1 };
}

export async function getVentureFeeMRR(): Promise<number> {
  const contracts = await getVentureContracts();
  return contracts.filter((c) => c.status === "active").reduce((s, c) => s + c.monthlyFee, 0);
}

export async function getVentureFeeARR(): Promise<number> {
  const mrr = await getVentureFeeMRR();
  return mrr * 12;
}

export async function getVentureContractValueRemaining(): Promise<number> {
  const contracts = await getVentureContracts();
  return contracts.filter((c) => c.status === "active").reduce((s, c) => s + c.totalContractValue, 0);
}
