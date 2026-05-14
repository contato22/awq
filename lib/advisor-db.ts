// ─── Advisor — Internal Database Layer ────────────────────────────────────────
//
// SOURCE OF TRUTH: Supabase Postgres (service role, server-side only).
//
// Tables:
//   advisor_clients   — client register (consultoria / gestão patrimonial)

import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

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

export async function initAdvisorDB(): Promise<void> {
  // Tables are created via SQL migration — nothing to do at runtime.
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export function newAdvisorClientId() {
  return `ADV-${randomUUID().slice(0, 8).toUpperCase()}`;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function listAdvisorClients(): Promise<AdvisorClient[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("advisor_clients")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(coerceClient);
}

export async function getAdvisorClient(id: string): Promise<AdvisorClient | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("advisor_clients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw error;
  }
  return data ? coerceClient(data) : null;
}

export async function upsertAdvisorClient(
  c: Omit<AdvisorClient, "last_internal_update">
): Promise<AdvisorClient> {
  if (!supabase) throw new Error("DB not available");
  const now = new Date().toISOString();
  const row = {
    id:                   c.id,
    name:                 c.name,
    segmento:             c.segmento,
    tipo_servico:         c.tipo_servico,
    aum:                  c.aum,
    fee_mensal:           c.fee_mensal,
    status:               c.status,
    since:                c.since,
    responsavel:          c.responsavel,
    contato_email:        c.contato_email,
    contato_phone:        c.contato_phone,
    nps:                  c.nps ?? null,
    imported_from_notion: c.imported_from_notion,
    notion_page_id:       c.notion_page_id ?? null,
    imported_at:          c.imported_at ?? null,
    last_internal_update: now,
    sync_status:          c.sync_status,
  };
  const { data, error } = await supabase
    .from("advisor_clients")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return coerceClient(data);
}

export async function updateAdvisorClient(
  id: string,
  updates: Partial<Omit<AdvisorClient, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<AdvisorClient | null> {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const existing = await getAdvisorClient(id);
  if (!existing) return null;
  const m = { ...existing, ...updates };
  const { data, error } = await supabase
    .from("advisor_clients")
    .update({
      name:                 m.name,
      segmento:             m.segmento,
      tipo_servico:         m.tipo_servico,
      aum:                  m.aum,
      fee_mensal:           m.fee_mensal,
      status:               m.status,
      since:                m.since,
      responsavel:          m.responsavel,
      contato_email:        m.contato_email,
      contato_phone:        m.contato_phone,
      nps:                  m.nps ?? null,
      last_internal_update: now,
      sync_status:          "modified",
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data ? coerceClient(data) : null;
}

export async function deleteAdvisorClient(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("advisor_clients")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
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
