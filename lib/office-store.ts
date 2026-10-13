/**
 * Armazenamento servidor do estado do Office (tabela office_state, ver migration 013).
 * Só roda em rotas de API (usa a service role). Concorrência otimista por versão.
 */
import { getErpAdminClient } from "./supabase-erp";

export const CHAVES_OFFICE = ["head", "missions", "events", "policies"] as const;
export type ChaveOffice = (typeof CHAVES_OFFICE)[number];

export interface RegistroOffice { value: unknown; version: number; updated_at: string }

export type ResultadoLeitura = { ok: true; dados: Partial<Record<ChaveOffice, RegistroOffice>> } | { ok: false; codigo: "STORAGE_NOT_READY" | "STORAGE_ERROR"; mensagem: string };
export type ResultadoEscrita = { ok: true; version: number } | { ok: false; conflito: true; atual: RegistroOffice | null } | { ok: false; conflito?: false; codigo: "STORAGE_NOT_READY" | "STORAGE_ERROR"; mensagem: string };

const TABELA = "office_state";
/** Tamanho máximo do documento (bytes) para não encher o banco por acidente. */
export const MAX_BYTES = 900_000;

function tabelaAusente(e: { code?: string; message?: string }): boolean {
  return e.code === "42P01" || e.code === "PGRST205" || /does not exist|Could not find the table/i.test(e.message ?? "");
}

function cliente() {
  try { return getErpAdminClient(); } catch { return null; }
}

export async function lerEstado(chaves: readonly ChaveOffice[] = CHAVES_OFFICE): Promise<ResultadoLeitura> {
  const db = cliente();
  if (!db) return { ok: false, codigo: "STORAGE_NOT_READY", mensagem: "Supabase do ERP não configurado neste ambiente." };
  const { data, error } = await db.from(TABELA).select("key,value,version,updated_at").in("key", chaves as string[]);
  if (error) return { ok: false, codigo: tabelaAusente(error) ? "STORAGE_NOT_READY" : "STORAGE_ERROR", mensagem: tabelaAusente(error) ? "Tabela office_state ainda não criada (migration 013)." : error.message };
  const dados: Partial<Record<ChaveOffice, RegistroOffice>> = {};
  for (const r of data ?? []) dados[r.key as ChaveOffice] = { value: r.value, version: r.version, updated_at: r.updated_at };
  return { ok: true, dados };
}

export async function gravarEstado(chave: ChaveOffice, value: unknown, base: number, por: string): Promise<ResultadoEscrita> {
  const db = cliente();
  if (!db) return { ok: false, codigo: "STORAGE_NOT_READY", mensagem: "Supabase do ERP não configurado neste ambiente." };
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > MAX_BYTES) return { ok: false, codigo: "STORAGE_ERROR", mensagem: "Documento grande demais." };
  const agora = new Date().toISOString();
  if (base <= 0) {
    const { error } = await db.from(TABELA).insert({ key: chave, value, version: 1, updated_at: agora, updated_by: por });
    if (!error) return { ok: true, version: 1 };
    if (error.code === "23505") return { ok: false, conflito: true, atual: await atual(chave) };
    return { ok: false, codigo: tabelaAusente(error) ? "STORAGE_NOT_READY" : "STORAGE_ERROR", mensagem: error.message };
  }
  const { data, error } = await db.from(TABELA).update({ value, version: base + 1, updated_at: agora, updated_by: por }).eq("key", chave).eq("version", base).select("version");
  if (error) return { ok: false, codigo: tabelaAusente(error) ? "STORAGE_NOT_READY" : "STORAGE_ERROR", mensagem: error.message };
  if (!data || data.length === 0) return { ok: false, conflito: true, atual: await atual(chave) };
  return { ok: true, version: base + 1 };
}

async function atual(chave: ChaveOffice): Promise<RegistroOffice | null> {
  const r = await lerEstado([chave]);
  return r.ok ? r.dados[chave] ?? null : null;
}
