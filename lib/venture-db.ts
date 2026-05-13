import { sql } from "@/lib/db";
import { dealWorkspaces } from "@/lib/deal-data";
import { commercialOpportunities } from "@/lib/venture-commercial-data";
import type { DealWorkspace } from "@/lib/deal-types";
import type { CommercialOpportunity } from "@/lib/venture-commercial-types";

export type VentureDealRow = {
  id: string; company_name: string; stage: string; assignee: string;
  send_status: string; deal_score: number | null; risk_level: string;
  priority: string; proposed_value: number; valuation_range: string;
  data: Record<string, unknown>; last_updated: string;
};
export type VentureCommercialRow = {
  id: string; company: string; sector: string; stage: string;
  deal_type: string; probability: number; priority: string;
  responsible: string; next_action: string; last_updated: string;
  data: Record<string, unknown>;
};

async function ensureDealsSeeded(): Promise<void> {
  if (!sql) return;
  const cnt = await sql`SELECT COUNT(*)::int AS n FROM venture_deals`;
  if (Number(cnt[0]?.n) > 0) return;
  for (const d of dealWorkspaces) {
    const row: Omit<VentureDealRow,"data"> & { data: DealWorkspace } = {
      id: d.id, company_name: d.companyName, stage: d.stage,
      assignee: d.assignee ?? "", send_status: d.sendStatus ?? "Rascunho",
      deal_score: d.dealScore ?? null, risk_level: d.riskLevel ?? "Médio",
      priority: d.priority ?? "Média", proposed_value: d.proposedValue ?? 0,
      valuation_range: d.valuationRange ?? "", last_updated: d.lastUpdated ?? "",
      data: d,
    };
    await sql`INSERT INTO venture_deals (id,company_name,stage,assignee,send_status,deal_score,risk_level,priority,proposed_value,valuation_range,data,last_updated) VALUES (${row.id},${row.company_name},${row.stage},${row.assignee},${row.send_status},${row.deal_score??null},${row.risk_level},${row.priority},${row.proposed_value},${row.valuation_range},${sql.json(row.data as never)},${row.last_updated}) ON CONFLICT (id) DO NOTHING`;
  }
}

async function ensureCommercialSeeded(): Promise<void> {
  if (!sql) return;
  const cnt = await sql`SELECT COUNT(*)::int AS n FROM venture_commercial`;
  if (Number(cnt[0]?.n) > 0) return;
  for (const o of commercialOpportunities) {
    const r = { id: o.id, company: o.company, sector: o.sector ?? "", stage: o.stage ?? "Prospecção", deal_type: o.dealType ?? "Operação Recorrente", probability: o.probability ?? 0, priority: o.priority ?? "Média", responsible: o.responsible ?? "", next_action: o.nextAction ?? "", last_updated: o.lastUpdated ?? "" };
    await sql`INSERT INTO venture_commercial (id,company,sector,stage,deal_type,probability,priority,responsible,next_action,last_updated,data) VALUES (${r.id},${r.company},${r.sector},${r.stage},${r.deal_type},${r.probability},${r.priority},${r.responsible},${r.next_action},${r.last_updated},${sql.json(o as never)}) ON CONFLICT (id) DO NOTHING`;
  }
}

export async function listDeals(): Promise<VentureDealRow[]> {
  if (!sql) return dealWorkspaces.map(d => ({
    id: d.id, company_name: d.companyName, stage: d.stage,
    assignee: d.assignee ?? "", send_status: d.sendStatus ?? "",
    deal_score: d.dealScore ?? null, risk_level: d.riskLevel ?? "",
    priority: d.priority ?? "", proposed_value: d.proposedValue ?? 0,
    valuation_range: d.valuationRange ?? "", data: d as unknown as Record<string, unknown>,
    last_updated: d.lastUpdated ?? "",
  }));
  await ensureDealsSeeded();
  const rows = await sql`SELECT id,company_name,stage,assignee,send_status,deal_score,risk_level,priority,proposed_value,valuation_range,data,last_updated FROM venture_deals ORDER BY updated_at DESC`;
  return rows as unknown as VentureDealRow[];
}

export async function getDeal(id: string): Promise<VentureDealRow|null> {
  if (!sql) {
    const d = dealWorkspaces.find(x => x.id === id);
    if (!d) return null;
    return { id: d.id, company_name: d.companyName, stage: d.stage, assignee: d.assignee ?? "", send_status: d.sendStatus ?? "", deal_score: d.dealScore ?? null, risk_level: d.riskLevel ?? "", priority: d.priority ?? "", proposed_value: d.proposedValue ?? 0, valuation_range: d.valuationRange ?? "", data: d as unknown as Record<string, unknown>, last_updated: d.lastUpdated ?? "" };
  }
  await ensureDealsSeeded();
  const rows = await sql`SELECT id,company_name,stage,assignee,send_status,deal_score,risk_level,priority,proposed_value,valuation_range,data,last_updated FROM venture_deals WHERE id=${id}`;
  return rows[0] as unknown as VentureDealRow ?? null;
}

export async function upsertDeal(row: Omit<VentureDealRow,"data"> & { data: DealWorkspace }): Promise<VentureDealRow> {
  if (!sql) throw new Error("DB unavailable");
  const [r] = await sql`
    INSERT INTO venture_deals (id,company_name,stage,assignee,send_status,deal_score,risk_level,priority,proposed_value,valuation_range,data,last_updated) VALUES (${row.id},${row.company_name},${row.stage},${row.assignee},${row.send_status},${row.deal_score??null},${row.risk_level},${row.priority},${row.proposed_value},${row.valuation_range},${sql.json(row.data as never)},${row.last_updated})
    ON CONFLICT (id) DO UPDATE SET
      company_name=${row.company_name}, stage=${row.stage}, assignee=${row.assignee},
      send_status=${row.send_status}, deal_score=${row.deal_score ?? null},
      risk_level=${row.risk_level}, priority=${row.priority},
      proposed_value=${row.proposed_value}, valuation_range=${row.valuation_range},
      data=${sql.json(row.data as never)}, last_updated=${row.last_updated}, updated_at=NOW()
    RETURNING id,company_name,stage,assignee,send_status,deal_score,risk_level,priority,proposed_value,valuation_range,data,last_updated
  `;
  return r as unknown as VentureDealRow;
}

export async function listCommercial(): Promise<VentureCommercialRow[]> {
  if (!sql) return commercialOpportunities.map(o => ({
    id: o.id, company: o.company, sector: o.sector ?? "", stage: o.stage ?? "",
    deal_type: o.dealType ?? "", probability: o.probability ?? 0,
    priority: o.priority ?? "", responsible: o.responsible ?? "",
    next_action: o.nextAction ?? "", last_updated: o.lastUpdated ?? "",
    data: o as unknown as Record<string, unknown>,
  }));
  await ensureCommercialSeeded();
  const rows = await sql`SELECT id,company,sector,stage,deal_type,probability,priority,responsible,next_action,last_updated,data FROM venture_commercial ORDER BY updated_at DESC`;
  return rows as unknown as VentureCommercialRow[];
}
