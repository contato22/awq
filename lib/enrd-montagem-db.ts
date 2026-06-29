// ─── ENRD · Controle de Montagem — espelho no banco da AWQ ───────────────────
// Lê/grava as tabelas enrd_montagem_* no ERP Supabase (kkhxxsrgsewjfvnnssyf).
// Fonte dos dados: lib/enerdy-portal.ts (portal gestão). O app da AWQ consulta
// SEMPRE este espelho local — nunca o portal externo em tempo de request.
//
// Adaptadores: erpAdmin (service role) ?? erpAnon (anon; RLS off nessas tabelas).
// Todas as leituras são tolerantes a falha (tabela não migrada → []), seguindo
// a regra de ouro do projeto (SSR não pode crashar).

import { erpAdmin, erpAnon } from "@/lib/supabase";
import type {
  EnerdyInstallation,
  EnerdyCliente,
  EnerdyCleaningReport,
  PortalSnapshot,
} from "@/lib/enerdy-portal";

const INSTALL_TABLE = "enrd_montagem_installation";
const CLIENTE_TABLE = "enrd_montagem_cliente";
const CLEANING_TABLE = "enrd_montagem_cleaning_report";
const SYNC_LOG_TABLE = "enrd_montagem_sync_log";

function db() {
  return erpAdmin ?? erpAnon;
}

// ── Tipos do espelho ─────────────────────────────────────────────────────────
export type MontagemInstallation = {
  id: string;
  nome: string | null;
  localizacao: string | null;
  status: string | null;
  situacao: string | null;
  tipo: string | null;
  prioridade: string | null;
  montador: string | null;
  cliente_id: string | null;
  qnt_placas: number | null;
  valor_por_placa: number | null;
  expectativa_geracao_kwh_ano: number | null;
  distancia_km: number | null;
  data_int: string | null;
  data_max_inst: string | null;
  source_created_at: string | null;
  source_updated_at: string | null;
  raw: Record<string, unknown>;
  synced_at?: string;
};

export type MontagemCliente = {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  source_created_at: string | null;
  raw: Record<string, unknown>;
  synced_at?: string;
};

// ── Mapeamento origem → espelho ──────────────────────────────────────────────
function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(v: unknown): string | null {
  return v == null ? null : String(v);
}
function dateOnly(v: unknown): string | null {
  if (!v) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function mapInstallation(s: EnerdyInstallation): MontagemInstallation {
  return {
    id: String(s.id),
    nome: str(s.nome),
    localizacao: str(s.localizacao),
    status: str(s.status),
    situacao: str(s.situacao),
    tipo: str(s.tipo),
    prioridade: str(s.prioridade),
    montador: str(s.montador),
    cliente_id: str(s.cliente_id),
    qnt_placas: num(s.qnt_placas),
    valor_por_placa: num(s.valor_por_placa),
    expectativa_geracao_kwh_ano: num(s.expectativa_geracao_kwh_ano),
    distancia_km: num(s.distancia_km),
    data_int: dateOnly(s.data_int),
    data_max_inst: dateOnly(s.data_max_inst),
    source_created_at: str(s.created_at),
    source_updated_at: str(s.updated_at),
    raw: s as Record<string, unknown>,
  };
}

export type MontagemCleaningReport = {
  id: string;
  installation_id: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  local_instalacao: string | null;
  data_limpeza: string | null;
  proxima_limpeza: string | null;
  equipe: string | null;
  capacidade_kwp: number | null;
  nivel_sujeira: string | null;
  tem_anomalias: boolean | null;
  raw: Record<string, unknown>;
  synced_at?: string;
};

export function mapCleaningReport(s: EnerdyCleaningReport): MontagemCleaningReport {
  return {
    id: String(s.id),
    installation_id: str(s.installation_id),
    cliente_id: str(s.cliente_id),
    cliente_nome: str(s.cliente_nome),
    local_instalacao: str(s.local_instalacao),
    data_limpeza: dateOnly(s.data_limpeza),
    proxima_limpeza: dateOnly(s.proxima_limpeza),
    equipe: str(s.equipe),
    capacidade_kwp: num(s.capacidade_kwp),
    nivel_sujeira: str(s.nivel_sujeira),
    tem_anomalias: s.tem_anomalias == null ? null : Boolean(s.tem_anomalias),
    raw: s as Record<string, unknown>,
  };
}

export function mapCliente(s: EnerdyCliente): MontagemCliente {
  return {
    id: String(s.id),
    nome: str(s.nome),
    telefone: str(s.telefone ?? (s as Record<string, unknown>).phone),
    email: str(s.email),
    endereco: str(s.endereco ?? (s as Record<string, unknown>).localizacao),
    source_created_at: str(s.created_at),
    raw: s as Record<string, unknown>,
  };
}

// ── Escrita (upsert idempotente por id) ──────────────────────────────────────
async function upsertChunked<T extends { id: string }>(
  table: string,
  rows: T[]
): Promise<number> {
  const client = db();
  if (!client || rows.length === 0) return 0;
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK).map((r) => ({ ...r, synced_at: new Date().toISOString() }));
    const { error } = await client.from(table).upsert(slice, { onConflict: "id" });
    if (error) throw new Error(`upsert ${table}: ${error.message}`);
    written += slice.length;
  }
  return written;
}

export type SyncResult = { installations: number; clientes: number; cleaning: number };

// Grava o snapshot do portal no banco da AWQ. Lança em erro de escrita.
export async function persistSnapshot(snapshot: PortalSnapshot): Promise<SyncResult> {
  const installations = await upsertChunked(
    INSTALL_TABLE,
    snapshot.installations.map(mapInstallation)
  );
  const clientes = await upsertChunked(CLIENTE_TABLE, snapshot.clientes.map(mapCliente));
  const cleaning = await upsertChunked(
    CLEANING_TABLE,
    (snapshot.cleaningReports ?? []).map(mapCleaningReport)
  );
  return { installations, clientes, cleaning };
}

export async function writeSyncLog(entry: {
  ran_by?: string | null;
  installations: number;
  clientes: number;
  ok: boolean;
  detail?: string | null;
}): Promise<void> {
  const client = db();
  if (!client) return;
  await client.from(SYNC_LOG_TABLE).insert({
    ran_by: entry.ran_by ?? null,
    installations: entry.installations,
    clientes: entry.clientes,
    ok: entry.ok,
    detail: entry.detail ?? null,
  });
}

// ── Leitura (tolerante a falha) ──────────────────────────────────────────────
export async function getInstallations(): Promise<MontagemInstallation[]> {
  try {
    const client = db();
    if (!client) return [];
    const { data, error } = await client
      .from(INSTALL_TABLE)
      .select("*")
      .order("data_int", { ascending: false, nullsFirst: false });
    if (error) {
      console.warn("getInstallations:", error.message);
      return [];
    }
    return (data ?? []) as MontagemInstallation[];
  } catch (e) {
    console.warn("getInstallations exception:", (e as Error).message);
    return [];
  }
}

export async function getCleaningReports(): Promise<MontagemCleaningReport[]> {
  try {
    const client = db();
    if (!client) return [];
    const { data, error } = await client.from(CLEANING_TABLE).select("*");
    if (error) {
      console.warn("getCleaningReports:", error.message);
      return [];
    }
    return (data ?? []) as MontagemCleaningReport[];
  } catch (e) {
    console.warn("getCleaningReports exception:", (e as Error).message);
    return [];
  }
}

// Agenda de reativação: próximas limpezas ordenadas por data (pipeline de receita
// recorrente). Inclui vencidas (proxima_limpeza < hoje) primeiro.
export async function getProximasLimpezas(): Promise<MontagemCleaningReport[]> {
  const rows = await getCleaningReports();
  return rows
    .filter((r) => r.proxima_limpeza)
    .sort((a, b) => (a.proxima_limpeza! < b.proxima_limpeza! ? -1 : 1));
}

export async function getMontagemClientes(): Promise<MontagemCliente[]> {
  try {
    const client = db();
    if (!client) return [];
    const { data, error } = await client.from(CLIENTE_TABLE).select("*").order("nome");
    if (error) {
      console.warn("getMontagemClientes:", error.message);
      return [];
    }
    return (data ?? []) as MontagemCliente[];
  } catch (e) {
    console.warn("getMontagemClientes exception:", (e as Error).message);
    return [];
  }
}

export async function getLastSync(): Promise<{ ran_at: string; installations: number; clientes: number } | null> {
  try {
    const client = db();
    if (!client) return null;
    const { data, error } = await client
      .from(SYNC_LOG_TABLE)
      .select("ran_at, installations, clientes")
      .eq("ok", true)
      .order("ran_at", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as { ran_at: string; installations: number; clientes: number };
  } catch {
    return null;
  }
}

// ── KPIs derivados (para a página ENRD) ──────────────────────────────────────
export type MontagemKpis = {
  total: number;
  concluido: number;
  emExecucao: number;
  agendado: number;
  atencao: number;
  placasTotais: number;
  geracaoEsperadaKwhAno: number;
  porStatus: { status: string; count: number }[];
  porMontador: { montador: string; count: number }[];
};

const RX_CONCLUIDO = /conclu|finaliz|entreg/i;
const RX_EXEC = /execu|andamento|montando/i;
const RX_AGENDADO = /agend|programad/i;
const RX_ATENCAO = /aten|pend|atras|bloque/i;

export function buildMontagemKpis(rows: MontagemInstallation[]): MontagemKpis {
  const statusMap = new Map<string, number>();
  const montadorMap = new Map<string, number>();
  let placas = 0;
  let geracao = 0;

  for (const r of rows) {
    const st = (r.status || r.situacao || "—").trim() || "—";
    statusMap.set(st, (statusMap.get(st) ?? 0) + 1);
    const mont = (r.montador || "—").trim() || "—";
    montadorMap.set(mont, (montadorMap.get(mont) ?? 0) + 1);
    placas += r.qnt_placas ?? 0;
    geracao += r.expectativa_geracao_kwh_ano ?? 0;
  }

  const countBy = (rx: RegExp) =>
    rows.filter((r) => rx.test(`${r.status ?? ""} ${r.situacao ?? ""}`)).length;

  return {
    total: rows.length,
    concluido: countBy(RX_CONCLUIDO),
    emExecucao: countBy(RX_EXEC),
    agendado: countBy(RX_AGENDADO),
    atencao: countBy(RX_ATENCAO),
    placasTotais: placas,
    geracaoEsperadaKwhAno: geracao,
    porStatus: [...statusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    porMontador: [...montadorMap.entries()]
      .map(([montador, count]) => ({ montador, count }))
      .sort((a, b) => b.count - a.count),
  };
}
