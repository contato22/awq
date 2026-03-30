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
  | { type: "number"; number: number | null }
  | { type: "title"; title: Array<{ plain_text: string }> }
  | { type: "rich_text"; rich_text: Array<{ plain_text: string }> }
  | { type: "select"; select: { name: string } | null }
  | { type: "date"; date: { start: string } | null };

function getProp(
  props: Record<string, NotionPropertyValue>,
  keys: string[],
  type: "number" | "title" | "rich_text" | "select" | "date"
): string | number | null {
  for (const key of keys) {
    const p = props[key];
    if (!p) continue;
    if (type === "number" && p.type === "number") return p.number ?? 0;
    if (type === "title" && p.type === "title") return p.title[0]?.plain_text ?? "";
    if (type === "rich_text" && p.type === "rich_text") return p.rich_text[0]?.plain_text ?? "";
    if (type === "select" && p.type === "select") return p.select?.name ?? "";
    if (type === "date" && p.type === "date") return p.date?.start ?? "";
  }
  return null;
}

function mapFinancial(page: { id: string; properties: Record<string, NotionPropertyValue> }) {
  const p = page.properties;
  return {
    month:     getProp(p, ["Mês", "Mes", "Month", "Nome", "Title"], "title") ?? "",
    receita:   getProp(p, ["Receita", "Revenue", "GCI", "Comissão", "Comissao"], "number") ?? 0,
    expenses:  getProp(p, ["Despesas", "Expenses", "Custos"], "number") ?? 0,
    profit:    getProp(p, ["Lucro", "Profit", "Resultado"], "number") ?? 0,
    orcamento: getProp(p, ["Orçamento", "Orcamento", "VPG", "Volume", "Budget"], "number") ?? 0,
  };
}

function mapProjeto(page: { id: string; properties: Record<string, NotionPropertyValue> }) {
  const p = page.properties;
  return {
    id:      page.id,
    titulo:  getProp(p, ["Título", "Titulo", "Nome", "Title", "Projeto"], "title") ?? "",
    cliente: getProp(p, ["Cliente", "Client", "Marca"], "rich_text") ?? "",
    tipo:    getProp(p, ["Tipo", "Type", "Categoria"], "select") ?? "Vídeo Publicitário",
    status:  getProp(p, ["Status", "Situação", "Situacao"], "select") ?? "Em Produção",
    valor:   getProp(p, ["Valor", "Value", "Budget", "Price"], "number") ?? 0,
    prazo:   getProp(p, ["Prazo", "Deadline", "Data Entrega"], "date") ?? "",
    diretor: getProp(p, ["Diretor", "Director", "Responsável", "Agente"], "rich_text") ?? "",
    inicio:  getProp(p, ["Início", "Inicio", "Start", "Data Início"], "date") ?? "",
  };
}

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
