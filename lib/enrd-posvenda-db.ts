// ─── ENRD · Pós-venda — DB (OS Tamara), config, import CSV e conciliação ─────
// Fato transacional (OS) NUNCA é estimado. Conciliação Tamara×gestão por cliente
// usa match EXATO normalizado; o que não casar vai para a fila "REVISAR".

import { erpAdmin, erpAnon } from "@/lib/supabase";
import { DEFAULT_POSVENDA_CONFIG, type PosVendaConfig } from "@/lib/enrd-posvenda-config";
import { getMontagemClientes } from "@/lib/enrd-montagem-db";
import type { OS } from "@/lib/enrd-posvenda-costing";

const OS_TABLE = "enrd_posvenda_os";
const CONFIG_TABLE = "enrd_posvenda_config";
const IMPORT_LOG_TABLE = "enrd_posvenda_import_log";

function db() {
  return erpAdmin ?? erpAnon;
}

// ── Normalização de datas (ISO + dd/mm/yyyy + dd/mm/yy) → AAAA-MM-DD ──────────
export function normalizeDate(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // ISO já
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // dd/mm/yyyy ou dd/mm/yy (ou com "-")
  const br = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (br) {
    const d = br[1].padStart(2, "0");
    const m = br[2].padStart(2, "0");
    let y = br[3];
    if (y.length === 2) y = `20${y}`;
    if (Number(m) >= 1 && Number(m) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      return `${y}-${m}-${d}`;
    }
  }
  return null; // não-parseável → descartar com aviso
}

// ── Parse de número pt-BR (R$ 1.234,56 | 1234,56 | 1234.56) ──────────────────
export function parseNumberBR(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  let s = String(raw).replace(/[R$\s]/g, "").trim();
  if (!s) return 0;
  if (s.includes(",")) {
    // formato pt-BR: ponto = milhar, vírgula = decimal
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// ── Normalização de nome (conciliação por cliente) ───────────────────────────
export function normalizeNome(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ── Parser de CSV (vírgula ou ponto-e-vírgula, com aspas) ─────────────────────
function splitCSVLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export type ParsedOS = OS & { raw: Record<string, unknown> };
export type ParseResult = { rows: ParsedOS[]; descartadas: number; avisos: string[] };

// Mapeia cabeçalhos flexíveis → campos. Tamara: data, cliente, cidade,
// tipo_servico, valor, custo_material, tecnico.
const HEADER_MAP: Record<string, keyof OS | "custoMaterial"> = {
  data: "data",
  cliente: "cliente",
  cidade: "cidade",
  municipio: "cidade",
  tipo_servico: "tipoServico",
  "tipo de servico": "tipoServico",
  servico: "tipoServico",
  tipo: "tipoServico",
  valor: "valor",
  valor_os: "valor",
  custo_material: "custoMaterial",
  material: "custoMaterial",
  tecnico: "tecnico",
  montador: "tecnico",
};

function stableId(o: OS): string {
  const base = `${o.data ?? ""}|${normalizeNome(o.cliente)}|${o.valor}|${normalizeNome(o.tipoServico)}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
  return `tamara-${(h >>> 0).toString(36)}`;
}

export function parseTamaraCSV(text: string): ParseResult {
  const avisos: string[] = [];
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], descartadas: 0, avisos: ["CSV vazio ou sem linhas de dados."] };

  const delim = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitCSVLine(lines[0], delim).map((h) => normalizeNome(h).replace(/\s+/g, "_"));
  const idx: Partial<Record<keyof OS | "custoMaterial", number>> = {};
  headers.forEach((h, i) => {
    const field = HEADER_MAP[h] ?? HEADER_MAP[h.replace(/_/g, " ")];
    if (field) idx[field] = i;
  });

  if (idx.valor == null || idx.cliente == null) {
    return { rows: [], descartadas: 0, avisos: [`Cabeçalho sem 'valor' e/ou 'cliente'. Colunas vistas: ${headers.join(", ")}`] };
  }

  const rows: ParsedOS[] = [];
  let descartadas = 0;
  for (let li = 1; li < lines.length; li++) {
    const cols = splitCSVLine(lines[li], delim);
    const get = (f: keyof OS | "custoMaterial") => (idx[f] != null ? cols[idx[f]!] : undefined);
    const data = normalizeDate(get("data"));
    const valor = parseNumberBR(get("valor"));
    const cliente = (get("cliente") || "").trim() || null;
    // Fato transacional: precisa de cliente E valor. Sem isso, descarta com aviso.
    if (!cliente || valor <= 0) {
      descartadas++;
      continue;
    }
    if (get("data") && !data) {
      avisos.push(`Linha ${li + 1}: data "${get("data")}" não-parseável — mantida vazia.`);
    }
    const os: OS = {
      id: "",
      data,
      cliente,
      cidade: (get("cidade") || "").trim() || null,
      tipoServico: (get("tipoServico") || "").trim() || null,
      valor,
      custoMaterial: parseNumberBR(get("custoMaterial")),
      tecnico: (get("tecnico") || "").trim() || null,
    };
    os.id = stableId(os);
    rows.push({ ...os, raw: Object.fromEntries(headers.map((h, i) => [h, cols[i]])) });
  }
  return { rows, descartadas, avisos };
}

// ── Conciliação Tamara × gestão (match exato normalizado por cliente) ─────────
export type ConciliacaoResult = {
  rows: (ParsedOS & { cliente_match: string | null; conciliacao: "OK" | "REVISAR" })[];
  ok: number;
  revisar: number;
};

export async function conciliar(rows: ParsedOS[]): Promise<ConciliacaoResult> {
  const clientes = await getMontagemClientes();
  const byNome = new Map<string, string>(); // nome normalizado → id gestão
  for (const c of clientes) {
    const n = normalizeNome(c.nome);
    if (n && !byNome.has(n)) byNome.set(n, c.id);
  }
  let ok = 0;
  let revisar = 0;
  const out = rows.map((r) => {
    const match = byNome.get(normalizeNome(r.cliente)) ?? null;
    const conciliacao: "OK" | "REVISAR" = match ? "OK" : "REVISAR";
    if (match) ok++;
    else revisar++;
    return { ...r, cliente_match: match, conciliacao };
  });
  return { rows: out, ok, revisar };
}

// ── Escrita ──────────────────────────────────────────────────────────────────
export async function upsertOS(rows: ConciliacaoResult["rows"]): Promise<number> {
  const client = db();
  if (!client || rows.length === 0) return 0;
  const payload = rows.map((r) => ({
    id: r.id,
    data: r.data,
    cliente: r.cliente,
    cidade: r.cidade,
    tipo_servico: r.tipoServico,
    valor: r.valor,
    custo_material: r.custoMaterial,
    tecnico: r.tecnico,
    cliente_match: r.cliente_match,
    conciliacao: r.conciliacao,
    fonte: "tamara",
    raw: r.raw,
    imported_at: new Date().toISOString(),
  }));
  const CHUNK = 500;
  let n = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error } = await client.from(OS_TABLE).upsert(slice, { onConflict: "id" });
    if (error) throw new Error(`upsert ${OS_TABLE}: ${error.message}`);
    n += slice.length;
  }
  return n;
}

export async function writeImportLog(entry: {
  ran_by?: string | null;
  linhas: number;
  descartadas: number;
  ok: boolean;
  detail?: string | null;
}): Promise<void> {
  const client = db();
  if (!client) return;
  await client.from(IMPORT_LOG_TABLE).insert({
    ran_by: entry.ran_by ?? null,
    linhas: entry.linhas,
    descartadas: entry.descartadas,
    ok: entry.ok,
    detail: entry.detail ?? null,
  });
}

// ── Leitura ──────────────────────────────────────────────────────────────────
export type StoredOS = OS & {
  cliente_match: string | null;
  conciliacao: "OK" | "REVISAR";
};

export async function getOS(): Promise<StoredOS[]> {
  try {
    const client = db();
    if (!client) return [];
    const { data, error } = await client.from(OS_TABLE).select("*").order("data", { ascending: false, nullsFirst: false });
    if (error) {
      console.warn("getOS:", error.message);
      return [];
    }
    return (data ?? []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      data: (r.data as string) ?? null,
      cliente: (r.cliente as string) ?? null,
      cidade: (r.cidade as string) ?? null,
      tipoServico: (r.tipo_servico as string) ?? null,
      valor: Number(r.valor ?? 0),
      custoMaterial: Number(r.custo_material ?? 0),
      tecnico: (r.tecnico as string) ?? null,
      cliente_match: (r.cliente_match as string) ?? null,
      conciliacao: (r.conciliacao as "OK" | "REVISAR") ?? "REVISAR",
    }));
  } catch (e) {
    console.warn("getOS exception:", (e as Error).message);
    return [];
  }
}

// ── Config (merge DEFAULT + override do banco) ───────────────────────────────
export async function getConfig(): Promise<PosVendaConfig> {
  try {
    const client = db();
    if (!client) return DEFAULT_POSVENDA_CONFIG;
    const { data, error } = await client.from(CONFIG_TABLE).select("config").eq("id", 1).maybeSingle();
    if (error || !data?.config) return DEFAULT_POSVENDA_CONFIG;
    return { ...DEFAULT_POSVENDA_CONFIG, ...(data.config as Partial<PosVendaConfig>) };
  } catch {
    return DEFAULT_POSVENDA_CONFIG;
  }
}

export async function saveConfig(config: PosVendaConfig, by?: string | null): Promise<void> {
  const client = db();
  if (!client) throw new Error("Banco indisponível.");
  const { error } = await client
    .from(CONFIG_TABLE)
    .upsert({ id: 1, config, updated_at: new Date().toISOString(), updated_by: by ?? null }, { onConflict: "id" });
  if (error) throw new Error(`saveConfig: ${error.message}`);
}

// KPI: OS de pós-venda não registradas no gestão (subnotificação esperada).
export function kpiSubnotificacao(os: StoredOS[]): { revisar: number; total: number; pct: number } {
  const revisar = os.filter((o) => o.conciliacao === "REVISAR").length;
  const total = os.length;
  return { revisar, total, pct: total > 0 ? revisar / total : 0 };
}
