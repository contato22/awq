// ─── EPM Planning Data Access Layer ──────────────────────────────────────────
//
// Async read/write for all EPM planning/KPI data.
// When USE_SUPABASE=true: reads/writes from Supabase via JS client (.from() API).
// When USE_SUPABASE=false: falls back to static data from awq-group-data / epm-gl-constants.
//
// DO NOT import in client components.

import { supabase, USE_SUPABASE } from "./supabase";
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
  if (supabase && USE_SUPABASE) {
    const { data, error } = await supabase.from("epm_bu_data").select("*").order("id");
    if (error) throw error;
    if (data && data.length > 0) return data.map((r) => rowToBU(r as Record<string, unknown>));
  }
  return staticBuData;
}

export async function upsertBUData(data: BuData): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const row = {
    id:               data.id,
    name:             data.name,
    sub:              data.sub,
    color:            data.color,
    accent_color:     data.accentColor,
    status:           data.status,
    economic_type:    data.economicType,
    revenue:          data.revenue,
    gross_profit:     data.grossProfit,
    ebitda:           data.ebitda,
    net_income:       data.netIncome,
    cash_generated:   data.cashGenerated,
    cash_balance:     data.cashBalance,
    customers:        data.customers,
    ftes:             data.ftes,
    capital_allocated: data.capitalAllocated,
    roic:             data.roic,
    budget_revenue:   data.budgetRevenue,
    href_overview:    data.hrefOverview,
    href_financial:   data.hrefFinancial,
    href_customers:   data.hrefCustomers,
    href_unit_econ:   data.hrefUnitEcon,
    href_budget:      data.hrefBudget,
    updated_at:       now,
  };
  const { error } = await supabase.from("epm_bu_data").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function seedBUData(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const rows = staticBuData.map((bu) => ({
    id:               bu.id,
    name:             bu.name,
    sub:              bu.sub,
    color:            bu.color,
    accent_color:     bu.accentColor,
    status:           bu.status,
    economic_type:    bu.economicType,
    revenue:          bu.revenue,
    gross_profit:     bu.grossProfit,
    ebitda:           bu.ebitda,
    net_income:       bu.netIncome,
    cash_generated:   bu.cashGenerated,
    cash_balance:     bu.cashBalance,
    customers:        bu.customers,
    ftes:             bu.ftes,
    capital_allocated: bu.capitalAllocated,
    roic:             bu.roic,
    budget_revenue:   bu.budgetRevenue,
    href_overview:    bu.hrefOverview,
    href_financial:   bu.hrefFinancial,
    href_customers:   bu.hrefCustomers,
    href_unit_econ:   bu.hrefUnitEcon,
    href_budget:      bu.hrefBudget,
    updated_at:       now,
  }));
  const { error } = await supabase.from("epm_bu_data").upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

// ─── Venture Contracts ───────────────────────────────────────────────────────

export async function getVentureContracts(): Promise<(VentureContract & { id: string })[]> {
  if (supabase && USE_SUPABASE) {
    const { data, error } = await supabase.from("epm_venture_contracts").select("*").order("counterparty");
    if (error) throw error;
    if (data && data.length > 0) return data.map((r) => rowToContract(r as Record<string, unknown>));
  }
  return staticVentureContracts.map((c, i) => ({ ...c, id: `static-${i}` }));
}

export async function upsertVentureContract(data: VentureContract & { id?: string }): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    counterparty:         data.counterparty,
    monthly_fee:          data.monthlyFee,
    duration_months:      data.durationMonths,
    total_contract_value: data.totalContractValue,
    arr:                  data.arr,
    start_date:           data.startDate ?? null,
    status:               data.status,
    note:                 data.note,
    updated_at:           now,
  };
  if (data.id) {
    row.id = data.id;
    row.created_at = now;
    const { error } = await supabase.from("epm_venture_contracts").upsert(row, { onConflict: "id" });
    if (error) throw error;
  } else {
    row.created_at = now;
    const { error } = await supabase.from("epm_venture_contracts").insert(row);
    if (error) throw error;
  }
}

export async function seedVentureContracts(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  // Delete all and re-insert (contracts have no stable natural key)
  await supabase.from("epm_venture_contracts").delete().neq("id", "");
  const rows = staticVentureContracts.map((c) => ({
    counterparty:         c.counterparty,
    monthly_fee:          c.monthlyFee,
    duration_months:      c.durationMonths,
    total_contract_value: c.totalContractValue,
    arr:                  c.arr,
    start_date:           c.startDate ?? null,
    status:               c.status,
    note:                 c.note,
    created_at:           now,
    updated_at:           now,
  }));
  if (rows.length > 0) {
    const { error } = await supabase.from("epm_venture_contracts").insert(rows);
    if (error) throw error;
  }
}

// ─── Monthly Revenue ─────────────────────────────────────────────────────────

export async function getMonthlyRevenue(): Promise<MonthlyPoint[]> {
  if (supabase && USE_SUPABASE) {
    const { data, error } = await supabase.from("epm_monthly_revenue").select("*").order("month");
    if (error) throw error;
    if (data && data.length > 0) return data.map((r) => rowToMonthly(r as Record<string, unknown>));
  }
  return staticMonthlyRevenue;
}

export async function upsertMonthlyRevenue(data: MonthlyPoint): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const row = {
    month:       data.month,
    jacqes:      data.jacqes,
    caza:        data.caza,
    advisor:     data.advisor,
    is_forecast: data.is_forecast ?? false,
    updated_at:  now,
  };
  const { error } = await supabase.from("epm_monthly_revenue").upsert(row, { onConflict: "month" });
  if (error) throw error;
}

export async function seedMonthlyRevenue(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const rows = staticMonthlyRevenue.map((m) => ({
    month:       m.month,
    jacqes:      m.jacqes,
    caza:        m.caza,
    advisor:     m.advisor,
    is_forecast: m.is_forecast ?? false,
    updated_at:  now,
  }));
  const { error } = await supabase.from("epm_monthly_revenue").upsert(rows, { onConflict: "month" });
  if (error) throw error;
}

// ─── Category Budget ─────────────────────────────────────────────────────────

export async function getCategoryBudget(): Promise<(CategoryBudgetItem & { id: string })[]> {
  if (supabase && USE_SUPABASE) {
    const { data, error } = await supabase.from("epm_category_budget").select("*").order("category");
    if (error) throw error;
    if (data && data.length > 0) return data.map((r) => rowToCategory(r as Record<string, unknown>));
  }
  return staticCategoryBudget.map((c, i) => ({ ...c, id: `static-${i}` }));
}

export async function upsertCategoryBudgetItem(data: CategoryBudgetItem & { id?: string }): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    category:   data.category,
    budget:     data.budget,
    actual:     data.actual,
    bu:         data.bu,
    updated_at: now,
  };
  if (data.id) {
    row.id = data.id;
    const { error } = await supabase.from("epm_category_budget").upsert(row, { onConflict: "id" });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("epm_category_budget").insert(row);
    if (error) throw error;
  }
}

export async function seedCategoryBudget(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  // Delete all and re-insert (no stable natural key for category budget)
  await supabase.from("epm_category_budget").delete().neq("id", "");
  const rows = staticCategoryBudget.map((c) => ({
    category:   c.category,
    budget:     c.budget,
    actual:     c.actual,
    bu:         c.bu,
    updated_at: now,
  }));
  if (rows.length > 0) {
    const { error } = await supabase.from("epm_category_budget").insert(rows);
    if (error) throw error;
  }
}

// ─── Alloc Flags ─────────────────────────────────────────────────────────────

export async function getAllocFlags(): Promise<Record<string, string>> {
  if (supabase && USE_SUPABASE) {
    const { data, error } = await supabase.from("epm_alloc_flags").select("*");
    if (error) throw error;
    if (data && data.length > 0) {
      const result: Record<string, string> = {};
      for (const r of data) {
        result[String(r.bu_id)] = String(r.flag);
      }
      return result;
    }
  }
  return staticAllocFlags as Record<string, string>;
}

export async function upsertAllocFlag(buId: string, flag: string): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const { error } = await supabase.from("epm_alloc_flags").upsert(
    { bu_id: buId, flag, updated_at: now },
    { onConflict: "bu_id" },
  );
  if (error) throw error;
}

export async function seedAllocFlags(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const rows = Object.entries(staticAllocFlags).map(([buId, flag]) => ({
    bu_id:      buId,
    flag:       flag as string,
    updated_at: now,
  }));
  const { error } = await supabase.from("epm_alloc_flags").upsert(rows, { onConflict: "bu_id" });
  if (error) throw error;
}

// ─── Holding Treasury ────────────────────────────────────────────────────────

export async function getHoldingTreasury(): Promise<HoldingTreasurySnapshot> {
  if (supabase && USE_SUPABASE) {
    const { data, error } = await supabase
      .from("epm_holding_treasury")
      .select("*")
      .eq("id", "current")
      .single();
    if (!error && data) {
      const r = data as Record<string, unknown>;
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
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const row = {
    id:                       "current",
    as_of:                    data.asOf,
    source:                   data.source,
    total_invested_real:      data.totalInvestedReal,
    last_application_amount:  data.lastApplicationAmount,
    last_application_date:    data.lastApplicationDate,
    investment_type:          data.investmentType,
    investment_bank:          data.investmentBank,
    investment_account_cash:  data.investmentAccountCash,
    bank_fees:                data.bankFees,
    operational_cash:         data.operationalCash,
    card_limit_total:         data.cardLimitTotal,
    card_limit_committed:     data.cardLimitCommitted,
    card_reserve_deposited:   data.cardReserveDeposited,
    intercompany_total:       data.intercompanyTotal,
    partner_withdrawals:      data.partnerWithdrawals,
    confidence:               data.confidence,
    note:                     data.note,
    updated_at:               now,
  };
  const { error } = await supabase.from("epm_holding_treasury").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

export async function seedHoldingTreasury(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const d = staticHoldingTreasury;
  const row = {
    id:                       "current",
    as_of:                    d.asOf,
    source:                   d.source,
    total_invested_real:      d.totalInvestedReal,
    last_application_amount:  d.lastApplicationAmount,
    last_application_date:    d.lastApplicationDate,
    investment_type:          d.investmentType,
    investment_bank:          d.investmentBank,
    investment_account_cash:  d.investmentAccountCash,
    bank_fees:                d.bankFees,
    operational_cash:         d.operationalCash,
    card_limit_total:         d.cardLimitTotal,
    card_limit_committed:     d.cardLimitCommitted,
    card_reserve_deposited:   d.cardReserveDeposited,
    intercompany_total:       d.intercompanyTotal,
    partner_withdrawals:      d.partnerWithdrawals,
    confidence:               d.confidence,
    note:                     d.note,
    updated_at:               now,
  };
  const { error } = await supabase.from("epm_holding_treasury").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────

export async function getChartOfAccounts(): Promise<AccountRef[]> {
  if (supabase && USE_SUPABASE) {
    const { data, error } = await supabase.from("epm_chart_of_accounts").select("*").order("account_code");
    if (error) throw error;
    if (data && data.length > 0) return data.map((r) => rowToAccount(r as Record<string, unknown>));
  }
  return staticChartOfAccounts;
}

export async function upsertAccount(data: AccountRef): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const row = {
    account_code:   data.account_code,
    account_name:   data.account_name,
    account_type:   data.account_type,
    normal_balance: data.normal_balance,
    level:          data.level,
    updated_at:     now,
  };
  const { error } = await supabase.from("epm_chart_of_accounts").upsert(row, { onConflict: "account_code" });
  if (error) throw error;
}

export async function seedChartOfAccounts(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const rows = staticChartOfAccounts.map((a) => ({
    account_code:   a.account_code,
    account_name:   a.account_name,
    account_type:   a.account_type,
    normal_balance: a.normal_balance,
    level:          a.level,
    updated_at:     now,
  }));
  const { error } = await supabase.from("epm_chart_of_accounts").upsert(rows, { onConflict: "account_code" });
  if (error) throw error;
}

// ─── Fiscal Rates ────────────────────────────────────────────────────────────

export async function getFiscalRates(): Promise<Record<SupplierType, FiscalRates>> {
  if (supabase && USE_SUPABASE) {
    const { data, error } = await supabase.from("epm_fiscal_rates").select("*");
    if (error) throw error;
    if (data && data.length > 0) {
      const result = { ...FISCAL_DEFAULTS };
      for (const r of data) {
        result[String(r.supplier_type) as SupplierType] = rowToFiscalRates(r as Record<string, unknown>);
      }
      return result;
    }
  }
  return { ...FISCAL_DEFAULTS };
}

export async function upsertFiscalRate(supplierType: SupplierType, rates: FiscalRates): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const row = {
    supplier_type: supplierType,
    irrf_rate:     rates.irrf_rate,
    inss_rate:     rates.inss_rate,
    iss_rate:      rates.iss_rate,
    pis_rate:      rates.pis_rate,
    cofins_rate:   rates.cofins_rate,
    updated_at:    now,
  };
  const { error } = await supabase.from("epm_fiscal_rates").upsert(row, { onConflict: "supplier_type" });
  if (error) throw error;
}

export async function seedFiscalRates(): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const now = new Date().toISOString();
  const rows = Object.entries(FISCAL_DEFAULTS).map(([type, rates]) => ({
    supplier_type: type,
    irrf_rate:     rates.irrf_rate,
    inss_rate:     rates.inss_rate,
    iss_rate:      rates.iss_rate,
    pis_rate:      rates.pis_rate,
    cofins_rate:   rates.cofins_rate,
    updated_at:    now,
  }));
  const { error } = await supabase.from("epm_fiscal_rates").upsert(rows, { onConflict: "supplier_type" });
  if (error) throw error;
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
