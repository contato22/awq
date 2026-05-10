// ─── CPM (Corporate Performance Management) — Database Layer ──────────────────
//
// Stores OKRs, Balanced Scorecards, Strategic Objectives, and Performance Reviews.
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (cpm_*)
//   DATABASE_URL unset → returns [] (client uses localStorage as fallback)

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OKRStatus = "Não Iniciado" | "Em Progresso" | "Concluído" | "Cancelado";

export interface KeyResult {
  id:          string;
  okr_id:      string;
  description: string;
  target:      number;
  current:     number;
  unit:        string;   // "%" | "R$" | "unidades" | "pts"
  progress:    number;   // 0-100
}

export interface OKR {
  id:          string;
  cycle:       string;   // "Q1 2026", "Q2 2026", "2026"
  type:        "company" | "team" | "individual";
  owner:       string;
  objective:   string;
  key_results: KeyResult[];
  progress:    number;   // 0-100 (%)
  status:      OKRStatus;
  bu:          string;
  created_at:  string;
}

export type ScorecardPerspective = "Financeira" | "Cliente" | "Processos Internos" | "Aprendizado";

export interface ScorecardKPI {
  id:           string;
  scorecard_id: string;
  perspective:  ScorecardPerspective;
  name:         string;
  target:       number;
  actual:       number;
  unit:         string;
  weight:       number;  // 0-100 (relative weight %)
  score:        number;  // calculated
}

export interface Scorecard {
  id:            string;
  name:          string;  // "BSC AWQ Group Q1 2026"
  period:        string;  // "Q1 2026"
  bu:            string;
  overall_score: number;  // weighted avg
  kpis:          ScorecardKPI[];
  created_at:    string;
}

export type StrategyStatus = "Proposta" | "Aprovada" | "Em Execução" | "Concluída" | "Cancelada";

export interface StrategicObjective {
  id:          string;
  title:       string;
  description: string;
  perspective: ScorecardPerspective;
  owner:       string;
  target_date: string;
  status:      StrategyStatus;
  progress:    number;   // 0-100
  bu:          string;
  created_at:  string;
}

export type ReviewStatus = "Agendada" | "Realizada" | "Cancelada";

export interface PerformanceReview {
  id:             string;
  title:          string;  // "Revisão Estratégica Q1 2026"
  type:           "quarterly" | "annual" | "monthly";
  period:         string;
  facilitator:    string;
  date:           string;
  status:         ReviewStatus;
  participants:   number;
  key_decisions:  string;
  bu:             string;
  created_at:     string;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _ready = false;

export async function initCPMDB(): Promise<void> {
  if (!sql || _ready) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS cpm_okrs (
        id          TEXT PRIMARY KEY,
        cycle       TEXT,
        type        TEXT,
        owner       TEXT,
        objective   TEXT,
        key_results JSONB    NOT NULL DEFAULT '[]',
        progress    NUMERIC  NOT NULL DEFAULT 0,
        status      TEXT,
        bu          TEXT     NOT NULL DEFAULT 'awq',
        created_at  TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS cpm_scorecards (
        id            TEXT PRIMARY KEY,
        name          TEXT,
        period        TEXT,
        bu            TEXT    NOT NULL DEFAULT 'awq',
        overall_score NUMERIC NOT NULL DEFAULT 0,
        kpis          JSONB   NOT NULL DEFAULT '[]',
        created_at    TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS cpm_strategic_objectives (
        id          TEXT PRIMARY KEY,
        title       TEXT,
        description TEXT,
        perspective TEXT,
        owner       TEXT,
        target_date TEXT,
        status      TEXT,
        progress    NUMERIC NOT NULL DEFAULT 0,
        bu          TEXT    NOT NULL DEFAULT 'awq',
        created_at  TEXT
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS cpm_performance_reviews (
        id             TEXT PRIMARY KEY,
        title          TEXT,
        type           TEXT,
        period         TEXT,
        facilitator    TEXT,
        date           TEXT,
        status         TEXT,
        participants   INTEGER NOT NULL DEFAULT 0,
        key_decisions  TEXT,
        bu             TEXT    NOT NULL DEFAULT 'awq',
        created_at     TEXT
      )
    `;
    _ready = true;
  } catch { /* DB unavailable — client falls back to localStorage */ }
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function rowToOKR(r: Record<string, unknown>): OKR {
  const kr = typeof r.key_results === "string"
    ? JSON.parse(r.key_results)
    : (r.key_results ?? []);
  return {
    id:          r.id          as string,
    cycle:       r.cycle       as string,
    type:        r.type        as OKR["type"],
    owner:       r.owner       as string,
    objective:   r.objective   as string,
    key_results: kr            as KeyResult[],
    progress:    Number(r.progress),
    status:      r.status      as OKRStatus,
    bu:          r.bu          as string,
    created_at:  r.created_at  as string,
  };
}

function rowToScorecard(r: Record<string, unknown>): Scorecard {
  const kpis = typeof r.kpis === "string"
    ? JSON.parse(r.kpis)
    : (r.kpis ?? []);
  return {
    id:            r.id            as string,
    name:          r.name          as string,
    period:        r.period        as string,
    bu:            r.bu            as string,
    overall_score: Number(r.overall_score),
    kpis:          kpis            as ScorecardKPI[],
    created_at:    r.created_at    as string,
  };
}

function rowToStrategicObjective(r: Record<string, unknown>): StrategicObjective {
  return {
    id:          r.id          as string,
    title:       r.title       as string,
    description: r.description as string,
    perspective: r.perspective as ScorecardPerspective,
    owner:       r.owner       as string,
    target_date: r.target_date as string,
    status:      r.status      as StrategyStatus,
    progress:    Number(r.progress),
    bu:          r.bu          as string,
    created_at:  r.created_at  as string,
  };
}

function rowToPerformanceReview(r: Record<string, unknown>): PerformanceReview {
  return {
    id:            r.id            as string,
    title:         r.title         as string,
    type:          r.type          as PerformanceReview["type"],
    period:        r.period        as string,
    facilitator:   r.facilitator   as string,
    date:          r.date          as string,
    status:        r.status        as ReviewStatus,
    participants:  Number(r.participants),
    key_decisions: r.key_decisions as string,
    bu:            r.bu            as string,
    created_at:    r.created_at    as string,
  };
}

// ─── OKRs ─────────────────────────────────────────────────────────────────────

export async function getOKRs(bu?: string): Promise<OKR[]> {
  await initCPMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM cpm_okrs WHERE bu = ${bu} ORDER BY created_at DESC`
    : await sql`SELECT * FROM cpm_okrs ORDER BY created_at DESC`;
  return rows.map(rowToOKR);
}

export async function upsertOKR(okr: OKR): Promise<void> {
  await initCPMDB();
  if (!sql) return;
  await sql`
    INSERT INTO cpm_okrs
      (id, cycle, type, owner, objective, key_results, progress, status, bu, created_at)
    VALUES
      (${okr.id}, ${okr.cycle}, ${okr.type}, ${okr.owner}, ${okr.objective},
       ${JSON.stringify(okr.key_results)}::jsonb, ${okr.progress}, ${okr.status},
       ${okr.bu}, ${okr.created_at})
    ON CONFLICT (id) DO UPDATE SET
      cycle       = EXCLUDED.cycle,
      type        = EXCLUDED.type,
      owner       = EXCLUDED.owner,
      objective   = EXCLUDED.objective,
      key_results = EXCLUDED.key_results,
      progress    = EXCLUDED.progress,
      status      = EXCLUDED.status,
      bu          = EXCLUDED.bu
  `;
}

export async function deleteOKR(id: string): Promise<void> {
  await initCPMDB();
  if (!sql) return;
  await sql`DELETE FROM cpm_okrs WHERE id = ${id}`;
}

// ─── Scorecards ───────────────────────────────────────────────────────────────

export async function getScorecards(bu?: string): Promise<Scorecard[]> {
  await initCPMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM cpm_scorecards WHERE bu = ${bu} ORDER BY created_at DESC`
    : await sql`SELECT * FROM cpm_scorecards ORDER BY created_at DESC`;
  return rows.map(rowToScorecard);
}

export async function upsertScorecard(s: Scorecard): Promise<void> {
  await initCPMDB();
  if (!sql) return;
  await sql`
    INSERT INTO cpm_scorecards
      (id, name, period, bu, overall_score, kpis, created_at)
    VALUES
      (${s.id}, ${s.name}, ${s.period}, ${s.bu}, ${s.overall_score},
       ${JSON.stringify(s.kpis)}::jsonb, ${s.created_at})
    ON CONFLICT (id) DO UPDATE SET
      name          = EXCLUDED.name,
      period        = EXCLUDED.period,
      bu            = EXCLUDED.bu,
      overall_score = EXCLUDED.overall_score,
      kpis          = EXCLUDED.kpis
  `;
}

export async function deleteScorecard(id: string): Promise<void> {
  await initCPMDB();
  if (!sql) return;
  await sql`DELETE FROM cpm_scorecards WHERE id = ${id}`;
}

// ─── Strategic Objectives ─────────────────────────────────────────────────────

export async function getStrategicObjectives(bu?: string): Promise<StrategicObjective[]> {
  await initCPMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM cpm_strategic_objectives WHERE bu = ${bu} ORDER BY created_at DESC`
    : await sql`SELECT * FROM cpm_strategic_objectives ORDER BY created_at DESC`;
  return rows.map(rowToStrategicObjective);
}

export async function upsertStrategicObjective(o: StrategicObjective): Promise<void> {
  await initCPMDB();
  if (!sql) return;
  await sql`
    INSERT INTO cpm_strategic_objectives
      (id, title, description, perspective, owner, target_date, status, progress, bu, created_at)
    VALUES
      (${o.id}, ${o.title}, ${o.description}, ${o.perspective}, ${o.owner},
       ${o.target_date}, ${o.status}, ${o.progress}, ${o.bu}, ${o.created_at})
    ON CONFLICT (id) DO UPDATE SET
      title       = EXCLUDED.title,
      description = EXCLUDED.description,
      perspective = EXCLUDED.perspective,
      owner       = EXCLUDED.owner,
      target_date = EXCLUDED.target_date,
      status      = EXCLUDED.status,
      progress    = EXCLUDED.progress,
      bu          = EXCLUDED.bu
  `;
}

export async function deleteStrategicObjective(id: string): Promise<void> {
  await initCPMDB();
  if (!sql) return;
  await sql`DELETE FROM cpm_strategic_objectives WHERE id = ${id}`;
}

// ─── Performance Reviews ──────────────────────────────────────────────────────

export async function getPerformanceReviews(bu?: string): Promise<PerformanceReview[]> {
  await initCPMDB();
  if (!sql) return [];
  const rows = bu
    ? await sql`SELECT * FROM cpm_performance_reviews WHERE bu = ${bu} ORDER BY date DESC, created_at DESC`
    : await sql`SELECT * FROM cpm_performance_reviews ORDER BY date DESC, created_at DESC`;
  return rows.map(rowToPerformanceReview);
}

export async function upsertPerformanceReview(r: PerformanceReview): Promise<void> {
  await initCPMDB();
  if (!sql) return;
  await sql`
    INSERT INTO cpm_performance_reviews
      (id, title, type, period, facilitator, date, status, participants, key_decisions, bu, created_at)
    VALUES
      (${r.id}, ${r.title}, ${r.type}, ${r.period}, ${r.facilitator}, ${r.date},
       ${r.status}, ${r.participants}, ${r.key_decisions}, ${r.bu}, ${r.created_at})
    ON CONFLICT (id) DO UPDATE SET
      title         = EXCLUDED.title,
      type          = EXCLUDED.type,
      period        = EXCLUDED.period,
      facilitator   = EXCLUDED.facilitator,
      date          = EXCLUDED.date,
      status        = EXCLUDED.status,
      participants  = EXCLUDED.participants,
      key_decisions = EXCLUDED.key_decisions,
      bu            = EXCLUDED.bu
  `;
}

export async function deletePerformanceReview(id: string): Promise<void> {
  await initCPMDB();
  if (!sql) return;
  await sql`DELETE FROM cpm_performance_reviews WHERE id = ${id}`;
}
