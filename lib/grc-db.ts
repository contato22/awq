// ─── GRC (Governance, Risk & Compliance) — Database Layer ─────────────────────
//
// Stores policies, risks, controls, and audits for the GRC module.
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (grc_policies, grc_risks, grc_controls, grc_audits)
//   DATABASE_URL unset → returns [] (client uses localStorage as fallback)

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PolicyStatus = "Rascunho" | "Em Revisão" | "Aprovada" | "Obsoleta";
export interface GRCPolicy {
  id:             string;
  title:          string;
  category:       string;      // "Segurança" | "Compliance" | "Operacional" | "RH" | "TI"
  owner:          string;
  version:        string;      // "v1.0"
  status:         PolicyStatus;
  effective_date: string;
  review_date:    string;
  bu:             string;
  created_at:     string;
}

export type RiskLevel  = "Baixo" | "Médio" | "Alto" | "Crítico";
export type RiskStatus = "Identificado" | "Em Tratamento" | "Mitigado" | "Aceito";
export interface GRCRisk {
  id:          string;
  title:       string;
  category:    string;      // "Operacional" | "Financeiro" | "Legal" | "TI" | "Reputacional"
  description: string;
  probability: number;      // 1-5
  impact:      number;      // 1-5
  risk_score:  number;      // probability * impact
  level:       RiskLevel;
  owner:       string;
  status:      RiskStatus;
  mitigation:  string;
  bu:          string;
  created_at:  string;
}

export type ControlStatus = "Efetivo" | "Parcialmente Efetivo" | "Inefetivo" | "Não Testado";
export interface GRCControl {
  id:             string;
  title:          string;
  type:           string;          // "Preventivo" | "Detectivo" | "Corretivo"
  category:       string;
  risk_id:        string | null;
  owner:          string;
  frequency:      string;          // "Diário" | "Semanal" | "Mensal" | "Anual"
  status:         ControlStatus;
  last_test_date: string | null;
  next_test_date: string | null;
  bu:             string;
  created_at:     string;
}

export type AuditStatus = "Planejada" | "Em Andamento" | "Concluída" | "Cancelada";
export interface GRCAudit {
  id:                string;
  title:             string;
  scope:             string;
  auditor:           string;
  start_date:        string;
  end_date:          string | null;
  status:            AuditStatus;
  findings:          number;      // count of findings
  critical_findings: number;
  bu:                string;
  created_at:        string;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _ready = false;

export async function initGRCDB(): Promise<void> {
  if (!sql || _ready) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS grc_policies (
        id             TEXT PRIMARY KEY,
        title          TEXT,
        category       TEXT,
        owner          TEXT,
        version        TEXT,
        status         TEXT,
        effective_date TEXT,
        review_date    TEXT,
        bu             TEXT NOT NULL DEFAULT 'awq',
        created_at     TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS grc_risks (
        id          TEXT PRIMARY KEY,
        title       TEXT,
        category    TEXT,
        description TEXT,
        probability INTEGER,
        impact      INTEGER,
        risk_score  INTEGER,
        level       TEXT,
        owner       TEXT,
        status      TEXT,
        mitigation  TEXT,
        bu          TEXT NOT NULL DEFAULT 'awq',
        created_at  TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS grc_controls (
        id             TEXT PRIMARY KEY,
        title          TEXT,
        type           TEXT,
        category       TEXT,
        risk_id        TEXT,
        owner          TEXT,
        frequency      TEXT,
        status         TEXT,
        last_test_date TEXT,
        next_test_date TEXT,
        bu             TEXT NOT NULL DEFAULT 'awq',
        created_at     TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS grc_audits (
        id                TEXT PRIMARY KEY,
        title             TEXT,
        scope             TEXT,
        auditor           TEXT,
        start_date        TEXT,
        end_date          TEXT,
        status            TEXT,
        findings          INTEGER DEFAULT 0,
        critical_findings INTEGER DEFAULT 0,
        bu                TEXT NOT NULL DEFAULT 'awq',
        created_at        TEXT
      )
    `;
    _ready = true;
  } catch { /* DB unavailable — client falls back to localStorage */ }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToPolicy(r: Record<string, unknown>): GRCPolicy {
  return {
    id:             r.id as string,
    title:          r.title as string,
    category:       r.category as string,
    owner:          r.owner as string,
    version:        r.version as string,
    status:         r.status as PolicyStatus,
    effective_date: r.effective_date as string,
    review_date:    r.review_date as string,
    bu:             r.bu as string,
    created_at:     r.created_at as string,
  };
}

function rowToRisk(r: Record<string, unknown>): GRCRisk {
  return {
    id:          r.id as string,
    title:       r.title as string,
    category:    r.category as string,
    description: r.description as string,
    probability: Number(r.probability),
    impact:      Number(r.impact),
    risk_score:  Number(r.risk_score),
    level:       r.level as RiskLevel,
    owner:       r.owner as string,
    status:      r.status as RiskStatus,
    mitigation:  r.mitigation as string,
    bu:          r.bu as string,
    created_at:  r.created_at as string,
  };
}

function rowToControl(r: Record<string, unknown>): GRCControl {
  return {
    id:             r.id as string,
    title:          r.title as string,
    type:           r.type as string,
    category:       r.category as string,
    risk_id:        (r.risk_id as string) ?? null,
    owner:          r.owner as string,
    frequency:      r.frequency as string,
    status:         r.status as ControlStatus,
    last_test_date: (r.last_test_date as string) ?? null,
    next_test_date: (r.next_test_date as string) ?? null,
    bu:             r.bu as string,
    created_at:     r.created_at as string,
  };
}

function rowToAudit(r: Record<string, unknown>): GRCAudit {
  return {
    id:                r.id as string,
    title:             r.title as string,
    scope:             r.scope as string,
    auditor:           r.auditor as string,
    start_date:        r.start_date as string,
    end_date:          (r.end_date as string) ?? null,
    status:            r.status as AuditStatus,
    findings:          Number(r.findings),
    critical_findings: Number(r.critical_findings),
    bu:                r.bu as string,
    created_at:        r.created_at as string,
  };
}

// ─── Policies ─────────────────────────────────────────────────────────────────

export async function getGRCPolicies(bu?: string): Promise<GRCPolicy[]> {
  await initGRCDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM grc_policies WHERE bu = ${bu} ORDER BY created_at DESC`
    : await sql`SELECT * FROM grc_policies ORDER BY created_at DESC`;
  return rows.map(rowToPolicy);
}

export async function upsertGRCPolicy(p: GRCPolicy): Promise<void> {
  await initGRCDB();
  if (!sql) return;
  await sql`
    INSERT INTO grc_policies
      (id, title, category, owner, version, status, effective_date, review_date, bu, created_at)
    VALUES
      (${p.id}, ${p.title}, ${p.category}, ${p.owner}, ${p.version}, ${p.status},
       ${p.effective_date}, ${p.review_date}, ${p.bu}, ${p.created_at})
    ON CONFLICT (id) DO UPDATE SET
      title          = EXCLUDED.title,
      category       = EXCLUDED.category,
      owner          = EXCLUDED.owner,
      version        = EXCLUDED.version,
      status         = EXCLUDED.status,
      effective_date = EXCLUDED.effective_date,
      review_date    = EXCLUDED.review_date,
      bu             = EXCLUDED.bu
  `;
}

export async function deleteGRCPolicy(id: string): Promise<void> {
  await initGRCDB();
  if (!sql) return;
  await sql`DELETE FROM grc_policies WHERE id = ${id}`;
}

// ─── Risks ────────────────────────────────────────────────────────────────────

export async function getGRCRisks(bu?: string): Promise<GRCRisk[]> {
  await initGRCDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM grc_risks WHERE bu = ${bu} ORDER BY risk_score DESC, created_at DESC`
    : await sql`SELECT * FROM grc_risks ORDER BY risk_score DESC, created_at DESC`;
  return rows.map(rowToRisk);
}

export async function upsertGRCRisk(r: GRCRisk): Promise<void> {
  await initGRCDB();
  if (!sql) return;
  await sql`
    INSERT INTO grc_risks
      (id, title, category, description, probability, impact, risk_score, level,
       owner, status, mitigation, bu, created_at)
    VALUES
      (${r.id}, ${r.title}, ${r.category}, ${r.description}, ${r.probability},
       ${r.impact}, ${r.risk_score}, ${r.level}, ${r.owner}, ${r.status},
       ${r.mitigation}, ${r.bu}, ${r.created_at})
    ON CONFLICT (id) DO UPDATE SET
      title       = EXCLUDED.title,
      category    = EXCLUDED.category,
      description = EXCLUDED.description,
      probability = EXCLUDED.probability,
      impact      = EXCLUDED.impact,
      risk_score  = EXCLUDED.risk_score,
      level       = EXCLUDED.level,
      owner       = EXCLUDED.owner,
      status      = EXCLUDED.status,
      mitigation  = EXCLUDED.mitigation,
      bu          = EXCLUDED.bu
  `;
}

export async function deleteGRCRisk(id: string): Promise<void> {
  await initGRCDB();
  if (!sql) return;
  await sql`DELETE FROM grc_risks WHERE id = ${id}`;
}

// ─── Controls ─────────────────────────────────────────────────────────────────

export async function getGRCControls(bu?: string): Promise<GRCControl[]> {
  await initGRCDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM grc_controls WHERE bu = ${bu} ORDER BY created_at DESC`
    : await sql`SELECT * FROM grc_controls ORDER BY created_at DESC`;
  return rows.map(rowToControl);
}

export async function upsertGRCControl(c: GRCControl): Promise<void> {
  await initGRCDB();
  if (!sql) return;
  await sql`
    INSERT INTO grc_controls
      (id, title, type, category, risk_id, owner, frequency, status,
       last_test_date, next_test_date, bu, created_at)
    VALUES
      (${c.id}, ${c.title}, ${c.type}, ${c.category}, ${c.risk_id ?? null},
       ${c.owner}, ${c.frequency}, ${c.status}, ${c.last_test_date ?? null},
       ${c.next_test_date ?? null}, ${c.bu}, ${c.created_at})
    ON CONFLICT (id) DO UPDATE SET
      title          = EXCLUDED.title,
      type           = EXCLUDED.type,
      category       = EXCLUDED.category,
      risk_id        = EXCLUDED.risk_id,
      owner          = EXCLUDED.owner,
      frequency      = EXCLUDED.frequency,
      status         = EXCLUDED.status,
      last_test_date = EXCLUDED.last_test_date,
      next_test_date = EXCLUDED.next_test_date,
      bu             = EXCLUDED.bu
  `;
}

export async function deleteGRCControl(id: string): Promise<void> {
  await initGRCDB();
  if (!sql) return;
  await sql`DELETE FROM grc_controls WHERE id = ${id}`;
}

// ─── Audits ───────────────────────────────────────────────────────────────────

export async function getGRCAudits(bu?: string): Promise<GRCAudit[]> {
  await initGRCDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM grc_audits WHERE bu = ${bu} ORDER BY start_date DESC, created_at DESC`
    : await sql`SELECT * FROM grc_audits ORDER BY start_date DESC, created_at DESC`;
  return rows.map(rowToAudit);
}

export async function upsertGRCAudit(a: GRCAudit): Promise<void> {
  await initGRCDB();
  if (!sql) return;
  await sql`
    INSERT INTO grc_audits
      (id, title, scope, auditor, start_date, end_date, status,
       findings, critical_findings, bu, created_at)
    VALUES
      (${a.id}, ${a.title}, ${a.scope}, ${a.auditor}, ${a.start_date},
       ${a.end_date ?? null}, ${a.status}, ${a.findings}, ${a.critical_findings},
       ${a.bu}, ${a.created_at})
    ON CONFLICT (id) DO UPDATE SET
      title             = EXCLUDED.title,
      scope             = EXCLUDED.scope,
      auditor           = EXCLUDED.auditor,
      start_date        = EXCLUDED.start_date,
      end_date          = EXCLUDED.end_date,
      status            = EXCLUDED.status,
      findings          = EXCLUDED.findings,
      critical_findings = EXCLUDED.critical_findings,
      bu                = EXCLUDED.bu
  `;
}

export async function deleteGRCAudit(id: string): Promise<void> {
  await initGRCDB();
  if (!sql) return;
  await sql`DELETE FROM grc_audits WHERE id = ${id}`;
}
