import { sql } from "@/lib/db";

export type CpmKpi = {
  id: string; name: string; category: string; unit: string;
  target: number | null; actual: number | null; periodo: string; owner: string;
};
export type CpmKpiValue = {
  id: string; kpi_id: string; periodo: string; value: number; created_at: string;
};
export type CpmOkr = {
  id: string; objective: string; key_result: string; owner: string;
  quarter: string; progress: number; status: string;
};
export type CpmScorecard = {
  id: string; name: string; perspective: string; kpi_id: string | null;
  target: number | null; actual: number | null; status: string; periodo: string; owner: string;
};

export async function listKpis(): Promise<CpmKpi[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,category,unit,target,actual,periodo,owner FROM cpm_kpis ORDER BY created_at DESC`;
  return rows as unknown as CpmKpi[];
}
export async function createKpi(d: Omit<CpmKpi,"id">): Promise<CpmKpi> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO cpm_kpis ${sql(d)} RETURNING id,name,category,unit,target,actual,periodo,owner`;
  return r as unknown as CpmKpi;
}
export async function updateKpi(id: string, d: Partial<Omit<CpmKpi,"id">>): Promise<CpmKpi|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE cpm_kpis SET ${sql(d)} WHERE id=${id} RETURNING id,name,category,unit,target,actual,periodo,owner`;
  return rows[0] as unknown as CpmKpi ?? null;
}
export async function deleteKpi(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM cpm_kpis WHERE id=${id}`;
}

export async function listKpiValues(kpi_id: string): Promise<CpmKpiValue[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,kpi_id,periodo,value,created_at::text AS created_at FROM cpm_kpi_values WHERE kpi_id=${kpi_id} ORDER BY periodo DESC`;
  return rows as unknown as CpmKpiValue[];
}
export async function createKpiValue(d: Omit<CpmKpiValue,"id"|"created_at">): Promise<CpmKpiValue> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO cpm_kpi_values ${sql(d)} RETURNING id,kpi_id,periodo,value,created_at::text AS created_at`;
  return r as unknown as CpmKpiValue;
}

export async function listOkrs(): Promise<CpmOkr[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,objective,key_result,owner,quarter,progress,status FROM cpm_okrs ORDER BY quarter DESC,created_at DESC`;
  return rows as unknown as CpmOkr[];
}
export async function createOkr(d: Omit<CpmOkr,"id">): Promise<CpmOkr> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO cpm_okrs ${sql(d)} RETURNING id,objective,key_result,owner,quarter,progress,status`;
  return r as unknown as CpmOkr;
}
export async function updateOkr(id: string, d: Partial<Omit<CpmOkr,"id">>): Promise<CpmOkr|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE cpm_okrs SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,objective,key_result,owner,quarter,progress,status`;
  return rows[0] as unknown as CpmOkr ?? null;
}
export async function deleteOkr(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM cpm_okrs WHERE id=${id}`;
}

export async function listScorecards(): Promise<CpmScorecard[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,perspective,kpi_id,target,actual,status,periodo,owner FROM cpm_scorecards ORDER BY periodo DESC,created_at DESC`;
  return rows as unknown as CpmScorecard[];
}
export async function createScorecard(d: Omit<CpmScorecard,"id">): Promise<CpmScorecard> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO cpm_scorecards ${sql(d)} RETURNING id,name,perspective,kpi_id,target,actual,status,periodo,owner`;
  return r as unknown as CpmScorecard;
}
export async function updateScorecard(id: string, d: Partial<Omit<CpmScorecard,"id">>): Promise<CpmScorecard|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE cpm_scorecards SET ${sql(d)} WHERE id=${id} RETURNING id,name,perspective,kpi_id,target,actual,status,periodo,owner`;
  return rows[0] as unknown as CpmScorecard ?? null;
}
export async function deleteScorecard(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM cpm_scorecards WHERE id=${id}`;
}
