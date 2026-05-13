import { sql } from "@/lib/db";

export type GrcRisk = {
  id: string; name: string; category: string; probability: string;
  impact: string; status: string; owner: string; mitigation: string;
};
export type GrcControl = {
  id: string; risk_id: string | null; name: string; description: string;
  status: string; owner: string;
};
export type GrcAudit = {
  id: string; name: string; scope: string; auditor: string; status: string;
  start_date: string | null; end_date: string | null; findings: string;
};
export type GrcPolicy = {
  id: string; name: string; category: string; description: string;
  owner: string; status: string; version: string; review_date: string | null;
};

// ─── Risks ───────────────────────────────────────────────────────────────────

export async function listRisks(): Promise<GrcRisk[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,category,probability,impact,status,owner,mitigation FROM grc_risks ORDER BY created_at DESC`;
  return rows as unknown as GrcRisk[];
}
export async function createRisk(d: Omit<GrcRisk,"id">): Promise<GrcRisk> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO grc_risks ${sql(d)} RETURNING id,name,category,probability,impact,status,owner,mitigation`;
  return r as unknown as GrcRisk;
}
export async function updateRisk(id: string, d: Partial<Omit<GrcRisk,"id">>): Promise<GrcRisk|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE grc_risks SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,name,category,probability,impact,status,owner,mitigation`;
  return rows[0] as unknown as GrcRisk ?? null;
}
export async function deleteRisk(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM grc_risks WHERE id=${id}`;
}

// ─── Controls ────────────────────────────────────────────────────────────────

export async function listControls(): Promise<GrcControl[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,risk_id,name,description,status,owner FROM grc_controls ORDER BY created_at DESC`;
  return rows as unknown as GrcControl[];
}
export async function createControl(d: Omit<GrcControl,"id">): Promise<GrcControl> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO grc_controls ${sql(d)} RETURNING id,risk_id,name,description,status,owner`;
  return r as unknown as GrcControl;
}
export async function updateControl(id: string, d: Partial<Omit<GrcControl,"id">>): Promise<GrcControl|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE grc_controls SET ${sql(d)} WHERE id=${id} RETURNING id,risk_id,name,description,status,owner`;
  return rows[0] as unknown as GrcControl ?? null;
}
export async function deleteControl(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM grc_controls WHERE id=${id}`;
}

// ─── Audits ───────────────────────────────────────────────────────────────────

export async function listAudits(): Promise<GrcAudit[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,scope,auditor,status,start_date::text AS start_date,end_date::text AS end_date,findings FROM grc_audits ORDER BY created_at DESC`;
  return rows as unknown as GrcAudit[];
}
export async function createAudit(d: Omit<GrcAudit,"id">): Promise<GrcAudit> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO grc_audits ${sql(d)} RETURNING id,name,scope,auditor,status,start_date::text AS start_date,end_date::text AS end_date,findings`;
  return r as unknown as GrcAudit;
}
export async function updateAudit(id: string, d: Partial<Omit<GrcAudit,"id">>): Promise<GrcAudit|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE grc_audits SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,name,scope,auditor,status,start_date::text AS start_date,end_date::text AS end_date,findings`;
  return rows[0] as unknown as GrcAudit ?? null;
}
export async function deleteAudit(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM grc_audits WHERE id=${id}`;
}

// ─── Policies ────────────────────────────────────────────────────────────────

export async function listPolicies(): Promise<GrcPolicy[]> {
  if (!sql) return [];
  const rows = await sql`SELECT id,name,category,description,owner,status,version,review_date::text AS review_date FROM grc_policies ORDER BY created_at DESC`;
  return rows as unknown as GrcPolicy[];
}
export async function createPolicy(d: Omit<GrcPolicy,"id">): Promise<GrcPolicy> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`INSERT INTO grc_policies ${sql(d)} RETURNING id,name,category,description,owner,status,version,review_date::text AS review_date`;
  return r as unknown as GrcPolicy;
}
export async function updatePolicy(id: string, d: Partial<Omit<GrcPolicy,"id">>): Promise<GrcPolicy|null> {
  if (!sql) return null;
  const rows = await sql`UPDATE grc_policies SET ${sql(d)}, updated_at=NOW() WHERE id=${id} RETURNING id,name,category,description,owner,status,version,review_date::text AS review_date`;
  return rows[0] as unknown as GrcPolicy ?? null;
}
export async function deletePolicy(id: string): Promise<void> {
  if (!sql) return;
  await sql`DELETE FROM grc_policies WHERE id=${id}`;
}
