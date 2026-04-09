/**
 * fetch-notion-static.mjs
 * Run before `next build` when STATIC_EXPORT=1.
 * Fetches Notion databases and writes static JSON to public/data/.
 * GitHub Pages pages then read from /awq/data/*.json instead of /api/notion.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "data");

const NOTION_VERSION = "2022-06-28";
const API_KEY        = process.env.NOTION_TOKEN ?? process.env.NOTION_API_KEY;
const DB_PROPS       = process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES;
const DB_FIN         = process.env.NOTION_DATABASE_ID_CAZA_FINANCIAL;
const DB_CLI         = process.env.NOTION_DATABASE_ID_CAZA_CLIENTS;
const DB_VENTURE     = process.env.NOTION_DATABASE_ID_VENTURE_SALES;
const DATABASE_URL   = process.env.DATABASE_URL;

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

// --- Neon DB export (preferred over Notion for static export) ---

async function exportFromNeon() {
    try {
        const { neon } = await import("@neondatabase/serverless");
        const sql = neon(DATABASE_URL);

        const MONTH_NAMES_LOCAL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

        // Projects
        const projects = await sql`SELECT * FROM caza_projects ORDER BY prazo DESC`;
        const projetoRows = projects.map(p => ({
            id:          p.id,
            titulo:      p.titulo ?? "",
            prioridade:  p.prioridade ?? "",
            diretor:     p.diretor ?? "",
            prazo:       p.prazo ?? "",
            recebimento: p.recebimento ?? "",
            recebido:    p.recebido ?? false,
            valor:       Number(p.valor ?? 0),
            alimentacao: Number(p.alimentacao ?? 0),
            gasolina:    Number(p.gasolina ?? 0),
            despesas:    Number(p.despesas ?? 0),
            lucro:       Number(p.lucro ?? 0),
            status:      p.status ?? "",
            tipo:        p.tipo ?? "",
        }));

        // Financial aggregation
        const monthMap = new Map();
        for (const p of projetoRows) {
            if (!p.prazo) continue;
            const parts = p.prazo.split("-");
            const m     = parseInt(parts[1], 10) - 1;
            const label = `${MONTH_NAMES_LOCAL[m]}/${parts[0].slice(2)}`;
            const acc   = monthMap.get(label) ?? { month: label, receita: 0, alimentacao: 0, gasolina: 0, expenses: 0, profit: 0, orcamento: 0 };
            acc.receita     += p.valor;
            acc.alimentacao += p.alimentacao;
            acc.gasolina    += p.gasolina;
            acc.expenses    += p.despesas;
            acc.profit      += p.lucro;
            acc.orcamento   += p.valor;
            monthMap.set(label, acc);
        }
        const financialRows = Array.from(monthMap.values())
            .sort((a, b) => {
                const [ma, ya] = a.month.split("/");
                const [mb, yb] = b.month.split("/");
                const ia = parseInt("20" + ya, 10) * 12 + MONTH_NAMES_LOCAL.indexOf(ma);
                const ib = parseInt("20" + yb, 10) * 12 + MONTH_NAMES_LOCAL.indexOf(mb);
                return ia - ib;
            });

        // Clients
        const clients = await sql`SELECT * FROM caza_clients ORDER BY name`;
        const clientRows = clients.map(c => ({
            id:           c.id,
            name:         c.name ?? "",
            email:        c.email ?? "",
            phone:        c.phone ?? "",
            type:         c.type ?? "",
            budget_anual: Number(c.budget_anual ?? 0),
            status:       c.status ?? "",
            segmento:     c.segmento ?? "",
            since:        c.since ?? "",
        }));

        // Stats payload
        const activeProjects    = projetoRows.filter(p => !p.recebido).length;
        const deliveredProjects = projetoRows.filter(p => p.recebido).length;
        const currentYear       = new Date().getFullYear();
        const receitaYtd        = projetoRows
            .filter(p => p.prazo.startsWith(String(currentYear)))
            .reduce((s, p) => s + p.valor, 0);
        const ticketMedio       = projetoRows.length > 0
            ? Math.round(projetoRows.reduce((s, p) => s + p.valor, 0) / projetoRows.length)
            : 0;
        const stageMap = new Map();
        for (const p of projetoRows) {
            const stage = p.status || "Em Produção";
            stageMap.set(stage, (stageMap.get(stage) ?? 0) + 1);
        }
        const typeMap2 = new Map();
        for (const p of projetoRows) {
            const tipo = p.tipo || "Outros";
            const acc  = typeMap2.get(tipo) ?? { projetos: 0, receita: 0 };
            acc.projetos++;
            acc.receita += p.valor;
            typeMap2.set(tipo, acc);
        }
        const statsPayload = {
            kpis: [
                { id: "projetos",  label: "Projetos Ativos",    value: activeProjects,    unit: "number",   icon: "Building2",     color: "emerald" },
                { id: "receita",   label: "Receita YTD",         value: receitaYtd,        unit: "currency", icon: "DollarSign",    color: "brand"   },
                { id: "entregues", label: "Projetos Entregues",  value: deliveredProjects, unit: "number",   icon: "HandshakeIcon", color: "violet"  },
                { id: "ticket",    label: "Ticket Médio",        value: ticketMedio,       unit: "currency", icon: "TrendingUp",    color: "amber"   },
            ],
            revenueData: financialRows.slice(-12).map(r => ({
                month: r.month, receita: r.receita, expenses: r.expenses, profit: r.profit, orcamento: r.orcamento,
            })),
            pipeline: Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count })),
            projectTypeRevenue: Array.from(typeMap2.entries()).map(([type, d]) => ({
                type, projetos: d.projetos, receita: d.receita,
                avgValue: d.projetos > 0 ? Math.round(d.receita / d.projetos) : 0,
            })),
            source: "internal",
        };

        return { projetoRows, financialRows, clientRows, statsPayload };
    } catch (err) {
        console.warn("  Neon export failed:", err.message, "— falling back to Notion");
        return null;
    }
}

// --- Main ---

function write(filename, data, { skipIfExists = false } = {}) {
    const path = join(OUT_DIR, filename);
    if (skipIfExists && existsSync(path)) {
        console.log(` SKIP ${filename} (already exists, keeping committed version)`);
        return;
    }
    writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
    console.log(` OK ${filename} (${Array.isArray(data) ? data.length : Object.keys(data).length} records)`);
}

// ── JACQES KPIs ── mirrors lib/awq-group-data.ts buData["jacqes"] ──
// Source: awq-group-data.ts (Mar/2026 empirical snapshot)
// NOTE: no app component currently reads this file — kept as a seed/fallback
// for future consumers. Update whenever buData["jacqes"] changes.
// Gross margin = grossProfit (2,892,000) / revenue (4,820,000) = 60.0%
const JACQES_KPIS = {
    revenue:      4_820_000,
    customers:    10,
    margin:       60.0,
    receita_fmt:  "R$ 4.820.000",
    clientes_fmt: "10",
    margem_fmt:   "60.0%",
    periodo:      "Mar/2026",
    lastUpdated:  new Date().toISOString(),
};

// --- Stats builder (used for both Notion path and as fallback) ---

function buildStatsFromProjects(projects) {
    const MN = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const currentYear = new Date().getFullYear();

    const activeProjects    = projects.filter(p => !p.recebido).length;
    const deliveredProjects = projects.filter(p => p.recebido).length;
    const receitaYtd        = projects
        .filter(p => p.prazo && p.prazo.startsWith(String(currentYear)))
        .reduce((s, p) => s + (p.valor ?? 0), 0);
    const ticketMedio       = projects.length > 0
        ? Math.round(projects.reduce((s, p) => s + (p.valor ?? 0), 0) / projects.length)
        : 0;

    const stageMap = new Map();
    const typeMap  = new Map();
    const monthMap = new Map();

    for (const p of projects) {
        const stage = p.status || "Em Produção";
        stageMap.set(stage, (stageMap.get(stage) ?? 0) + 1);

        const tipo = p.tipo || "Outros";
        const t    = typeMap.get(tipo) ?? { projetos: 0, receita: 0 };
        t.projetos++; t.receita += (p.valor ?? 0);
        typeMap.set(tipo, t);

        if (p.prazo) {
            const parts = p.prazo.split("-");
            const m     = parseInt(parts[1], 10) - 1;
            const label = `${MN[m]}/${parts[0].slice(2)}`;
            const acc   = monthMap.get(label) ?? { month: label, receita: 0, expenses: 0, profit: 0, orcamento: 0 };
            acc.receita   += (p.valor    ?? 0);
            acc.expenses  += (p.despesas ?? 0);
            acc.profit    += (p.lucro    ?? 0);
            acc.orcamento += (p.valor    ?? 0);
            monthMap.set(label, acc);
        }
    }

    const revenueData = Array.from(monthMap.values())
        .sort((a, b) => {
            const [ma, ya] = a.month.split("/");
            const [mb, yb] = b.month.split("/");
            return (parseInt("20"+ya,10)*12 + MN.indexOf(ma)) - (parseInt("20"+yb,10)*12 + MN.indexOf(mb));
        })
        .slice(-12);

    return {
        kpis: [
            { id: "projetos",  label: "Projetos Ativos",   value: activeProjects,    unit: "number",   icon: "Building2",     color: "emerald" },
            { id: "receita",   label: "Receita YTD",        value: receitaYtd,        unit: "currency", icon: "DollarSign",    color: "brand"   },
            { id: "entregues", label: "Projetos Entregues", value: deliveredProjects, unit: "number",   icon: "HandshakeIcon", color: "violet"  },
            { id: "ticket",    label: "Ticket Médio",       value: ticketMedio,       unit: "currency", icon: "TrendingUp",    color: "amber"   },
        ],
        revenueData,
        pipeline: Array.from(stageMap.entries()).map(([stage, count]) => ({ stage, count })),
        projectTypeRevenue: Array.from(typeMap.entries()).map(([type, d]) => ({
            type, projetos: d.projetos, receita: d.receita,
            avgValue: d.projetos > 0 ? Math.round(d.receita / d.projetos) : 0,
        })),
        source: projects.length > 0 ? "notion" : "empty",
    };
}

const EMPTY_VENTURE = { rows: [], totalFechado: 0, totalLeads: 0, byCategoria: {}, byCanal: [], byQuarter: {}, byQCat: {} };
const EMPTY_STATS   = { kpis: [], revenueData: [], pipeline: [], projectTypeRevenue: [], source: "empty" };

async function main() {
    mkdirSync(OUT_DIR, { recursive: true });

    // ── 1. Try Neon DB (canonical source of truth) ─────────────────────────────
    if (DATABASE_URL) {
        console.log("[1/3] DATABASE_URL found — exporting from Neon DB...");
        const neonData = await exportFromNeon();
        if (neonData) {
            write("caza-properties.json", neonData.projetoRows);
            write("caza-financial.json",  neonData.financialRows);
            write("caza-clients.json",    neonData.clientRows);
            write("caza-stats.json",      neonData.statsPayload);
            console.log(`  Neon: ${neonData.projetoRows.length} projects, ${neonData.clientRows.length} clients`);

            // Venture from Notion (independent of Caza data)
            if (DB_VENTURE && API_KEY) {
                try {
                    const pages = await queryAllPages(DB_VENTURE);
                    write("venture-sales.json", aggregateVenture(pages.map(mapVentureSale)));
                } catch (err) {
                    console.warn("  Venture fetch failed:", err.message);
                    write("venture-sales.json", EMPTY_VENTURE, { skipIfExists: true });
                }
            } else {
                write("venture-sales.json", EMPTY_VENTURE, { skipIfExists: true });
            }
            write("jacqes-kpis.json", JACQES_KPIS);
            console.log("[1/3] Done — Neon export complete.");
            return;
        }
        console.warn("  Neon export returned null — falling back to Notion.");
    }

    // ── 2. Try Notion (reference/import source) ─────────────────────────────────
    if (!API_KEY) {
        console.warn("[2/3] No NOTION_TOKEN / NOTION_API_KEY and no DATABASE_URL.");
        console.warn("      Writing empty Caza JSONs. Configure secrets to populate data.");
        write("caza-properties.json", []);
        write("caza-financial.json",  []);
        write("caza-clients.json",    []);
        write("caza-stats.json",      EMPTY_STATS);
        write("venture-sales.json",   EMPTY_VENTURE, { skipIfExists: true });
        write("jacqes-kpis.json",     JACQES_KPIS);
        return;
    }

    console.log("[2/3] Fetching from Notion (NOTION_TOKEN / NOTION_API_KEY)...");
    let cazaProjects = [];

    // Properties / Projects — isolated catch: one DB failure doesn't kill others
    if (DB_PROPS) {
        try {
            const pages  = await queryDatabase(DB_PROPS);
            cazaProjects = pages.map(mapProjeto);
            write("caza-properties.json", cazaProjects);
            console.log(`  OK caza-properties: ${cazaProjects.length} records`);
        } catch (err) {
            console.error(`  ERR caza-properties: ${err.message}`);
            write("caza-properties.json", []);
        }
    } else {
        console.warn("  NOTION_DATABASE_ID_CAZA_PROPERTIES not set — writing empty");
        write("caza-properties.json", []);
    }

    // Financial — isolated catch
    if (DB_FIN) {
        try {
            // DB_FIN is often the same as DB_PROPS; if so, reuse cazaProjects
            const projetos = DB_FIN === DB_PROPS && cazaProjects.length > 0
                ? cazaProjects
                : (await queryDatabase(DB_FIN)).map(mapProjeto);
            write("caza-financial.json", aggregateByMonth(projetos));
            console.log(`  OK caza-financial: ${projetos.length} source records`);
        } catch (err) {
            console.error(`  ERR caza-financial: ${err.message}`);
            write("caza-financial.json", []);
        }
    } else {
        console.warn("  NOTION_DATABASE_ID_CAZA_FINANCIAL not set — writing empty");
        write("caza-financial.json", []);
    }

    // Clients — isolated catch
    if (DB_CLI) {
        try {
            const pages   = await queryDatabase(DB_CLI);
            const clients = pages.map(mapClient);
            write("caza-clients.json", clients);
            console.log(`  OK caza-clients: ${clients.length} records`);
        } catch (err) {
            console.error(`  ERR caza-clients: ${err.message}`);
            write("caza-clients.json", []);
        }
    } else {
        console.warn("  NOTION_DATABASE_ID_CAZA_CLIENTS not set — writing empty");
        write("caza-clients.json", []);
    }

    // Stats — computed from real project data (not hardcoded empty)
    write("caza-stats.json", buildStatsFromProjects(cazaProjects));
    console.log(`  OK caza-stats: source=${cazaProjects.length > 0 ? "notion" : "empty"}`);

    // Venture — isolated catch
    if (DB_VENTURE) {
        try {
            console.log("  Fetching AWQ Venture sales database...");
            const pages = await queryAllPages(DB_VENTURE);
            write("venture-sales.json", aggregateVenture(pages.map(mapVentureSale)));
        } catch (err) {
            console.error(`  ERR venture-sales: ${err.message}`);
            write("venture-sales.json", EMPTY_VENTURE, { skipIfExists: true });
        }
    } else {
        write("venture-sales.json", EMPTY_VENTURE, { skipIfExists: true });
    }

    write("jacqes-kpis.json", JACQES_KPIS);
    console.log("[2/3] Done — Notion export complete.");
}

main().catch((err) => {
    // Unhandled error — write safe fallbacks so next build doesn't 404
    console.error("fetch-notion-static FATAL:", err.message);
    mkdirSync(OUT_DIR, { recursive: true });
    try { write("caza-properties.json", []); } catch (_) {}
    try { write("caza-financial.json",  []); } catch (_) {}
    try { write("caza-clients.json",    []); } catch (_) {}
    try { write("caza-stats.json",      EMPTY_STATS); } catch (_) {}
    try { write("jacqes-kpis.json",     JACQES_KPIS); } catch (_) {}
    console.warn("  Wrote empty fallbacks so build can continue.");
    process.exit(0);   // allow build to continue with empty data (shows empty state, not 404)
});
