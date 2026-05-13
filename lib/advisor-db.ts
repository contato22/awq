// ─── Advisor — Internal Database Layer ────────────────────────────────────────
//
// SOURCE OF TRUTH: Supabase Postgres.
//
// Tables:
//   advisor_clients   — client register (consultoria / gestão patrimonial)

import { getSupabaseAdmin } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdvisorClient {
  id: string;
  name: string;
  segmento: string;
  tipo_servico: string;
  aum: number;               // Assets under management (R$)
  fee_mensal: number;        // Monthly advisory fee (R$)
  status: string;            // "Ativo" | "Em Negociação" | "Pausado" | "Encerrado"
  since: string;             // ISO date YYYY-MM-DD
  responsavel: string;       // AWQ advisor in charge
  contato_email: string;
  contato_phone: string;
  nps: number | null;
  // Origin metadata
  imported_from_notion: boolean;
  notion_page_id: string | null;
  imported_at: string | null;
  last_internal_update: string;
  sync_status: "internal" | "imported" | "modified";
}

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

export async function initAdvisorDB(): Promise<void> {}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export function newAdvisorClientId() {
  return `ADV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function listAdvisorClients(): Promise<AdvisorClient[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb.from("advisor_clients").select("*").order("name", { ascending: true });
  return (data ?? []).map(coerceClient);
}

export async function getAdvisorClient(id: string): Promise<AdvisorClient | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data: row } = await sb.from("advisor_clients").select("*").eq("id", id).single();
  return row ? coerceClient(row) : null;
}

export async function upsertAdvisorClient(
  c: Omit<AdvisorClient, "last_internal_update">
): Promise<AdvisorClient> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const now = new Date().toISOString();
  const { data: row, error } = await sb
    .from("advisor_clients")
    .upsert({ ...c, last_internal_update: now }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return coerceClient(row);
}

export async function updateAdvisorClient(
  id: string,
  updates: Partial<Omit<AdvisorClient, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<AdvisorClient | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const now = new Date().toISOString();
  const existing = await getAdvisorClient(id);
  if (!existing) return null;
  const patch = { ...updates, last_internal_update: now, sync_status: "modified" as const };
  const { data: row, error } = await sb
    .from("advisor_clients")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return coerceClient(row);
}

export async function deleteAdvisorClient(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from("advisor_clients").delete().eq("id", id);
  return !error;
}

// ─── Coercions (DB rows → typed objects) ──────────────────────────────────────

function coerceClient(r: Record<string, unknown>): AdvisorClient {
  return {
    id:                   String(r.id ?? ""),
    name:                 String(r.name ?? ""),
    segmento:             String(r.segmento ?? ""),
    tipo_servico:         String(r.tipo_servico ?? ""),
    aum:                  Number(r.aum ?? 0),
    fee_mensal:           Number(r.fee_mensal ?? 0),
    status:               String(r.status ?? "Ativo"),
    since:                String(r.since ?? ""),
    responsavel:          String(r.responsavel ?? ""),
    contato_email:        String(r.contato_email ?? ""),
    contato_phone:        String(r.contato_phone ?? ""),
    nps:                  r.nps != null ? Number(r.nps) : null,
    imported_from_notion: Boolean(r.imported_from_notion),
    notion_page_id:       r.notion_page_id != null ? String(r.notion_page_id) : null,
    imported_at:          r.imported_at != null ? String(r.imported_at) : null,
    last_internal_update: String(r.last_internal_update ?? ""),
    sync_status:          (r.sync_status as AdvisorClient["sync_status"]) ?? "internal",
  };
}
