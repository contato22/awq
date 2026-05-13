import { sql } from "@/lib/db";

export type BiDashboard = {
  id: string; name: string; description: string;
  config: Record<string, unknown>; owner: string;
  created_at: string; updated_at: string;
};
export type BiReport = {
  id: string; dashboard_id: string | null; name: string;
  description: string; query_def: Record<string, unknown>;
  owner: string; created_at: string;
};

export async function listDashboards(): Promise<BiDashboard[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,description,config,owner,created_at::text AS created_at,updated_at::text AS updated_at FROM bi_dashboards ORDER BY updated_at DESC`;
  return rows as unknown as BiDashboard[];
}
export async function createDashboard(d: Omit<BiDashboard,"id"|"created_at"|"updated_at">): Promise<BiDashboard> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO bi_dashboards (name,description,config,owner) VALUES (${d.name},${d.description},${sql.json(d.config as never)},${d.owner}) RETURNING id,name,description,config,owner,created_at::text AS created_at,updated_at::text AS updated_at`;
  return r as unknown as BiDashboard;
}
export async function updateDashboard(id: string, d: Partial<Omit<BiDashboard,"id"|"created_at"|"updated_at">>): Promise<BiDashboard|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE bi_dashboards SET name=COALESCE(${d.name??null},name), description=COALESCE(${d.description??null},description), config=COALESCE(${d.config ? sql.json(d.config as never) : null},config), owner=COALESCE(${d.owner??null},owner), updated_at=NOW() WHERE id=${id} RETURNING id,name,description,config,owner,created_at::text AS created_at,updated_at::text AS updated_at`;
  return rows[0] as unknown as BiDashboard ?? null;
}
export async function deleteDashboard(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM bi_dashboards WHERE id=${id}`;
}

export async function listReports(dashboard_id?: string): Promise<BiReport[]> {
  if (!sql) return [];
  const rows = dashboard_id
    ? await sql`SELECT id,dashboard_id,name,description,query_def,owner,created_at::text AS created_at FROM bi_reports WHERE dashboard_id=${dashboard_id} ORDER BY created_at DESC`
    : await sql`SELECT id,dashboard_id,name,description,query_def,owner,created_at::text AS created_at FROM bi_reports ORDER BY created_at DESC`;
  return rows as unknown as BiReport[];
}
export async function createReport(d: Omit<BiReport,"id"|"created_at">): Promise<BiReport> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO bi_reports (dashboard_id,name,description,query_def,owner) VALUES (${d.dashboard_id??null},${d.name},${d.description},${sql.json(d.query_def as never)},${d.owner}) RETURNING id,dashboard_id,name,description,query_def,owner,created_at::text AS created_at`;
  return r as unknown as BiReport;
}
export async function deleteReport(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM bi_reports WHERE id=${id}`;
}
