/**
 * fetch-notion-static.mjs
 * Run before `next build` when STATIC_EXPORT=1.
 * Fetches Notion databases and writes static JSON to public/data/.
 * GitHub Pages pages then read from /awq/data/*.json instead of /api/notion.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

const NOTION_VERSION = "2022-06-28";
const API_KEY        = process.env.NOTION_API_KEY;
const DB_PROPS       = process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES;
const DB_FIN         = process.env.NOTION_DATABASE_ID_CAZA_FINANCIAL;
const DB_CLI         = process.env.NOTION_DATABASE_ID_CAZA_CLIENTS;
const DB_VENTURE     = process.env.NOTION_DATABASE_ID_VENTURE_SALES;

const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// --- Notion helpers ---

async function queryDatabase(dbId) {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
          method: "POST",
          headers: {
                  Authorization: `Bearer ${API_KEY}`,
                  "Notion-Version": NOTION_VERSION,
                  "Content-Type": "application/json",
          },
          body: JSON.stringify({ page_size: 100 }),
    });
    if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`);
    return (await res.json()).results;
}

function getProp(props, keys, type) {
    for (const key of keys) {
          const p = props[key];
          if (!p) continue;
          if (type === "number"    && p.type === "number")    return p.number ?? 0;
          if (type === "number"    && p.type === "formula"  && p.formula.type === "number") return p.formula.number ?? 0;
          if (type === "title"     && p.type === "title")     return p.title[0]?.plain_text ?? "";
          if (type === "rich_text" && p.type === "rich_text") return p.rich_text[0]?.plain_text ?? "";
          if (type === "select"    && p.type === "select")    return p.select?.name ?? "";
          if (type === "date"      && p.type === "date")      return p.date?.start ?? "";
    }
    return null;
}

function getCheckbox(props, keys) {
    for (const key of keys) {
          const p = props[key];
          if (p && p.type === "checkbox") return p.checkbox;
    }
    return false;
}

function getPeople(props, keys) {
    for (const key of keys) {
          const p = props[key];
          if (p && p.type === "people" && p.people.length > 0) return p.people[0].name ?? "";
    }
    return "";
}

function getNumberByPartialKey(props, partials) {
    for (const key of Object.keys(props)) {
          const lower = key.toLowerCase();
          for (const partial of partials) {
                  if (lower.includes(partial.toLowerCase())) {
                            const p = props[key];
                            if (p && p.type === "number" && p.number != null) return p.number;
                  }
          }
    }
    return 0;
}

function monthLabel(isoDate) {
    const [year, month] = isoDate.split("-");
    return `${MONTH_NAMES[parseInt(month, 10) - 1]}/${year.slice(2)}`;
}

function monthIndex(label) {
    const [m, y] = label.split("/");
    return parseInt("20" + y, 10) * 12 + MONTH_NAMES.indexOf(m);
}

// --- Mappers ---

function mapProjeto(page) {
    const p = page.properties;

  // Debug: log all property names on first call
  if (!mapProjeto._logged) {
        mapProjeto._logged = true;
        console.log("DEBUG property names:", Object.keys(p).join(", "));
        for (const [k, v] of Object.entries(p)) {
                console.log(`  ${k}: type=${v.type}`);
        }
  }

  const recebido    = getCheckbox(p, ["Recebido", "Pago", "Received", "Concluido", "Concluido"]);
    const responsavel = getPeople(p, ["Responsavel", "Responsavel", "Assigned", "Resp."]);

  // Try exact names first, then partial match fallback
  const alimentacao = Number(
        getProp(p, ["Alimentacao", "Alimentacao", "Aliment.", "Alimentacoes"], "number") ??
        getNumberByPartialKey(p, ["aliment"]) ??
        0
      );
    const gasolina = Number(
          getProp(p, ["Gasolina", "Combustivel", "Combustivel", "Gas", "Gasolina "], "number") ??
          getNumberByPartialKey(p, ["gasolin", "combustiv"]) ??
          0
        );
    const orcamento = Number(
          getProp(p, ["Orcamento", "Orcamento", "Valor", "Budget", "Price", "Orcamento "], "number") ??
          getNumberByPartialKey(p, ["orc", "valor", "budget"]) ??
          0
        );

  return {
        id:          page.id,
        titulo:      getProp(p, ["Nome do projeto", "Nome", "Title", "Titulo", "Projeto"], "title") ?? "",
        prioridade:  getProp(p, ["Prioridade", "Priority"], "select") ?? "",
        diretor:     responsavel || String(getProp(p, ["Responsavel", "Responsavel", "Diretor"], "rich_text") ?? ""),
        prazo:       getProp(p, ["COMPETENCIA", "Competencia", "Competencia", "Prazo", "Data", "Due Date"], "date") ?? "",
        recebimento: getProp(p, ["Recebimento", "Data Recebimento", "Payment Date"], "date") ?? "",
        recebido,
        valor:       orcamento,
        alimentacao,
        gasolina,
        despesas:    alimentacao + gasolina,
        lucro:       orcamento - alimentacao - gasolina,
        status:      recebido ? "Entregue" : "Em Producao",
  };
}

function mapClient(page) {
    const p = page.properties;
    return {
          id:          page.id,
          name:        getProp(p, ["Nome", "Name", "Title"], "title") ?? "",
          email:       getProp(p, ["Email", "E-mail"], "rich_text") ?? "",
          phone:       getProp(p, ["Telefone", "Phone", "Celular"], "rich_text") ?? "",
          type:        getProp(p, ["Tipo", "Type", "Perfil"], "select") ?? "Marca",
          budget_anual: getProp(p, ["Budget Anual", "Budget", "Orcamento", "Orcamento", "Valor"], "number") ?? 0,
          status:      getProp(p, ["Status"], "select") ?? "Ativo",
          segmento:    getProp(p, ["Segmento", "Segment", "Setor", "Cidade", "City"], "rich_text") ?? "",
          since:       getProp(p, ["Data", "Desde", "Since", "Cadastro"], "date") ?? "",
    };
}

function aggregateByMonth(rows) {
    const map = new Map();
    for (const row of rows) {
          if (!row.prazo) continue;
          const label = monthLabel(String(row.prazo));
          const acc = map.get(label) ?? { receita: 0, alimentacao: 0, gasolina: 0, expenses: 0, profit: 0, orcamento: 0 };
          acc.receita    += row.valor;
          acc.alimentacao += row.alimentacao;
          acc.gasolina   += row.gasolina;
          acc.expenses   += row.despesas;
          acc.profit     += row.lucro;
          acc.orcamento  += row.valor;
          map.set(label, acc);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => monthIndex(a) - monthIndex(b))
      .map(([month, d]) => ({ month, ...d }));
}

// --- Venture Sales Mapper ---

async function queryAllPages(dbId) {
    const results = [];
    let cursor = undefined;
    do {
        const body = { page_size: 100 };
        if (cursor) body.start_cursor = cursor;
        const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`);
        const json = await res.json();
        results.push(...json.results);
        cursor = json.has_more ? json.next_cursor : undefined;
    } while (cursor);
    return results;
}

function getNum(props, keys) {
    for (const key of keys) {
        const p = props[key];
        if (!p) continue;
        if (p.type === "number") return p.number ?? 0;
        if (p.type === "formula" && p.formula?.type === "number") return p.formula.number ?? 0;
        if (p.type === "currency") return p.currency ?? 0;
    }
    return 0;
}

function getSel(props, keys) {
    for (const key of keys) {
        const p = props[key];
        if (!p) continue;
        if (p.type === "select")       return p.select?.name ?? "";
        if (p.type === "multi_select") return p.multi_select?.[0]?.name ?? "";
        if (p.type === "status")       return p.status?.name ?? "";
    }
    return "";
}

function getDate(props, keys) {
    for (const key of keys) {
        const p = props[key];
        if (p && p.type === "date") return p.date?.start ?? "";
    }
    return "";
}

function getText(props, keys) {
    for (const key of keys) {
        const p = props[key];
        if (!p) continue;
        if (p.type === "title")     return p.title?.[0]?.plain_text ?? "";
        if (p.type === "rich_text") return p.rich_text?.[0]?.plain_text ?? "";
    }
    return "";
}

function mapVentureSale(page) {
    const p = page.properties;

    // Debug first record
    if (!mapVentureSale._logged) {
        mapVentureSale._logged = true;
        console.log("  [venture] property names:", Object.keys(p).join(", "));
        for (const [k, v] of Object.entries(p)) {
            console.log(`    ${k}: ${v.type}`);
        }
    }

    const nome      = getText(p, ["Nome", "Name", "Title", "Cliente", "Título", "Titulo", "Company"]);
    const valor     = getNum(p,  ["Valor", "Value", "Amount", "Receita", "Fechado", "Valor Fechado",
                                  "Valor Total", "Total", "MRR", "ARR", "Faturamento"]);
    const categoria = getSel(p,  ["Categoria", "Category", "Tipo", "Produto", "Tag", "Tags",
                                  "Tipo de Serviço", "Tipo de Servico", "Serviço", "Servico"]);
    const canal     = getSel(p,  ["Canal", "Canal de Aquisição", "Canal de Aquisicao", "Origem",
                                  "Source", "Indicação", "Indicacao", "Lead Source", "Canal Lead"]);
    const status    = getSel(p,  ["Status", "Stage", "Etapa"]);
    const data      = getDate(p, ["Data", "Date", "Data Fechamento", "Fechamento", "Data de Fechamento",
                                  "COMPETENCIA", "Competência", "Competencia", "Mês", "Mes"]);

    return { id: page.id, nome, valor, categoria, canal, status, data };
}

function aggregateVenture(rows) {
    // Totals by category
    const byCategoria = {};
    const byCanal     = {};
    const byQuarter   = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const byQCat      = { Q1: {}, Q2: {}, Q3: {}, Q4: {} };
    let totalFechado  = 0;
    let totalLeads    = 0;

    for (const r of rows) {
        const v = r.valor ?? 0;
        const cat = r.categoria || "Sem categoria";
        byCategoria[cat] = (byCategoria[cat] ?? 0) + v;

        const canal = r.canal || "Não informado";
        if (!byCanal[canal]) byCanal[canal] = { leads: 0, valor: 0 };
        byCanal[canal].leads++;
        byCanal[canal].valor += v;

        if (r.data) {
            const month = parseInt((r.data || "").split("-")[1] || "0", 10);
            const q = month <= 3 ? "Q1" : month <= 6 ? "Q2" : month <= 9 ? "Q3" : "Q4";
            byQuarter[q] = (byQuarter[q] ?? 0) + v;
            byQCat[q][cat] = (byQCat[q][cat] ?? 0) + v;
        }

        if (r.status && /fech|won|ganho|pago|ativo/i.test(r.status)) {
            totalFechado += v;
        }
        totalLeads++;
    }

    const totalValor = Object.values(byCanal).reduce((s, c) => s + c.valor, 0);

    return {
        rows,
        totalFechado,
        totalLeads,
        byCategoria,
        byCanal: Object.entries(byCanal)
            .sort((a, b) => b[1].leads - a[1].leads)
            .map(([canal, d]) => ({
                canal,
                leads: d.leads,
                valor: d.valor,
                pct: totalLeads > 0 ? Math.round((d.leads / totalLeads) * 100) : 0,
            })),
        byQuarter,
        byQCat,
    };
}

// --- Main ---

function write(filename, data) {
    const path = join(OUT_DIR, filename);
    writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
    console.log(` OK ${filename} (${Array.isArray(data) ? data.length : Object.keys(data).length} records)`);
}

async function main() {
    if (!API_KEY) {
          console.warn("NOTION_API_KEY not set -- skipping Notion fetch, pages will use mock data.");
          mkdirSync(OUT_DIR, { recursive: true });
          write("caza-properties.json", []);
          write("caza-financial.json", []);
          write("caza-clients.json", []);
          write("venture-sales.json", { rows: [], totalFechado: 0, totalLeads: 0, byCategoria: {}, byCanal: [], byQuarter: {}, byQCat: {} });
          return;
    }

  mkdirSync(OUT_DIR, { recursive: true });
    console.log("Fetching Notion data for static export...");

  // Properties / Projects
  if (DB_PROPS) {
        const pages = await queryDatabase(DB_PROPS);
        const projetos = pages.map(mapProjeto);
        write("caza-properties.json", projetos);
  } else {
        console.warn(" NOTION_DATABASE_ID_CAZA_PROPERTIES not set");
        write("caza-properties.json", []);
  }

  // Financial (same DB as properties -- aggregate by month)
  // Falls back to properties DB if NOTION_DATABASE_ID_CAZA_FINANCIAL is not set
  const finDb = DB_FIN || DB_PROPS;
  if (finDb) {
        const pages = await queryDatabase(finDb);
        const projetos = pages.map(mapProjeto);
        const monthly = aggregateByMonth(projetos);
        write("caza-financial.json", monthly);
  } else {
        console.warn(" NOTION_DATABASE_ID_CAZA_FINANCIAL and NOTION_DATABASE_ID_CAZA_PROPERTIES not set");
        write("caza-financial.json", []);
  }

  // Clients
  if (DB_CLI) {
        const pages = await queryDatabase(DB_CLI);
        const clients = pages.map(mapClient);
        write("caza-clients.json", clients);
  } else {
        console.warn(" NOTION_DATABASE_ID_CAZA_CLIENTS not set");
        write("caza-clients.json", []);
  }

  // AWQ Venture Sales
  if (DB_VENTURE) {
        console.log("Fetching AWQ Venture sales database...");
        const pages = await queryAllPages(DB_VENTURE);
        const rows  = pages.map(mapVentureSale);
        const agg   = aggregateVenture(rows);
        write("venture-sales.json", agg);
  } else {
        console.warn(" NOTION_DATABASE_ID_VENTURE_SALES not set");
        write("venture-sales.json", { rows: [], totalFechado: 0, totalLeads: 0, byCategoria: {}, byCanal: [], byQuarter: {}, byQCat: {} });
  }

  console.log("Done.");
}

main().catch((err) => {
    console.error("fetch-notion-static failed:", err.message);
    process.exit(0);
});
