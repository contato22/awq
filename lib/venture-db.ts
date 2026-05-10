// ─── AWQ Venture — Database Layer ────────────────────────────────────────────
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres via postgres client
//   DATABASE_URL unset → in-memory fallback (dev / GitHub Pages)
//
// TABLES: venture_deals, venture_contracts  (see awq_venture_full_schema.sql)

import { sql } from "./db";
import type { DealWorkspace } from "./deal-types";
import type { VentureContract } from "./awq-group-data";
import { randomUUID } from "crypto";

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

let _ready = false;

export async function initVentureDB(): Promise<void> {
  if (!sql || _ready) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS venture_deals (
        id                TEXT PRIMARY KEY,
        company_name      TEXT NOT NULL,
        stage             TEXT NOT NULL DEFAULT 'Triagem',
        assignee          TEXT,
        last_updated      TEXT,
        send_status       TEXT NOT NULL DEFAULT 'Rascunho',
        operation_type    TEXT,
        valuation_range   TEXT,
        proposed_value    NUMERIC,
        deal_score        NUMERIC,
        risk_level        TEXT,
        priority          TEXT NOT NULL DEFAULT 'Média',
        identification    JSONB DEFAULT '{}',
        strategic_thesis  JSONB DEFAULT '{}',
        asset_diagnosis   JSONB DEFAULT '{}',
        financials        JSONB DEFAULT '{}',
        risk_diligence    JSONB DEFAULT '{}',
        proposal_structure JSONB DEFAULT '{}',
        governance        JSONB DEFAULT '{}',
        proposal_10blocks JSONB,
        overrides         JSONB DEFAULT '{}',
        client_responses  JSONB DEFAULT '[]',
        is_custom         BOOLEAN NOT NULL DEFAULT false,
        is_seed           BOOLEAN NOT NULL DEFAULT false,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_venture_deals_stage    ON venture_deals(stage)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_venture_deals_updated  ON venture_deals(updated_at DESC)`;

    await sql`
      CREATE TABLE IF NOT EXISTS venture_contracts (
        id                   TEXT PRIMARY KEY,
        counterparty         TEXT NOT NULL,
        monthly_fee          NUMERIC NOT NULL DEFAULT 0,
        duration_months      INTEGER,
        total_contract_value NUMERIC,
        arr                  NUMERIC,
        start_date           TEXT,
        status               TEXT NOT NULL DEFAULT 'active',
        note                 TEXT,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    _ready = true;
  } catch { /* DB unavailable — fallback to in-memory */ }
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

let _deals: DealWorkspace[] = [];
const _contractsMap = new Map<string, VentureContract>(); // id → contract
const _overrides: Record<string, Record<string, unknown>> = {};
const _responses: Record<string, unknown[]> = {};

function rowToDeal(r: Record<string, unknown>): DealWorkspace {
  return {
    id:             r.id as string,
    companyName:    r.company_name as string,
    stage:          r.stage as DealWorkspace["stage"],
    assignee:       (r.assignee as string) ?? "",
    lastUpdated:    (r.last_updated as string) ?? "",
    sendStatus:     r.send_status as DealWorkspace["sendStatus"],
    operationType:  (r.operation_type as DealWorkspace["operationType"]) ?? "Aquisição Parcial",
    valuationRange: (r.valuation_range as string) ?? "",
    proposedValue:  Number(r.proposed_value ?? 0),
    dealScore:      Number(r.deal_score ?? 0),
    riskLevel:      (r.risk_level as DealWorkspace["riskLevel"]) ?? "Médio",
    priority:       (r.priority as DealWorkspace["priority"]) ?? "Média",
    identification:    (r.identification    as DealWorkspace["identification"])    ?? {} as DealWorkspace["identification"],
    strategicThesis:   (r.strategic_thesis  as DealWorkspace["strategicThesis"])   ?? {} as DealWorkspace["strategicThesis"],
    assetDiagnosis:    (r.asset_diagnosis   as DealWorkspace["assetDiagnosis"])    ?? {} as DealWorkspace["assetDiagnosis"],
    financials:        (r.financials        as DealWorkspace["financials"])        ?? {} as DealWorkspace["financials"],
    riskDiligence:     (r.risk_diligence    as DealWorkspace["riskDiligence"])     ?? {} as DealWorkspace["riskDiligence"],
    proposalStructure: (r.proposal_structure as DealWorkspace["proposalStructure"]) ?? {} as DealWorkspace["proposalStructure"],
    governance:        (r.governance        as DealWorkspace["governance"])        ?? {} as DealWorkspace["governance"],
    proposal10Blocks:  r.proposal_10blocks as DealWorkspace["proposal10Blocks"],
  };
}

function rowToContract(r: Record<string, unknown>): VentureContract {
  return {
    counterparty:       r.counterparty as string,
    monthlyFee:         Number(r.monthly_fee),
    durationMonths:     r.duration_months ? Number(r.duration_months) : 0,
    totalContractValue: Number(r.total_contract_value ?? 0),
    arr:                Number(r.arr ?? 0),
    startDate:          (r.start_date as string | null) ?? null,
    status:             r.status as VentureContract["status"],
    note:               (r.note as string) ?? "",
  };
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export async function getDeals(): Promise<DealWorkspace[]> {
  await initVentureDB();
  if (sql) {
    const rows = await sql`SELECT * FROM venture_deals ORDER BY updated_at DESC`;
    return rows.map(rowToDeal);
  }
  return [..._deals];
}

export async function getDealById(id: string): Promise<DealWorkspace | null> {
  await initVentureDB();
  if (sql) {
    const rows = await sql`SELECT * FROM venture_deals WHERE id = ${id} LIMIT 1`;
    return rows.length ? rowToDeal(rows[0]) : null;
  }
  return _deals.find((d) => d.id === id) ?? null;
}

export async function upsertDeal(deal: DealWorkspace, isCustom = false): Promise<void> {
  await initVentureDB();
  if (sql) {
    await sql`
      INSERT INTO venture_deals (
        id, company_name, stage, assignee, last_updated, send_status,
        operation_type, valuation_range, proposed_value, deal_score,
        risk_level, priority, identification, strategic_thesis, asset_diagnosis,
        financials, risk_diligence, proposal_structure, governance,
        proposal_10blocks, is_custom, is_seed, updated_at
      ) VALUES (
        ${deal.id}, ${deal.companyName}, ${deal.stage}, ${deal.assignee},
        ${deal.lastUpdated}, ${deal.sendStatus}, ${deal.operationType},
        ${deal.valuationRange}, ${deal.proposedValue}, ${deal.dealScore},
        ${deal.riskLevel}, ${deal.priority},
        ${JSON.stringify(deal.identification)},
        ${JSON.stringify(deal.strategicThesis)},
        ${JSON.stringify(deal.assetDiagnosis)},
        ${JSON.stringify(deal.financials)},
        ${JSON.stringify(deal.riskDiligence)},
        ${JSON.stringify(deal.proposalStructure)},
        ${JSON.stringify(deal.governance)},
        ${deal.proposal10Blocks ? JSON.stringify(deal.proposal10Blocks) : null},
        ${isCustom}, ${false}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        company_name      = EXCLUDED.company_name,
        stage             = EXCLUDED.stage,
        assignee          = EXCLUDED.assignee,
        last_updated      = EXCLUDED.last_updated,
        send_status       = EXCLUDED.send_status,
        operation_type    = EXCLUDED.operation_type,
        valuation_range   = EXCLUDED.valuation_range,
        proposed_value    = EXCLUDED.proposed_value,
        deal_score        = EXCLUDED.deal_score,
        risk_level        = EXCLUDED.risk_level,
        priority          = EXCLUDED.priority,
        identification    = EXCLUDED.identification,
        strategic_thesis  = EXCLUDED.strategic_thesis,
        asset_diagnosis   = EXCLUDED.asset_diagnosis,
        financials        = EXCLUDED.financials,
        risk_diligence    = EXCLUDED.risk_diligence,
        proposal_structure = EXCLUDED.proposal_structure,
        governance        = EXCLUDED.governance,
        proposal_10blocks = EXCLUDED.proposal_10blocks,
        updated_at        = NOW()
    `;
    return;
  }
  const idx = _deals.findIndex((d) => d.id === deal.id);
  if (idx >= 0) _deals[idx] = deal; else _deals.push(deal);
}

export async function deleteDeal(id: string): Promise<void> {
  await initVentureDB();
  if (sql) {
    await sql`DELETE FROM venture_deals WHERE id = ${id}`;
    return;
  }
  _deals = _deals.filter((d) => d.id !== id);
}

// ─── Deal overrides / client responses ───────────────────────────────────────

export async function getDealOverrides(id: string): Promise<Record<string, unknown>> {
  await initVentureDB();
  if (sql) {
    const rows = await sql`SELECT overrides FROM venture_deals WHERE id = ${id}`;
    return (rows[0]?.overrides as Record<string, unknown>) ?? {};
  }
  return _overrides[id] ?? {};
}

export async function saveDealOverrides(id: string, overrides: Record<string, unknown>): Promise<void> {
  await initVentureDB();
  if (sql) {
    await sql`UPDATE venture_deals SET overrides = ${JSON.stringify(overrides)}, updated_at = NOW() WHERE id = ${id}`;
    return;
  }
  _overrides[id] = overrides;
}

export async function getDealClientResponses(id: string): Promise<unknown[]> {
  await initVentureDB();
  if (sql) {
    const rows = await sql`SELECT client_responses FROM venture_deals WHERE id = ${id}`;
    return (rows[0]?.client_responses as unknown[]) ?? [];
  }
  return _responses[id] ?? [];
}

export async function saveDealClientResponses(id: string, responses: unknown[]): Promise<void> {
  await initVentureDB();
  if (sql) {
    await sql`UPDATE venture_deals SET client_responses = ${JSON.stringify(responses)}, updated_at = NOW() WHERE id = ${id}`;
    return;
  }
  _responses[id] = responses;
}

// ─── Venture Contracts ────────────────────────────────────────────────────────

export async function getVentureContracts(): Promise<VentureContract[]> {
  await initVentureDB();
  if (sql) {
    const rows = await sql`SELECT * FROM venture_contracts ORDER BY created_at`;
    return rows.map(rowToContract);
  }
  return [..._contractsMap.values()];
}

export async function upsertVentureContract(
  contract: VentureContract & { id?: string }
): Promise<string> {
  await initVentureDB();
  const id = contract.id ?? randomUUID();
  if (sql) {
    await sql`
      INSERT INTO venture_contracts
        (id, counterparty, monthly_fee, duration_months, total_contract_value, arr, start_date, status, note)
      VALUES
        (${id}, ${contract.counterparty}, ${contract.monthlyFee}, ${contract.durationMonths ?? null},
         ${contract.totalContractValue}, ${contract.arr}, ${contract.startDate ?? null},
         ${contract.status}, ${contract.note ?? null})
      ON CONFLICT (id) DO UPDATE SET
        counterparty         = EXCLUDED.counterparty,
        monthly_fee          = EXCLUDED.monthly_fee,
        duration_months      = EXCLUDED.duration_months,
        total_contract_value = EXCLUDED.total_contract_value,
        arr                  = EXCLUDED.arr,
        start_date           = EXCLUDED.start_date,
        status               = EXCLUDED.status,
        note                 = EXCLUDED.note,
        updated_at           = NOW()
    `;
    return id;
  }
  _contractsMap.set(id, { ...contract });
  return id;
}

export async function deleteVentureContract(id: string): Promise<void> {
  await initVentureDB();
  if (sql) {
    await sql`DELETE FROM venture_contracts WHERE id = ${id}`;
    return;
  }
  _contractsMap.delete(id);
}
