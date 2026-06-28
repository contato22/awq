// ─── Leitor AO VIVO do Pós-venda/O&M (app projetos.enerdy / gestão "Pós Venda") ─
// O CRM de O&M vive no app "projetos" (backend zecancsoeyjnagxkrxnk), tabela
// pos_venda_servicos — é a OS REAL do pós-venda (cliente, cidade, tipo,
// valor_fechado, custo_servico, data, próxima atividade).
//
// IMPORTANTE: este app usa email `${user}@enerdy.com.br` (diferente do montagem,
// que é @enerdy.local). Reusa ENERDY_USER/ENERDY_PASS (mesma conta felipe).

import { createClient } from "@supabase/supabase-js";
import type { OS } from "@/lib/enrd-posvenda-costing";
import { snapshotProjetos } from "@/lib/enerdy-snapshot";

const PROJ_URL = process.env.ENERDY_PROJETOS_URL || "https://zecancsoeyjnagxkrxnk.supabase.co";
const PROJ_ANON =
  process.env.ENERDY_PROJETOS_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY2FuY3NvZXlqbmFneGtyeG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDcwMDUsImV4cCI6MjA5MDQ4MzAwNX0.FDj52jIZooEILoVPWTwvZkAtmPLhrnVPzZJI-9OfGO0";
const PROJ_DOMAIN = process.env.ENERDY_PROJETOS_EMAIL_DOMAIN || "enerdy.com.br";

function deriveEmail(): string {
  if (process.env.ENERDY_PROJETOS_EMAIL) return process.env.ENERDY_PROJETOS_EMAIL;
  const u = (process.env.ENERDY_USER || "").trim().toLowerCase();
  if (!u) return "";
  return u.includes("@") ? u : `${u.replace(/[^a-z0-9_.-]/g, "")}@${PROJ_DOMAIN}`;
}

export function isProjetosConfigured(): boolean {
  return Boolean((process.env.ENERDY_PROJETOS_EMAIL || process.env.ENERDY_USER) && process.env.ENERDY_PASS);
}

// OS enriquecida com campos do CRM de pós-venda.
export type ServicoOS = OS & {
  status: string | null; // fechado | em_negociacao | entrar_contato …
  potenciaKwp: number | null;
  proximaAtividade: string | null; // data da próxima atividade (agenda)
  origem: string | null;
};

function dateOnly(v: unknown): string | null {
  if (!v) return null;
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function servicoToOS(s: Record<string, unknown>): ServicoOS {
  return {
    id: `pv-${String(s.id)}`,
    data: dateOnly(s.data_agendamento) ?? dateOnly(s.created_at),
    cliente: (s.cliente_nome as string)?.trim() || null,
    cidade: (s.cidade as string)?.trim() || null,
    tipoServico: (s.tipo_servico as string)?.trim() || null,
    valor: num(s.valor_fechado),
    custoMaterial: num(s.custo_servico),
    tecnico: null, // CRM não traz técnico nominal nesta tabela
    status: (s.status as string)?.trim() || null,
    potenciaKwp: s.potencia_kwp == null ? null : num(s.potencia_kwp),
    proximaAtividade: dateOnly(s.proxima_atividade_data),
    origem: (s.origem as string)?.trim() || null,
  };
}

type Queryable = {
  from: (t: string) => { select: (c: string) => { range: (a: number, b: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }> } };
};

async function fetchAll(sb: Queryable, table: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`projetos.${table}: ${error.message}`);
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export type ProjetosPosVenda = { servicos: ServicoOS[]; fetchedAt: string; stale?: boolean };

const TTL_MS = 10_000;
let cache: { data: ProjetosPosVenda; ts: number } | null = null;
let inflight: Promise<ProjetosPosVenda> | null = null;

export function projetosAgeSeconds(): number | null {
  return cache ? Math.round((Date.now() - cache.ts) / 1000) : null;
}

async function fetchLive(): Promise<ProjetosPosVenda> {
  const email = deriveEmail();
  const password = process.env.ENERDY_PASS || "";
  if (!email || !password) throw new Error("Credenciais do projetos ausentes.");
  const sb = createClient(PROJ_URL, PROJ_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: authError } = await sb.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(`Login projetos falhou: ${authError.message}`);
  try {
    const rows = await fetchAll(sb as unknown as Queryable, "pos_venda_servicos");
    return { servicos: rows.map(servicoToOS), fetchedAt: new Date().toISOString() };
  } finally {
    await sb.auth.signOut();
  }
}

// Lê ao vivo o pós-venda do projetos. null se não configurado; degrada para o
// último cache em falha.
export async function getLiveProjetosPosVenda(opts?: { force?: boolean }): Promise<ProjetosPosVenda | null> {
  if (!isProjetosConfigured()) return snapshotProjetos(); // fallback estático
  const force = opts?.force ?? false;
  if (!force && cache && Date.now() - cache.ts < TTL_MS) return cache.data;
  if (!force && inflight) return inflight;
  inflight = fetchLive()
    .then((data) => {
      cache = { data, ts: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  try {
    return await inflight;
  } catch (e) {
    if (cache) return cache.data;
    throw e;
  }
}
