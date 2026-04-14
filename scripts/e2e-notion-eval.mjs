/**
 * e2e-notion-eval.mjs
 * Análise avaliativa de ponta a ponta — Integração Notion → Caza Vision
 *
 * Testa:
 *   1. Conectividade e autenticação com a API Notion
 *   2. Acessibilidade dos 3 bancos de dados (Properties, Financial/Projects, Clients)
 *   3. Qualidade e completude dos dados (campos obrigatórios, tipos, nulos)
 *   4. Lógica de mapeamento (property extractors)
 *   5. Relatório final com score de saúde
 *
 * Uso: node scripts/e2e-notion-eval.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Carrega .env.local manualmente ────────────────────────────────────────────
function loadEnv() {
  const envPath = join(__dirname, "..", ".env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = process.env[key] ?? val;
    }
  } catch {
    // sem .env.local — usa variáveis do ambiente
  }
}

loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────
const TOKEN   = process.env.NOTION_TOKEN ?? process.env.NOTION_API_KEY ?? "";
const VERSION = "2022-06-28";

const DB_IDS = {
  properties: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "308e2d13-dfa9-433e-a0f6-8439b5181845",
  financial:  process.env.NOTION_DATABASE_ID_CAZA_FINANCIAL  ?? "9a8329e9-6d19-4bdc-8e80-2d59a2658be7",
  clients:    process.env.NOTION_DATABASE_ID_CAZA_CLIENTS    ?? "ca1ba0fe-3d47-4356-8643-23a223a4e710",
};

// ── Terminal helpers ──────────────────────────────────────────────────────────
const c = {
  reset:  "\x1b[0m",
  bold:   "\x1b[1m",
  red:    "\x1b[31m",
  green:  "\x1b[32m",
  yellow: "\x1b[33m",
  cyan:   "\x1b[36m",
  gray:   "\x1b[90m",
};

function header(title) {
  const line = "─".repeat(60);
  console.log(`\n${c.cyan}${c.bold}${line}`);
  console.log(`  ${title}`);
  console.log(`${line}${c.reset}`);
}

function ok(msg)   { console.log(`  ${c.green}✓${c.reset}  ${msg}`); }
function fail(msg) { console.log(`  ${c.red}✗${c.reset}  ${msg}`); }
function warn(msg) { console.log(`  ${c.yellow}⚠${c.reset}  ${msg}`); }
function info(msg) { console.log(`  ${c.gray}ℹ${c.reset}  ${msg}`); }

// ── Notion helpers ────────────────────────────────────────────────────────────
async function notionRequest(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Notion-Version": VERSION,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://api.notion.com/v1${path}`, opts);
  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

async function queryAll(dbId) {
  const results = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const { ok: isOk, status, data } = await notionRequest(`/databases/${dbId}/query`, "POST", body);
    if (!isOk) throw new Error(`HTTP ${status}: ${JSON.stringify(data).slice(0, 200)}`);
    results.push(...data.results);
    cursor = data.has_more && data.next_cursor ? data.next_cursor : null;
  } while (cursor);
  return results;
}

// ── Property extractors (mirrors lib/notion-import.ts) ───────────────────────
function getTitle(props, keys) {
  for (const k of keys) {
    const p = props[k];
    if (p?.type === "title") return p.title.map(t => t.plain_text).join("").trim();
  }
  return "";
}

function getRichText(props, keys) {
  for (const k of keys) {
    const p = props[k];
    if (p?.type === "rich_text") return p.rich_text.map(t => t.plain_text).join("").trim();
  }
  return "";
}

function getNumber(props, keys) {
  for (const k of keys) {
    const p = props[k];
    if (p?.type === "number") return p.number ?? 0;
    if (p?.type === "formula" && p.formula?.type === "number") return p.formula.number ?? 0;
  }
  return 0;
}

function getSelect(props, keys) {
  for (const k of keys) {
    const p = props[k];
    if (p?.type === "select") return p.select?.name ?? "";
  }
  return "";
}

function getDate(props, keys) {
  for (const k of keys) {
    const p = props[k];
    if (p?.type === "date") return p.date?.start ?? "";
  }
  return "";
}

function getCheckbox(props, keys) {
  for (const k of keys) {
    const p = props[k];
    if (p?.type === "checkbox") return p.checkbox;
  }
  return false;
}

function getPeople(props, keys) {
  for (const k of keys) {
    const p = props[k];
    if (p?.type === "people" && p.people.length > 0) return p.people[0].name ?? "";
  }
  return "";
}

// ── Data quality helpers ──────────────────────────────────────────────────────
function pct(n, total) {
  if (total === 0) return "N/A";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function scoreBar(ratio) {
  const filled = Math.round(ratio * 20);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);
  const color = ratio >= 0.8 ? c.green : ratio >= 0.5 ? c.yellow : c.red;
  return `${color}${bar}${c.reset} ${(ratio * 100).toFixed(0)}%`;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

const results = { passed: 0, failed: 0, warned: 0 };

function pass(label) { ok(label); results.passed++; }
function flunk(label) { fail(label); results.failed++; }
function caution(label) { warn(label); results.warned++; }

// 1. TOKEN
async function testToken() {
  header("1 · Autenticação — Token Notion");

  if (!TOKEN) { flunk("NOTION_TOKEN / NOTION_API_KEY não configurado"); return false; }

  const prefix = TOKEN.slice(0, 8);
  info(`Token detectado: ${prefix}... (${TOKEN.length} chars)`);

  if (TOKEN.startsWith("ntn_")) {
    pass("Formato do token correto (ntn_ — novo padrão Notion)");
  } else if (TOKEN.startsWith("secret_")) {
    caution("Token no formato legado (secret_) — funciona, mas atualize para ntn_");
  } else {
    caution(`Prefixo incomum: ${prefix}...`);
  }

  // Valida via /users/me
  const { ok: isOk, status, data } = await notionRequest("/users/me");
  if (isOk) {
    pass(`API autenticada com sucesso — usuário: ${data.name ?? data.id} (${data.type})`);
    info(`Bot integrado em workspace: ${data.bot?.workspace_name ?? "(desconhecido)"}`);
    return true;
  } else {
    flunk(`Falha na autenticação: HTTP ${status} — ${data.message ?? JSON.stringify(data)}`);
    return false;
  }
}

// 2. DATABASE ACCESS
async function testDatabases() {
  header("2 · Acesso aos Bancos de Dados Notion");

  const accessible = {};
  for (const [name, id] of Object.entries(DB_IDS)) {
    const { ok: isOk, status, data } = await notionRequest(`/databases/${id}`);
    if (isOk) {
      pass(`DB ${name.padEnd(12)} acessível — "${data.title?.[0]?.plain_text ?? id}"`);
      info(`  ID: ${id}`);
      info(`  Propriedades: ${Object.keys(data.properties ?? {}).join(", ")}`);
      accessible[name] = true;
    } else {
      flunk(`DB ${name.padEnd(12)} inacessível — HTTP ${status}: ${data.message ?? ""}`);
      accessible[name] = false;
    }
  }
  return accessible;
}

// 3. DATA QUALITY — PROJECTS (properties DB)
async function testProjectsData() {
  header("3 · Qualidade dos Dados — Projetos (Properties DB)");

  let rows;
  try {
    rows = await queryAll(DB_IDS.properties);
    pass(`Consulta paginada concluída — ${rows.length} registros retornados`);
  } catch (e) {
    flunk(`Erro ao consultar DB properties: ${e.message}`);
    return;
  }

  if (rows.length === 0) { caution("Banco de projetos está vazio"); return; }

  const projects = rows.map(r => {
    const p = r.properties ?? {};
    return {
      id:          r.id,
      titulo:      getTitle(p,    ["Nome do projeto","Nome","Title","Título","Projeto"]),
      cliente:     getRichText(p, ["Cliente","Client"]),
      diretor:     getPeople(p,   ["Responsável","Responsavel","Diretor"]) || getRichText(p, ["Responsável","Responsavel","Diretor"]),
      status:      getSelect(p,   ["Status"]),
      tipo:        getSelect(p,   ["Tipo","Type"]),
      inicio:      getDate(p,     ["Início","Inicio","Start","COMPETÊNCIA","Competência"]),
      prazo:       getDate(p,     ["Prazo","COMPETÊNCIA","Competência","Competencia","Due Date"]),
      valor:       getNumber(p,   ["Orçamento","Orcamento","Valor","Budget","Price"]),
      recebido:    getCheckbox(p, ["Recebido","Pago","Received"]),
      recebimento: getDate(p,     ["Recebimento","Data Recebimento"]),
    };
  });

  const total = projects.length;
  const withTitulo    = projects.filter(p => p.titulo).length;
  const withCliente   = projects.filter(p => p.cliente).length;
  const withDiretor   = projects.filter(p => p.diretor).length;
  const withStatus    = projects.filter(p => p.status).length;
  const withValor     = projects.filter(p => p.valor > 0).length;
  const withPrazo     = projects.filter(p => p.prazo).length;
  const withRecebido  = projects.filter(p => p.recebido).length;

  console.log(`\n  ${c.bold}Cobertura de campos (${total} projetos):${c.reset}`);
  console.log(`  Título       ${scoreBar(withTitulo  / total)}  (${withTitulo}/${total})`);
  console.log(`  Cliente      ${scoreBar(withCliente / total)}  (${withCliente}/${total})`);
  console.log(`  Diretor      ${scoreBar(withDiretor / total)}  (${withDiretor}/${total})`);
  console.log(`  Status       ${scoreBar(withStatus  / total)}  (${withStatus}/${total})`);
  console.log(`  Valor > 0    ${scoreBar(withValor   / total)}  (${withValor}/${total})`);
  console.log(`  Prazo        ${scoreBar(withPrazo   / total)}  (${withPrazo}/${total})`);
  console.log(`  Recebido=✓   ${scoreBar(withRecebido/ total)}  (${withRecebido}/${total})`);

  if (withTitulo === total) pass("100% dos projetos têm título");
  else caution(`${total - withTitulo} projeto(s) sem título — serão ignorados no import`);

  if (withValor >= total * 0.7) pass(`${pct(withValor, total)} dos projetos têm valor financeiro`);
  else caution(`Apenas ${pct(withValor, total)} dos projetos têm valor > 0`);

  const totalValor = projects.reduce((s, p) => s + p.valor, 0);
  info(`Volume financeiro total mapeado: R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);

  // Status distribution
  const statusCount = {};
  for (const p of projects) statusCount[p.status || "(vazio)"] = (statusCount[p.status || "(vazio)"] ?? 0) + 1;
  console.log(`\n  ${c.bold}Distribuição de Status:${c.reset}`);
  for (const [s, n] of Object.entries(statusCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c.gray}  ${s.padEnd(25)}${c.reset} ${n} projetos`);
  }

  return projects;
}

// 4. DATA QUALITY — CLIENTS
async function testClientsData() {
  header("4 · Qualidade dos Dados — Clientes (Clients DB)");

  let rows;
  try {
    rows = await queryAll(DB_IDS.clients);
    pass(`Consulta paginada concluída — ${rows.length} registros retornados`);
  } catch (e) {
    flunk(`Erro ao consultar DB clients: ${e.message}`);
    return;
  }

  if (rows.length === 0) { caution("Banco de clientes está vazio"); return; }

  const clients = rows.map(r => {
    const p = r.properties ?? {};
    return {
      id:           r.id,
      name:         getTitle(p,    ["Nome","Name","Title"]),
      email:        getRichText(p, ["Email","E-mail"]),
      phone:        getRichText(p, ["Telefone","Phone","Celular"]),
      type:         getSelect(p,   ["Tipo","Type","Perfil"]),
      status:       getSelect(p,   ["Status"]),
      budget_anual: getNumber(p,   ["Budget Anual","Budget","Orçamento","Orcamento","Valor"]),
      segmento:     getRichText(p, ["Segmento","Segment","Setor"]),
      since:        getDate(p,     ["Data","Desde","Since","Cadastro"]),
    };
  });

  const total = clients.length;
  const withName    = clients.filter(c => c.name).length;
  const withEmail   = clients.filter(c => c.email).length;
  const withPhone   = clients.filter(c => c.phone).length;
  const withType    = clients.filter(c => c.type).length;
  const withStatus  = clients.filter(c => c.status).length;
  const withBudget  = clients.filter(c => c.budget_anual > 0).length;

  console.log(`\n  ${c.bold}Cobertura de campos (${total} clientes):${c.reset}`);
  console.log(`  Nome         ${scoreBar(withName  / total)}  (${withName}/${total})`);
  console.log(`  Email        ${scoreBar(withEmail / total)}  (${withEmail}/${total})`);
  console.log(`  Telefone     ${scoreBar(withPhone / total)}  (${withPhone}/${total})`);
  console.log(`  Tipo         ${scoreBar(withType  / total)}  (${withType}/${total})`);
  console.log(`  Status       ${scoreBar(withStatus/ total)}  (${withStatus}/${total})`);
  console.log(`  Budget > 0   ${scoreBar(withBudget/ total)}  (${withBudget}/${total})`);

  if (withName === total) pass("100% dos clientes têm nome");
  else caution(`${total - withName} cliente(s) sem nome — serão ignorados no import`);

  const typeCount = {};
  for (const c of clients) typeCount[c.type || "(vazio)"] = (typeCount[c.type || "(vazio)"] ?? 0) + 1;
  console.log(`\n  ${c.bold}Distribuição por Tipo:${c.reset}`);
  for (const [t, n] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c.gray}  ${t.padEnd(25)}${c.reset} ${n} clientes`);
  }
}

// 5. IMPORT LOGIC VALIDATION
async function testImportLogic() {
  header("5 · Validação da Lógica de Mapeamento");

  // Valida que os extractors funcionam sem exceções em dados reais
  let rows;
  try {
    rows = await queryAll(DB_IDS.properties);
  } catch (e) {
    caution(`Não foi possível testar lógica de mapeamento: ${e.message}`);
    return;
  }

  let mapErrors = 0;
  for (const r of rows) {
    try {
      const p = r.properties ?? {};
      getTitle(p,    ["Nome do projeto","Nome","Title","Título","Projeto"]);
      getRichText(p, ["Cliente","Client"]);
      getNumber(p,   ["Orçamento","Orcamento","Valor","Budget","Price"]);
      getSelect(p,   ["Status"]);
      getDate(p,     ["Prazo","COMPETÊNCIA","Competência","Competencia","Due Date"]);
      getCheckbox(p, ["Recebido","Pago","Received"]);
      getPeople(p,   ["Responsável","Responsavel","Diretor"]);

      // Deriva ID estável (mirrors notionProjectId())
      const stableId = `CV-${r.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      if (!stableId.match(/^CV-[A-F0-9]{8}$/)) throw new Error(`ID inválido: ${stableId}`);
    } catch (e) {
      mapErrors++;
      if (mapErrors <= 3) warn(`Erro de mapeamento em ${r.id.slice(0,8)}: ${e.message}`);
    }
  }

  if (mapErrors === 0) {
    pass(`Todos os ${rows.length} registros mapeados sem exceções`);
  } else {
    caution(`${mapErrors} de ${rows.length} registros com erros de mapeamento`);
  }

  // Testa ID derivation
  const sample = { id: "308e2d13-dfa9-433e-a0f6-8439b5181845" };
  const id = `CV-${sample.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  if (id === "CV-308E2D13") pass(`Derivação de ID estável correta: ${id}`);
  else flunk(`ID derivado incorreto: ${id}`);
}

// 6. SCHEMA PROPERTY DISCOVERY
async function testSchemaDiscovery() {
  header("6 · Descoberta de Schema — Propriedades Reais do Notion");

  for (const [name, id] of Object.entries(DB_IDS)) {
    const { ok: isOk, data } = await notionRequest(`/databases/${id}`);
    if (!isOk) continue;

    const props = data.properties ?? {};
    const propList = Object.entries(props).map(([k, v]) => `${k} (${v.type})`);
    console.log(`\n  ${c.bold}${name}:${c.reset}`);
    for (const p of propList) {
      console.log(`  ${c.gray}  · ${p}${c.reset}`);
    }
  }

  pass("Schema discovery concluído — veja campos acima para verificar mapeamentos");
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log(`\n${c.bold}${c.cyan}╔════════════════════════════════════════════════════════════╗`);
  console.log(`║    CAZA VISION — Análise E2E: Notion → Import Pipeline     ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝${c.reset}`);
  console.log(`  ${c.gray}Token: ${TOKEN ? TOKEN.slice(0,12) + "..." : "(não configurado)"}${c.reset}`);
  console.log(`  ${c.gray}Data:  ${new Date().toLocaleString("pt-BR")}${c.reset}`);

  const tokenOk = await testToken();
  if (!tokenOk) {
    header("ABORTADO");
    flunk("Token inválido — não é possível continuar os testes");
    process.exit(1);
  }

  const accessible = await testDatabases();

  if (accessible.properties) {
    await testProjectsData();
    await testImportLogic();
  } else {
    caution("DB properties inacessível — pulando testes de projetos e mapeamento");
  }

  if (accessible.clients) {
    await testClientsData();
  } else {
    caution("DB clients inacessível — pulando testes de clientes");
  }

  await testSchemaDiscovery();

  // ── RELATÓRIO FINAL ─────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total   = results.passed + results.failed + results.warned;
  const health  = total > 0 ? results.passed / total : 0;

  header("RELATÓRIO FINAL");
  console.log(`\n  ${c.green}Passou:   ${results.passed}${c.reset}`);
  console.log(`  ${c.red}Falhou:   ${results.failed}${c.reset}`);
  console.log(`  ${c.yellow}Avisos:   ${results.warned}${c.reset}`);
  console.log(`  ${c.gray}Duração:  ${elapsed}s${c.reset}`);
  console.log(`\n  Score de Saúde:  ${scoreBar(health)}`);

  const verdict =
    results.failed === 0 && health >= 0.8 ? `${c.green}APROVADO — Pipeline Notion pronto para importação${c.reset}` :
    results.failed === 0 ? `${c.yellow}APROVADO COM RESSALVAS — Verifique os avisos acima${c.reset}` :
    `${c.red}REPROVADO — Corrija as falhas antes de importar${c.reset}`;

  console.log(`\n  Veredicto: ${verdict}\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(`\n${c.red}Erro fatal: ${e.message}${c.reset}`);
  process.exit(1);
});
