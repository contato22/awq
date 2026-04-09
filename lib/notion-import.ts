// ─── Notion Import Layer — Caza Vision ───────────────────────────────────────
//
// IMPORT-ONLY. Never called at runtime by UI pages.
// Called exclusively by POST /api/caza/import when the operator
// triggers a manual import from the Notion reference database.
//
// Token source: process.env.NOTION_TOKEN (primary)
//               process.env.NOTION_API_KEY (legacy fallback)
// Never hardcoded. Never logged. Never exposed in responses.

import { newProjectId, newClientId, type CazaProject, type CazaClient } from "@/lib/caza-db";

const NOTION_VERSION = "2022-06-28";
const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getToken(): string {
  const token = process.env.NOTION_TOKEN ?? process.env.NOTION_API_KEY ?? "";
  if (!token) throw new Error("NOTION_TOKEN not configured");
  return token;
}

async function queryDatabase(dbId: string): Promise<Record<string, unknown>[]> {
  const token = getToken();
  const results: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion API ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json() as { results: Record<string, unknown>[]; has_more: boolean; next_cursor: string | null };
    results.push(...json.results);
    cursor = json.has_more && json.next_cursor ? json.next_cursor : undefined;
  } while (cursor);

  return results;
}

// ─── Property extractors ──────────────────────────────────────────────────────

type Props = Record<string, Record<string, unknown>>;

function getTitle(props: Props, keys: string[]): string {
  for (const key of keys) {
    const p = props[key];
    if (!p) continue;
    if (p.type === "title") {
      const arr = p.title as { plain_text: string }[];
      return arr[0]?.plain_text ?? "";
    }
  }
  return "";
}

function getRichText(props: Props, keys: string[]): string {
  for (const key of keys) {
    const p = props[key];
    if (!p) continue;
    if (p.type === "rich_text") {
      const arr = p.rich_text as { plain_text: string }[];
      return arr[0]?.plain_text ?? "";
    }
  }
  return "";
}

function getNumber(props: Props, keys: string[]): number {
  for (const key of keys) {
    const p = props[key];
    if (!p) continue;
    if (p.type === "number" && p.number != null) return Number(p.number);
    if (p.type === "formula" && (p.formula as Record<string, unknown>)?.type === "number") {
      const n = (p.formula as Record<string, unknown>).number;
      if (n != null) return Number(n);
    }
  }
  // Partial-key fallback
  for (const [k, v] of Object.entries(props)) {
    const lower = k.toLowerCase();
    if (keys.some(key => lower.includes(key.toLowerCase()))) {
      if (v.type === "number" && v.number != null) return Number(v.number);
    }
  }
  return 0;
}

function getSelect(props: Props, keys: string[]): string {
  for (const key of keys) {
    const p = props[key];
    if (!p) continue;
    if (p.type === "select")       return (p.select as { name: string } | null)?.name ?? "";
    if (p.type === "multi_select") return ((p.multi_select as { name: string }[])[0])?.name ?? "";
    if (p.type === "status")       return (p.status as { name: string } | null)?.name ?? "";
  }
  return "";
}

function getDate(props: Props, keys: string[]): string {
  for (const key of keys) {
    const p = props[key];
    if (p?.type === "date") return (p.date as { start: string } | null)?.start ?? "";
  }
  return "";
}

function getCheckbox(props: Props, keys: string[]): boolean {
  for (const key of keys) {
    const p = props[key];
    if (p?.type === "checkbox") return Boolean(p.checkbox);
  }
  return false;
}

function getPerson(props: Props, keys: string[]): string {
  for (const key of keys) {
    const p = props[key];
    if (p?.type === "people") {
      const people = p.people as { name: string }[];
      return people[0]?.name ?? "";
    }
  }
  return "";
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export interface RawNotionProject {
  id: string;
  titulo: string;
  prioridade: string;
  diretor: string;
  prazo: string;
  recebimento: string;
  recebido: boolean;
  valor: number;
  alimentacao: number;
  gasolina: number;
  despesas: number;
  lucro: number;
  status: string;
  notion_page_id: string;
}

export function mapNotionProject(page: Record<string, unknown>): RawNotionProject {
  const p = page.properties as Props;
  const pageId = String(page.id ?? "");

  const recebido = getCheckbox(p, ["Recebido","Pago","Received","Concluido"]);
  const orcamento = getNumber(p, ["Orcamento","Orcamento","Valor","Budget","Price","orc","valor","budget"]);
  const alimentacao = getNumber(p, ["Alimentacao","Alimentacao","Aliment.","Alimentacoes","aliment"]);
  const gasolina = getNumber(p, ["Gasolina","Combustivel","Gas","Gasolina ","gasolin","combustiv"]);
  const despesas = alimentacao + gasolina;
  const lucro = orcamento - despesas;

  const diretor =
    getPerson(p, ["Responsavel","Assigned","Resp."]) ||
    getRichText(p, ["Responsavel","Diretor","Director"]);

  const status = recebido ? "Entregue" : (
    getSelect(p, ["Status","Stage"]) || "Em Produção"
  );

  return {
    id:            pageId,
    titulo:        getTitle(p,     ["Nome do projeto","Nome","Title","Titulo","Projeto"]) ||
                   getRichText(p,  ["Nome do projeto","Nome","Titulo","Projeto"]),
    prioridade:    getSelect(p,    ["Prioridade","Priority"]),
    diretor,
    prazo:         getDate(p,      ["COMPETENCIA","Competencia","Competencia","Prazo","Data","Due Date"]),
    recebimento:   getDate(p,      ["Recebimento","Data Recebimento","Payment Date"]),
    recebido,
    valor:         orcamento,
    alimentacao,
    gasolina,
    despesas,
    lucro,
    status,
    notion_page_id: pageId,
  };
}

export function mapNotionClient(page: Record<string, unknown>): Omit<CazaClient, "last_internal_update"> {
  const p = page.properties as Props;
  const pageId = String(page.id ?? "");

  return {
    id:                   newClientId(),
    name:                 getTitle(p,    ["Nome","Name","Title","Cliente"]) ||
                          getRichText(p, ["Nome","Name"]),
    email:                getRichText(p, ["Email","E-mail","email"]),
    phone:                getRichText(p, ["Telefone","Phone","Celular","Whatsapp"]),
    type:                 getSelect(p,   ["Tipo","Type","Perfil"]) || "Marca",
    budget_anual:         getNumber(p,   ["Budget Anual","Budget","Orcamento","Orcamento","Valor","budget","orcamento"]),
    status:               getSelect(p,   ["Status"]) || "Ativo",
    segmento:             getRichText(p, ["Segmento","Segment","Setor","Cidade"]) ||
                          getSelect(p,   ["Segmento","Segment","Setor"]),
    since:                getDate(p,     ["Data","Desde","Since","Cadastro"]),
    imported_from_notion: true,
    notion_page_id:       pageId,
    imported_at:          new Date().toISOString(),
    sync_status:          "imported" as const,
  };
}

// ─── Month aggregation ────────────────────────────────────────────────────────

export interface MonthlyFinancialRow {
  month: string;
  receita: number;
  alimentacao: number;
  gasolina: number;
  expenses: number;
  profit: number;
  orcamento: number;
}

function monthLabel(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  const m = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[m]}/${year.slice(2)}`;
}

function monthIndex(label: string): number {
  const [m, y] = label.split("/");
  return parseInt("20" + y, 10) * 12 + MONTH_NAMES.indexOf(m);
}

export function aggregateByMonth(projects: RawNotionProject[]): MonthlyFinancialRow[] {
  const map = new Map<string, MonthlyFinancialRow>();

  for (const p of projects) {
    if (!p.prazo) continue;
    const label = monthLabel(p.prazo);
    const acc = map.get(label) ?? {
      month: label, receita: 0, alimentacao: 0,
      gasolina: 0, expenses: 0, profit: 0, orcamento: 0,
    };
    acc.receita     += p.valor;
    acc.alimentacao += p.alimentacao;
    acc.gasolina    += p.gasolina;
    acc.expenses    += p.despesas;
    acc.profit      += p.lucro;
    acc.orcamento   += p.valor;
    map.set(label, acc);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => monthIndex(a) - monthIndex(b))
    .map(([, row]) => row);
}

// ─── Main import function ─────────────────────────────────────────────────────

export interface NotionImportData {
  projects: RawNotionProject[];
  clients:  Omit<CazaClient, "last_internal_update">[];
  errors:   string[];
}

export async function fetchFromNotion(opts: {
  projectsDbId?: string;
  clientsDbId?:  string;
}): Promise<NotionImportData> {
  const errors: string[] = [];
  const projects: RawNotionProject[] = [];
  const clients:  Omit<CazaClient, "last_internal_update">[] = [];

  if (opts.projectsDbId) {
    try {
      const pages = await queryDatabase(opts.projectsDbId);
      for (const page of pages) {
        try {
          projects.push(mapNotionProject(page));
        } catch (e) {
          errors.push(`Projeto ${page.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      errors.push(`Falha ao buscar projetos: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (opts.clientsDbId) {
    try {
      const pages = await queryDatabase(opts.clientsDbId);
      for (const page of pages) {
        try {
          clients.push(mapNotionClient(page));
        } catch (e) {
          errors.push(`Cliente ${page.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      errors.push(`Falha ao buscar clientes: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { projects, clients, errors };
}
