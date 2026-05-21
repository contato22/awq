// ─── Contrapartes — repository ────────────────────────────────────────────────
// Data access layer for the counterparty master register.
// Migrated from IndexedDB to Supabase (anon key — respects RLS).
// Table: contrapartes (snake_case columns mapped to camelCase TypeScript types)

import { supabaseClient } from "@/lib/supabase";
import type { Contraparte, ContraprtePapel, ContraprteTipo, ContraparteRegime, ContraparteStatus } from "./contraparte-types";

function iso(): string { return new Date().toISOString(); }
function uid(): string { return crypto.randomUUID(); }

// ─── DB row ↔ domain type mappers ─────────────────────────────────────────────

type Row = Record<string, unknown>;

function toRow(c: Contraparte): Row {
  return {
    id:               c.id,
    tipo:             c.tipo,
    papel:            c.papel,
    razao_social:     c.razaoSocial,
    nome_fantasia:    c.nomeFantasia   ?? null,
    cnpj_cpf:         c.cnpjCpf,
    ie:               c.ie            ?? null,
    im:               c.im            ?? null,
    regime:           c.regime,
    email_financeiro: c.emailFinanceiro ?? null,
    telefone:         c.telefone       ?? null,
    cep:              c.cep            ?? null,
    logradouro:       c.logradouro     ?? null,
    numero:           c.numero         ?? null,
    complemento:      c.complemento   ?? null,
    bairro:           c.bairro         ?? null,
    cidade:           c.cidade         ?? null,
    uf:               c.uf             ?? null,
    banco:            c.banco          ?? null,
    agencia:          c.agencia        ?? null,
    conta:            c.conta          ?? null,
    pix:              c.pix            ?? null,
    bu:               c.bu,
    status:           c.status,
    observacoes:      c.observacoes    ?? null,
    created_at:       c.createdAt,
    updated_at:       c.updatedAt,
    deleted_at:       c.deletedAt      ?? null,
  };
}

function fromRow(r: Row): Contraparte {
  const s = (v: unknown) => String(v ?? "");
  const sn = (v: unknown) => (v != null ? String(v) : undefined);
  return {
    id:               s(r.id),
    tipo:             r.tipo    as ContraprteTipo,
    papel:            r.papel   as ContraprtePapel,
    razaoSocial:      s(r.razao_social),
    nomeFantasia:     sn(r.nome_fantasia),
    cnpjCpf:          s(r.cnpj_cpf),
    ie:               sn(r.ie),
    im:               sn(r.im),
    regime:           r.regime  as ContraparteRegime,
    emailFinanceiro:  sn(r.email_financeiro),
    telefone:         sn(r.telefone),
    cep:              sn(r.cep),
    logradouro:       sn(r.logradouro),
    numero:           sn(r.numero),
    complemento:      sn(r.complemento),
    bairro:           sn(r.bairro),
    cidade:           sn(r.cidade),
    uf:               sn(r.uf),
    banco:            sn(r.banco),
    agencia:          sn(r.agencia),
    conta:            sn(r.conta),
    pix:              sn(r.pix),
    bu:               s(r.bu),
    status:           r.status  as ContraparteStatus,
    observacoes:      sn(r.observacoes),
    createdAt:        s(r.created_at),
    updatedAt:        s(r.updated_at),
    deletedAt:        sn(r.deleted_at),
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listContrapartes(): Promise<Contraparte[]> {
  const { data, error } = await supabaseClient!
    .from("contrapartes")
    .select("*")
    .is("deleted_at", null)
    .order("razao_social");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function getContraparte(id: string): Promise<Contraparte | undefined> {
  const { data, error } = await supabaseClient!
    .from("contrapartes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return fromRow(data as Row);
}

export async function searchContrapartes(
  query: string,
  filters?: { papel?: ContraprtePapel | "all"; bu?: string; status?: string }
): Promise<Contraparte[]> {
  let q = supabaseClient!
    .from("contrapartes")
    .select("*")
    .is("deleted_at", null);

  if (filters?.papel && filters.papel !== "all") q = q.eq("papel", filters.papel);
  if (filters?.bu    && filters.bu    !== "all") q = q.eq("bu",    filters.bu);
  if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (query.trim()) q = q.ilike("razao_social", `%${query.trim()}%`);

  q = q.order("razao_social");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createContraparte(
  data: Omit<Contraparte, "id" | "createdAt" | "updatedAt" | "deletedAt">
): Promise<Contraparte> {
  const now = iso();
  const c: Contraparte = { ...data, id: uid(), createdAt: now, updatedAt: now };
  const { data: row, error } = await supabaseClient!
    .from("contrapartes")
    .insert(toRow(c))
    .select()
    .single();
  if (error) throw error;
  return fromRow(row as Row);
}

export async function updateContraparte(
  id: string,
  patch: Partial<Omit<Contraparte, "id" | "createdAt">>
): Promise<Contraparte> {
  const prev = await getContraparte(id);
  if (!prev) throw new Error(`Contraparte ${id} not found`);
  const updated: Contraparte = { ...prev, ...patch, updatedAt: iso() };
  const { data: row, error } = await supabaseClient!
    .from("contrapartes")
    .update(toRow(updated))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(row as Row);
}

export async function softDeleteContraparte(id: string): Promise<void> {
  await updateContraparte(id, { deletedAt: iso(), status: "inativo" });
}
