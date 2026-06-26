// ─── Enerdy → AWQ (BU ENRD) — Discovery & Extraction Harness ──────────────────
//
// OBJETIVO
//   Logar na plataforma de gestão da Enerdy (gestao.enerdy.com.br), navegar até
//   a tela de montagem e DESCOBRIR a API JSON por trás da SPA — para que a
//   ingestão definitiva seja um fetch HTTP limpo (sem browser), não um scraper
//   de DOM frágil.
//
//   Em DISCOVERY mode (default) o script:
//     1. faz login com ENERDY_USER / ENERDY_PASS
//     2. abre /app/montagem (e quaisquer rotas em ENERDY_ROUTES)
//     3. captura TODAS as chamadas XHR/fetch que retornam JSON
//     4. grava um relatório (endpoints, métodos, status, amostra de payload),
//        os cookies de sessão e os HTML/JSON crus em OUT_DIR
//
//   Com o relatório em mãos, preenchemos os endpoints reais em lib/enerdy-api.ts
//   e a ingestão recorrente passa a rodar via HTTP puro.
//
// PRÉ-REQUISITOS
//   - Rede: o domínio enerdy.com.br precisa estar liberado na política de rede
//     do ambiente (Network access = Custom + gestao.enerdy.com.br, ou Full).
//     Veja ENERDY_INTEGRATION.md.
//   - Credenciais em env vars (NUNCA hardcoded / commitadas):
//       ENERDY_USER, ENERDY_PASS
//   - Playwright (já em devDependencies). Chromium do ambiente em /opt/pw-browsers.
//
// USO
//   ENERDY_USER=... ENERDY_PASS=... node scripts/fetch-enerdy.mjs
//   (opcional) ENERDY_HEADFUL=1 para ver o browser, ENERDY_ROUTES="/app/montagem,/app/x"
//
// SAÍDA
//   scripts/.enerdy-out/  → discovery-report.json, cookies.json, api-*.json,
//                           page-*.html, screenshot-*.png

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.ENERDY_BASE_URL ?? "https://gestao.enerdy.com.br";
const USER     = process.env.ENERDY_USER ?? "";
const PASS     = process.env.ENERDY_PASS ?? "";
const ROUTES   = (process.env.ENERDY_ROUTES ?? "/app/montagem")
  .split(",").map((s) => s.trim()).filter(Boolean);
const HEADFUL  = process.env.ENERDY_HEADFUL === "1";
const OUT_DIR  = path.join(process.cwd(), "scripts", ".enerdy-out");
const PROXY    = process.env.HTTPS_PROXY || process.env.https_proxy || undefined;

if (!USER || !PASS) {
  console.error("ERRO: defina ENERDY_USER e ENERDY_PASS no ambiente (não hardcode).");
  process.exit(1);
}

// JSON-ish responses we want to capture (a API por trás da SPA)
function looksLikeApi(url, ctype) {
  if (/\.(js|css|png|jpe?g|svg|woff2?|ico|map|gif)(\?|$)/i.test(url)) return false;
  return /json/i.test(ctype || "");
}

// Best-effort: acha o campo de usuário/senha sem saber os seletores exatos
async function findLoginFields(page) {
  const userSel = [
    'input[name="username"]', 'input[name="user"]', 'input[name="login"]',
    'input[name="email"]', 'input[type="email"]', 'input[id*="user" i]',
    'input[id*="login" i]', 'input[placeholder*="usuário" i]',
  ];
  const passSel = ['input[type="password"]', 'input[name="password"]', 'input[id*="senha" i]'];
  let u = null, p = null;
  for (const s of userSel) { if (await page.$(s)) { u = s; break; } }
  for (const s of passSel) { if (await page.$(s)) { p = s; break; } }
  return { u, p };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const captured = [];

  const browser = await chromium.launch({
    headless: !HEADFUL,
    proxy: PROXY ? { server: PROXY } : undefined,
    args: ["--ignore-certificate-errors"],
  });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  // Captura de rede — o coração da descoberta
  page.on("response", async (resp) => {
    try {
      const req = resp.request();
      const url = resp.url();
      const ctype = resp.headers()["content-type"] || "";
      if (!looksLikeApi(url, ctype)) return;
      let body = null;
      try { body = await resp.json(); } catch { /* não-json, ignora */ }
      captured.push({
        url, method: req.method(), status: resp.status(),
        contentType: ctype,
        postData: req.postData() ?? null,
        sample: sampleJson(body),
      });
    } catch { /* ignore */ }
  });

  const report = { baseUrl: BASE_URL, steps: [], errors: [] };

  try {
    // 1) Login page
    const loginUrl = process.env.ENERDY_LOGIN_URL ?? `${BASE_URL}/`;
    await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);

    const { u, p } = await findLoginFields(page);
    report.steps.push({ step: "login-page", url: page.url(), userField: u, passField: p });

    if (!u || !p) {
      // Sem campos → dump da estrutura pra ajustarmos os seletores
      const inputs = await page.$$eval("input", (els) =>
        els.map((e) => ({ name: e.name, type: e.type, id: e.id, placeholder: e.placeholder })));
      report.errors.push({ where: "login-fields-not-found", inputs });
      await writeFile(path.join(OUT_DIR, "login-page.html"), await page.content());
    } else {
      await page.fill(u, USER);
      await page.fill(p, PASS);
      // submeter: botão de submit, ou Enter
      const submit = await page.$('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
      if (submit) await submit.click(); else await page.keyboard.press("Enter");
      await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => {});
      await page.waitForTimeout(3000);
      report.steps.push({ step: "after-login", url: page.url(), title: await page.title() });
    }

    // 2) Rotas alvo (montagem etc.)
    for (const route of ROUTES) {
      const target = route.startsWith("http") ? route : `${BASE_URL}${route}`;
      try {
        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
        await page.waitForTimeout(3500);
        const slug = route.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root";
        await writeFile(path.join(OUT_DIR, `page-${slug}.html`), await page.content());
        await page.screenshot({ path: path.join(OUT_DIR, `screenshot-${slug}.png`), fullPage: true });
        // tabelas visíveis (fallback se não houver API)
        const tables = await page.$$eval("table", (ts) => ts.map((t) => t.innerText.slice(0, 4000)));
        report.steps.push({ step: "route", route, url: page.url(), tableCount: tables.length });
        if (tables.length) await writeFile(path.join(OUT_DIR, `tables-${slug}.txt`), tables.join("\n\n---\n\n"));
      } catch (e) {
        report.errors.push({ where: `route:${route}`, message: String(e?.message || e) });
      }
    }

    // 3) Cookies de sessão (pra reuso via HTTP puro depois)
    await writeFile(path.join(OUT_DIR, "cookies.json"), JSON.stringify(await ctx.cookies(), null, 2));
  } catch (e) {
    report.errors.push({ where: "fatal", message: String(e?.message || e) });
  } finally {
    // 4) Relatório de endpoints descobertos
    const apis = dedupeApis(captured);
    report.discoveredApis = apis;
    await writeFile(path.join(OUT_DIR, "discovery-report.json"), JSON.stringify(report, null, 2));
    // dump completo de cada api capturada
    let i = 0;
    for (const a of apis) {
      await writeFile(path.join(OUT_DIR, `api-${String(i++).padStart(2, "0")}.json`), JSON.stringify(a, null, 2));
    }
    console.log(`\n✓ Descoberta concluída. ${apis.length} endpoint(s) JSON capturado(s).`);
    console.log(`  Saída: ${OUT_DIR}`);
    for (const a of apis) console.log(`   • ${a.method} ${a.status}  ${a.url}`);
    await browser.close();
  }
}

// Limita amostra de JSON pra relatório não explodir
function sampleJson(body, depth = 0) {
  if (body == null || depth > 4) return body;
  if (Array.isArray(body)) return body.slice(0, 3).map((x) => sampleJson(x, depth + 1));
  if (typeof body === "object") {
    const out = {};
    for (const k of Object.keys(body).slice(0, 40)) out[k] = sampleJson(body[k], depth + 1);
    return out;
  }
  return body;
}

function dedupeApis(list) {
  const seen = new Map();
  for (const a of list) {
    const key = `${a.method} ${a.url.split("?")[0]}`;
    if (!seen.has(key)) seen.set(key, a);
  }
  return [...seen.values()];
}

main().catch((e) => { console.error(e); process.exit(1); });
