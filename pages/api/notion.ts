import type { NextApiRequest, NextApiResponse } from "next";

const NOTION_VERSION = "2022-06-28";

async function queryDatabase(databaseId: string, apiKey: string) {
  const res = await fetch(
    `https://api.notion.com/v1/databases/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ page_size: 100 }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion ${res.status}: ${body}`);
  }
  return res.json();
}

type NotionPropertyValue =
  | { type: "number";    number: number | null }
  | { type: "title";     title: Array<{ plain_text: string }> }
  | { type: "rich_text"; rich_text: Array<{ plain_text: string }> }
  | { type: "select";    select: { name: string } | null }
  | { type: "date";      date: { start: string } | null }
  | { type: "checkbox";  checkbox: boolean }
  | { type: "people";    people: Array<{ id: string; name?: string; person?: { email?: string } }> }
  | { type: "formula";   formula: { type: string; number?: number; string?: string; boolean?: boolean } };

function getProp(
  props: Record<string, NotionPropertyValue>,
  keys: string[],
  type: "number" | "title" | "rich_text" | "select" | "date"
): string | number | null {
  for (const key of keys) {
    const p = props[key];
    if (!p) continue;
    if (type === "number" && p.type === "number") return p.number ?? 0;
    if (type === "number" && p.type === "formula" && p.formula.type === "number") return p.formula.number ?? 0;
    if (type === "title" && p.type === "title") return p.title[0]?.plain_text ?? "";
    if (type === "rich_text" && p.type === "rich_text") return p.rich_text[0]?.plain_text ?? "";
    if (type === "select" && p.type === "select") return p.select?.name ?? "";
    if (type === "date" && p.type === "date") return p.date?.start ?? "";
  }
  return null;
}

function getCheckbox(props: Record<string, NotionPropertyValue>, keys: string[]): boolean {
  for (const key of keys) {
    const p = props[key];
    if (p && p.type === "checkbox") return p.checkbox;
  }
  return false;
}

function getPeople(props: Record<string, NotionPropertyValue>, keys: string[]): string {
  for (const key of keys) {
    const p = props[key];
    if (p && p.type === "people" && p.people.length > 0) {
      return p.people[0].name ?? "";
    }
  }
  return "";
}

// ─── Financial mapper (P&L database) ─────────────────────────────────────────
function mapFinancial(page: { id: string; properties: Record<string, NotionPropertyValue> }) {
  const p = page.properties;
  return {
    month:     getProp(p, ["Mês", "Mes", "Month", "Nome", "Title", "Período", "Periodo"], "title") ?? "",
    receita:   getProp(p, ["Receita", "Revenue", "Faturamento", "Total Receita"], "number") ?? 0,
    expenses:  getProp(p, ["Despesas", "Expenses", "Custos", "Total Despesas"], "number") ?? 0,
    profit:    getProp(p, ["Lucro", "Profit", "Resultado", "Saldo"], "number") ?? 0,
    orcamento: getProp(p, ["Orçamento", "Orcamento", "VPG", "Volume", "Budget"], "number") ?? 0,
  };
}

// ─── Projects mapper — DATA BASE (real schema) ────────────────────────────────
// Columns: Nome do projeto (title), Prioridade (select), Responsável (people),
//          COMPETÊNCIA (date), Recebimento (date), Recebido (checkbox), Orçamento (number)
function mapProjeto(page: { id: string; properties: Record<string, NotionPropertyValue> }) {
  const p = page.properties;
  const recebido    = getCheckbox(p, ["Recebido", "Pago", "Received", "Concluído", "Concluido"]);
  const responsavel = getPeople(p, ["Responsável", "Responsavel", "Assigned", "Resp."]);
  const alimentacao = Number(getProp(p, ["Alimentação", "Alimentacao", "Alimentação ", "Aliment."], "number") ?? 0);
  const gasolina    = Number(getProp(p, ["Gasolina", "Combustível", "Combustivel", "Gas"], "number") ?? 0);
  const orcamento   = Number(getProp(p, ["Orçamento", "Orcamento", "Valor", "Budget", "Price"], "number") ?? 0);
  return {
    id:          page.id,
    titulo:      getProp(p, ["Nome do projeto", "Nome", "Title", "Título", "Projeto"], "title") ?? "",
    prioridade:  getProp(p, ["Prioridade", "Priority"], "select") ?? "",
    diretor:     responsavel || String(getProp(p, ["Responsável", "Responsavel", "Diretor"], "rich_text") ?? ""),
    prazo:       getProp(p, ["COMPETÊNCIA", "Competência", "Competencia", "Prazo", "Data", "Due Date"], "date") ?? "",
    recebimento: getProp(p, ["Recebimento", "Data Recebimento", "Payment Date"], "date") ?? "",
    recebido,
    valor:       orcamento,
    alimentacao,
    gasolina,
    despesas:    alimentacao + gasolina,
    lucro:       orcamento - alimentacao - gasolina,
    status:      recebido ? "Entregue" : "Em Produção",
  };
}

// ─── Clients mapper ───────────────────────────────────────────────────────────
function mapClient(page: { id: string; properties: Record<string, NotionPropertyValue> }) {
  const p = page.properties;
  return {
    id:           page.id,
    name:         getProp(p, ["Nome", "Name", "Title"], "title") ?? "",
    email:        getProp(p, ["Email", "E-mail"], "rich_text") ?? "",
    phone:        getProp(p, ["Telefone", "Phone", "Celular"], "rich_text") ?? "",
    type:         getProp(p, ["Tipo", "Type", "Perfil"], "select") ?? "Marca",
    budget_anual: getProp(p, ["Budget Anual", "Budget", "Orçamento", "Orcamento", "Valor"], "number") ?? 0,
    status:       getProp(p, ["Status"], "select") ?? "Ativo",
    segmento:     getProp(p, ["Segmento", "Segment", "Setor", "Cidade", "City"], "rich_text") ?? "",
    since:        getProp(p, ["Data", "Desde", "Since", "Cadastro"], "date") ?? "",
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const database = (req.query.database as string) ?? "financial";

  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ source: "mock", data: null, error: "NOTION_API_KEY não configurada" });
  }

  const envMap: Record<string, string | undefined> = {
    financial:  process.env.NOTION_DATABASE_ID_CAZA_FINANCIAL,
    properties: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES,
    clients:    process.env.NOTION_DATABASE_ID_CAZA_CLIENTS,
  };

  const dbId = envMap[database];
  if (!dbId) {
    return res.status(200).json({
      source: "mock",
      data: null,
      error: `NOTION_DATABASE_ID_CAZA_${database.toUpperCase()} não configurada`,
    });
  }

  try {
    const result = await queryDatabase(dbId, apiKey);
    const pages = result.results as Array<{ id: string; properties: Record<string, NotionPropertyValue> }>;

    const mappers: Record<string, (p: typeof pages[0]) => object> = {
      financial:  mapFinancial,
      properties: mapProjeto,
      clients:    mapClient,
    };

    const mapper = mappers[database] ?? mapFinancial;
    const data = pages.map(mapper);

    return res.status(200).json({ source: "notion", data, total: data.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return res.status(200).json({ source: "mock", data: null, error: message });
  }
}
