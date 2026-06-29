// ─── Leitor AO VIVO do app "projetos" da ENERDY (vendas + pós-venda) ─────────
// Backend zecancsoeyjnagxkrxnk. Lemos (somente leitura) as tabelas:
//   pos_venda_servicos — OS REAL de O&M (cliente, cidade, tipo, valor, custo)
//   negocios           — CRM comercial (importado p/ crm_* via script, não aqui)
//   projetos           — vendas fechadas/em execução (ponte venda→pós-venda)
//   proposals          — propostas/orçamentos (forecast comercial)
//   pos_venda          — funil/kanban de quem entrou em pós-venda
//
// Email `${user}@enerdy.com.br` (≠ montagem, que é @enerdy.local). Reusa
// ENERDY_USER/ENERDY_PASS (conta felipe). Sem credenciais → snapshot estático.

import { createClient } from "@supabase/supabase-js";
import type { OS } from "@/lib/enrd-posvenda-costing";
import { snapshotProjetosFull } from "@/lib/enerdy-snapshot";

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

// Venda fechada / em execução (tabela projetos) — ponte venda→pós-venda.
export type ProjetoFechado = {
  id: string;
  cliente: string | null;
  potenciaKwp: number | null;
  dataFechamento: string | null;
  dataVenda: string | null;
  statusGeral: string | null; // em_andamento | concluido | stand_by …
  tipoServico: string | null;
  propostaId: string | null;
};

// Proposta / orçamento comercial (tabela proposals) — forecast.
export type Proposta = {
  id: string;
  numero: number | null;
  cliente: string | null;
  status: string | null; // enviada | aceita | rejeitada …
  classificacao: string | null; // residencial | comercial …
  kwp: number | null;
  geracaoKwh: number | null;
  valorTotal: number;
  valorKit: number;
  valorServico: number;
  data: string | null;
  negocioId: string | null;
};

// Item do funil de pós-venda (tabela pos_venda).
export type PosVendaFunil = {
  id: string;
  projetoId: string | null;
  cliente: string | null;
  potenciaKwp: number | null;
  status: string | null; // clientes_novos | em_contato | ativo …
  clienteAtivo: boolean;
};

export type ProjetosFull = {
  servicos: ServicoOS[];
  projetos: ProjetoFechado[];
  propostas: Proposta[];
  posVendaFunil: PosVendaFunil[];
  fetchedAt: string;
  stale?: boolean;
};

function dateOnly(v: unknown): string | null {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
    tecnico: null,
    status: (s.status as string)?.trim() || null,
    potenciaKwp: numOrNull(s.potencia_kwp),
    proximaAtividade: dateOnly(s.proxima_atividade_data),
    origem: (s.origem as string)?.trim() || null,
  };
}
function rowToProjeto(p: Record<string, unknown>): ProjetoFechado {
  return {
    id: String(p.id),
    cliente: (p.cliente_nome as string)?.trim() || null,
    potenciaKwp: numOrNull(p.potencia_kwp),
    dataFechamento: dateOnly(p.data_fechamento),
    dataVenda: dateOnly(p.data_venda),
    statusGeral: (p.status_geral as string)?.trim() || null,
    tipoServico: (p.tipo_servico as string)?.trim() || null,
    propostaId: (p.proposta_id as string) || null,
  };
}
function rowToProposta(p: Record<string, unknown>): Proposta {
  return {
    id: String(p.id),
    numero: numOrNull(p.proposal_number),
    cliente: (p.client_name as string)?.trim() || null,
    status: (p.status as string)?.trim() || null,
    classificacao: (p.classification as string)?.trim() || null,
    kwp: numOrNull(p.kwp),
    geracaoKwh: numOrNull(p.generation_kwh),
    valorTotal: num(p.total_value),
    valorKit: num(p.kit_value),
    valorServico: num(p.service_value),
    data: dateOnly(p.proposal_date) ?? dateOnly(p.created_at),
    negocioId: (p.negocio_id as string) || null,
  };
}
function rowToPosVenda(p: Record<string, unknown>): PosVendaFunil {
  return {
    id: String(p.id),
    projetoId: (p.projeto_id as string) || null,
    cliente: (p.cliente_nome as string)?.trim() || null,
    potenciaKwp: numOrNull(p.potencia_kwp),
    status: (p.status as string)?.trim() || null,
    clienteAtivo: Boolean(p.cliente_ativo),
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

const TTL_MS = 10_000;
let cache: { data: ProjetosFull; ts: number } | null = null;
let inflight: Promise<ProjetosFull> | null = null;

export function projetosAgeSeconds(): number | null {
  return cache ? Math.round((Date.now() - cache.ts) / 1000) : null;
}

async function fetchLive(): Promise<ProjetosFull> {
  const email = deriveEmail();
  const password = process.env.ENERDY_PASS || "";
  if (!email || !password) throw new Error("Credenciais do projetos ausentes.");
  const sb = createClient(PROJ_URL, PROJ_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: authError } = await sb.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(`Login projetos falhou: ${authError.message}`);
  try {
    const q = sb as unknown as Queryable;
    const [servicos, projetos, proposals, posVenda] = await Promise.all([
      fetchAll(q, "pos_venda_servicos"),
      fetchAll(q, "projetos"),
      fetchAll(q, "proposals"),
      fetchAll(q, "pos_venda"),
    ]);
    return {
      servicos: servicos.map(servicoToOS),
      projetos: projetos.map(rowToProjeto),
      propostas: proposals.map(rowToProposta),
      posVendaFunil: posVenda.map(rowToPosVenda),
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    await sb.auth.signOut();
  }
}

// Lê ao vivo TODO o app projetos (4 tabelas, um login). Snapshot se não
// configurado; degrada para o último cache em falha.
export async function getLiveProjetosFull(opts?: { force?: boolean }): Promise<ProjetosFull | null> {
  if (!isProjetosConfigured()) return snapshotProjetosFull();
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

// Compatibilidade: só as OS de pós-venda (usado pelo painel de custeio).
export type ProjetosPosVenda = { servicos: ServicoOS[]; fetchedAt: string; stale?: boolean };
export async function getLiveProjetosPosVenda(opts?: { force?: boolean }): Promise<ProjetosPosVenda | null> {
  const full = await getLiveProjetosFull(opts);
  if (!full) return null;
  return { servicos: full.servicos, fetchedAt: full.fetchedAt, stale: full.stale };
}
