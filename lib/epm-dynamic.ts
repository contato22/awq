import { sql } from "@/lib/db";

export type EpmFixedAsset = {
  id: string; asset_code: string; asset_name: string; asset_category: string;
  bu: string; acquisition_date: string | null; cost: number;
  useful_life_months: number; residual_value: number;
  accumulated_depreciation: number; is_active: boolean; notes: string;
};
export async function listFixedAssets(): Promise<EpmFixedAsset[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,asset_code,asset_name,asset_category,bu,acquisition_date::text AS acquisition_date,cost,useful_life_months,residual_value,accumulated_depreciation,is_active,notes FROM epm_fixed_assets ORDER BY asset_category,asset_name`;
  return rows as unknown as EpmFixedAsset[];
}
export async function createFixedAsset(d: Omit<EpmFixedAsset,"id">): Promise<EpmFixedAsset> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO epm_fixed_assets ${sql({ ...d, acquisition_date: d.acquisition_date || null })} RETURNING id,asset_code,asset_name,asset_category,bu,acquisition_date::text AS acquisition_date,cost,useful_life_months,residual_value,accumulated_depreciation,is_active,notes`;
  return r as unknown as EpmFixedAsset;
}
export async function deleteFixedAsset(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM epm_fixed_assets WHERE id=${id}`;
}

export type EpmFiscalPeriod = {
  id: string; period_code: string; period_type: string; fiscal_year: number;
  start_date: string | null; end_date: string | null; status: string;
  closed_by: string; closed_at: string | null; checklist: {label: string; done: boolean; note?: string}[];
};
export async function listFiscalPeriods(): Promise<EpmFiscalPeriod[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,period_code,period_type,fiscal_year,start_date::text AS start_date,end_date::text AS end_date,status,closed_by,closed_at::text AS closed_at,checklist FROM epm_fiscal_periods ORDER BY start_date ASC NULLS LAST`;
  return rows as unknown as EpmFiscalPeriod[];
}
export async function createFiscalPeriod(d: Omit<EpmFiscalPeriod,"id">): Promise<EpmFiscalPeriod> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO epm_fiscal_periods (period_code,period_type,fiscal_year,start_date,end_date,status,closed_by,closed_at,checklist) VALUES (${d.period_code},${d.period_type},${d.fiscal_year},${d.start_date||null},${d.end_date||null},${d.status},${d.closed_by},${d.closed_at||null},${sql.json(d.checklist as never)}) RETURNING id,period_code,period_type,fiscal_year,start_date::text AS start_date,end_date::text AS end_date,status,closed_by,closed_at::text AS closed_at,checklist`;
  return r as unknown as EpmFiscalPeriod;
}
export async function updateFiscalPeriod(id: string, status: string, closed_by: string, checklist: EpmFiscalPeriod["checklist"]): Promise<EpmFiscalPeriod|null> {
  if (!sql) return null;
  const closed_at = ["CLOSED","LOCKED"].includes(status) ? new Date().toISOString() : null;
  const rows = await sql`UPDATE epm_fiscal_periods SET status=${status},closed_by=${closed_by},closed_at=${closed_at},checklist=${sql.json(checklist as never)},updated_at=NOW() WHERE id=${id} RETURNING id,period_code,period_type,fiscal_year,start_date::text AS start_date,end_date::text AS end_date,status,closed_by,closed_at::text AS closed_at,checklist`;
  return rows[0] as unknown as EpmFiscalPeriod ?? null;
}
export async function deleteFiscalPeriod(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM epm_fiscal_periods WHERE id=${id}`;
}

export type EpmFxRate = {
  id: string; currency: string; symbol: string; flag: string;
  rate_brl: number; rate_prev: number; source: string; as_of: string | null;
};
export async function listFxRates(): Promise<EpmFxRate[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,currency,symbol,flag,rate_brl,rate_prev,source,as_of::text AS as_of FROM epm_fx_rates ORDER BY currency`;
  return rows as unknown as EpmFxRate[];
}
export async function upsertFxRate(d: Omit<EpmFxRate,"id">): Promise<EpmFxRate> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO epm_fx_rates (currency,symbol,flag,rate_brl,rate_prev,source,as_of) VALUES (${d.currency},${d.symbol},${d.flag},${d.rate_brl},${d.rate_prev},${d.source},${d.as_of||null}) ON CONFLICT DO NOTHING RETURNING id,currency,symbol,flag,rate_brl,rate_prev,source,as_of::text AS as_of`;
  return r as unknown as EpmFxRate;
}
export async function deleteFxRate(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM epm_fx_rates WHERE id=${id}`;
}

export type EpmFcTransaction = {
  id: string; date: string | null; entity: string; description: string;
  currency: string; amount_fc: number; rate_at_booking: number;
  rate_current: number; type: string; category: string;
};
export async function listFcTransactions(): Promise<EpmFcTransaction[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,date::text AS date,entity,description,currency,amount_fc,rate_at_booking,rate_current,type,category FROM epm_fc_transactions ORDER BY date DESC NULLS LAST`;
  return rows as unknown as EpmFcTransaction[];
}
export async function createFcTransaction(d: Omit<EpmFcTransaction,"id">): Promise<EpmFcTransaction> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO epm_fc_transactions ${sql({ ...d, date: d.date || null })} RETURNING id,date::text AS date,entity,description,currency,amount_fc,rate_at_booking,rate_current,type,category`;
  return r as unknown as EpmFcTransaction;
}
export async function deleteFcTransaction(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM epm_fc_transactions WHERE id=${id}`;
}

export type EpmBudgetScenario = {
  id: string; version_name: string; fiscal_year: number; scenario: string;
  status: string; approved_by: string; approved_at: string | null;
  submitted_by: string; submitted_at: string | null; notes: string;
  budget_revenue: number; budget_ebitda: number; budget_net: number;
  growth_vs_ly: number; ebitda_margin: number;
};
export async function listBudgetScenarios(): Promise<EpmBudgetScenario[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,version_name,fiscal_year,scenario,status,approved_by,approved_at::text AS approved_at,submitted_by,submitted_at::text AS submitted_at,notes,budget_revenue,budget_ebitda,budget_net,growth_vs_ly,ebitda_margin FROM epm_budget_scenarios ORDER BY fiscal_year DESC,scenario`;
  return rows as unknown as EpmBudgetScenario[];
}
export async function createBudgetScenario(d: Omit<EpmBudgetScenario,"id">): Promise<EpmBudgetScenario> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO epm_budget_scenarios ${sql({ ...d, approved_at: d.approved_at||null, submitted_at: d.submitted_at||null })} RETURNING id,version_name,fiscal_year,scenario,status,approved_by,approved_at::text AS approved_at,submitted_by,submitted_at::text AS submitted_at,notes,budget_revenue,budget_ebitda,budget_net,growth_vs_ly,ebitda_margin`;
  return r as unknown as EpmBudgetScenario;
}
export async function updateBudgetScenarioStatus(id: string, status: string, by: string): Promise<EpmBudgetScenario|null> {
  if (!sql) return null;
  const now = new Date().toISOString();
  const rows = await sql`UPDATE epm_budget_scenarios SET status=${status},approved_by=${status==="APPROVED"?by:""},approved_at=${status==="APPROVED"?now:null},submitted_by=${status==="SUBMITTED"?by:sql`submitted_by`},submitted_at=${status==="SUBMITTED"?now:sql`submitted_at`},updated_at=NOW() WHERE id=${id} RETURNING id,version_name,fiscal_year,scenario,status,approved_by,approved_at::text AS approved_at,submitted_by,submitted_at::text AS submitted_at,notes,budget_revenue,budget_ebitda,budget_net,growth_vs_ly,ebitda_margin`;
  return rows[0] as unknown as EpmBudgetScenario ?? null;
}
export async function deleteBudgetScenario(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM epm_budget_scenarios WHERE id=${id}`;
}

export type EpmCashForecast = {
  id: string; week_label: string; start_date: string | null;
  inflow: number; outflow: number; type: string; notes: string;
};
export async function listCashForecast(): Promise<EpmCashForecast[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,week_label,start_date::text AS start_date,inflow,outflow,type,notes FROM epm_cash_forecast ORDER BY start_date ASC NULLS LAST`;
  return rows as unknown as EpmCashForecast[];
}
export async function createCashForecast(d: Omit<EpmCashForecast,"id">): Promise<EpmCashForecast> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO epm_cash_forecast ${sql({ ...d, start_date: d.start_date||null })} RETURNING id,week_label,start_date::text AS start_date,inflow,outflow,type,notes`;
  return r as unknown as EpmCashForecast;
}
export async function deleteCashForecast(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM epm_cash_forecast WHERE id=${id}`;
}

export type EpmIcTransaction = {
  id: string; date: string | null; from_entity: string; to_entity: string;
  description: string; amount: number; ic_type: string; status: string;
};
export async function listIcTransactions(): Promise<EpmIcTransaction[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,date::text AS date,from_entity,to_entity,description,amount,ic_type,status FROM epm_ic_transactions ORDER BY date DESC NULLS LAST`;
  return rows as unknown as EpmIcTransaction[];
}
export async function createIcTransaction(d: Omit<EpmIcTransaction,"id">): Promise<EpmIcTransaction> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO epm_ic_transactions ${sql({ ...d, date: d.date||null })} RETURNING id,date::text AS date,from_entity,to_entity,description,amount,ic_type,status`;
  return r as unknown as EpmIcTransaction;
}
export async function deleteIcTransaction(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM epm_ic_transactions WHERE id=${id}`;
}
