/**
 * seed-enrd-pipeline-from-negocios.mjs
 *
 * Puxa o CRM comercial completo da ENERDY (backend projetos `zecanc`, tabela
 * `negocios`, ~536 linhas) e lança no CRM da BU ENRD do AWQ:
 *   - negócios com motor de venda (morno/quente/negociação/fechado/perdido)
 *     → crm_opportunities (pipeline, com stage/valor)
 *   - topo de funil (sem_etapa/frio) → crm_leads
 *
 * Idempotente: dedupe por nome normalizado dentro do marcador created_by.
 * Não apaga nada. owner/assigned = Miguel (lead da BU ENRD).
 *
 * Env: ENERDY_USER (=felipe_enerdy), ENERDY_PASS.
 * Uso: node scripts/seed-enrd-pipeline-from-negocios.mjs [--dry]
 */

const DRY = process.argv.includes("--dry");

// ── Fonte: projetos.enerdy (negocios) ────────────────────────────────────────
const PROJ_URL = process.env.ENERDY_PROJETOS_URL || "https://zecancsoeyjnagxkrxnk.supabase.co";
const PROJ_ANON =
  process.env.ENERDY_PROJETOS_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplY2FuY3NvZXlqbmFneGtyeG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MDcwMDUsImV4cCI6MjA5MDQ4MzAwNX0.FDj52jIZooEILoVPWTwvZkAtmPLhrnVPzZJI-9OfGO0";
const PROJ_DOMAIN = process.env.ENERDY_PROJETOS_EMAIL_DOMAIN || "enerdy.com.br";
const EMAIL =
  process.env.ENERDY_PROJETOS_EMAIL ||
  `${(process.env.ENERDY_USER || "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")}@${PROJ_DOMAIN}`;
const PASSWORD = process.env.ENERDY_PASS || "";

// ── Destino: ERP AWQ (CRM) ───────────────────────────────────────────────────
const ERP_URL = process.env.NEXT_PUBLIC_ERP_SUPABASE_URL || "https://kkhxxsrgsewjfvnnssyf.supabase.co";
const ERP_KEY =
  process.env.ERP_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjU5MDMsImV4cCI6MjA5NDIwMTkwM30.snYJ697SXGqcKc-I__w0kYMat71LbnusEjOdg27EOvs";

const MARKER = "import:enerdy-negocios";
const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const dateOnly = (v) => (v ? String(v).slice(0, 10) : null);
const numOrNull = (v) => (Number.isFinite(Number(v)) && v != null ? Number(v) : null);

// etapa ENERDY → stage do pipeline AWQ
const STAGE_MAP = {
  fechado: "closed_won",
  perdido: "closed_lost",
  negociacao_geral: "negotiation",
  negociacao_mes: "negotiation",
  quente: "proposal",
  morno: "qualification",
};
const STAGE_PROB = { discovery: 25, qualification: 40, proposal: 60, negotiation: 75, closed_won: 100, closed_lost: 0 };
const LEAD_ETAPAS = new Set(["sem_etapa", "frio"]);

// fonte ENERDY → lead_source do CRM (enum: organic/paid/referral/inbound/manual)
function mapSource(fonte) {
  const f = norm(fonte);
  if (!f) return "manual";
  if (/busca ativa|ativa|prospec/.test(f)) return "organic";
  if (/indica|referr|felipe|tamara|cliente|amigo/.test(f)) return "referral";
  if (/insta|face|meta|ads|pago|google|trafego/.test(f)) return "paid";
  if (/site|form|inbound|whats|land/.test(f)) return "inbound";
  return "manual";
}

async function login() {
  const res = await fetch(`${PROJ_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PROJ_ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`Login projetos falhou: ${j.msg || j.error_code || res.status}`);
  return j.access_token;
}

async function fetchNegocios(token) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${PROJ_URL}/rest/v1/negocios?select=*`, {
      headers: { apikey: PROJ_ANON, Authorization: `Bearer ${token}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Ler negocios: ${res.status} ${await res.text()}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

async function erp(path, init) {
  const res = await fetch(`${ERP_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ERP_KEY, Authorization: `Bearer ${ERP_KEY}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`ERP ${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Insere em lotes (PostgREST aceita array).
async function insertBatch(table, rows) {
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    await erp(table, { method: "POST", body: JSON.stringify(chunk) });
  }
}

async function main() {
  if (!PASSWORD || !process.env.ENERDY_USER) {
    console.error("ERRO: defina ENERDY_USER (=felipe_enerdy) e ENERDY_PASS.");
    process.exit(1);
  }
  console.log(`[1/4] Login no projetos como ${EMAIL}...`);
  const token = await login();

  console.log("[2/4] Lendo negocios...");
  const negocios = await fetchNegocios(token);
  console.log(`  ${negocios.length} negócios na origem.`);

  console.log("[3/4] Dedupe contra o que já foi importado...");
  const exOpp = await erp(`crm_opportunities?select=opportunity_name&created_by=eq.${encodeURIComponent(MARKER)}`);
  const exLead = await erp(`crm_leads?select=company_name&created_by=eq.${encodeURIComponent(MARKER)}`);
  const seen = new Set([...exOpp.map((o) => norm(o.opportunity_name)), ...exLead.map((l) => norm(l.company_name))]);
  console.log(`  ${seen.size} já importados (serão pulados).`);

  const opps = [];
  const leads = [];
  let pulados = 0;
  for (const n of negocios) {
    const nome = (n.nome || "").trim();
    if (!nome) { pulados++; continue; }
    const key = norm(nome);
    if (seen.has(key)) { pulados++; continue; }
    seen.add(key);

    const etapa = norm(n.etapa) || "sem_etapa";
    const valor = numOrNull(n.valor_estimado) ?? 0;
    const fonteTxt = (n.fonte || "").trim();
    const respTxt = (n.responsavel || "").trim();

    if (LEAD_ETAPAS.has(etapa)) {
      leads.push({
        company_name: nome,
        contact_name: nome,
        phone: n.telefone ? String(n.telefone) : null,
        email: n.email || null,
        bu: "ENRD",
        lead_source: mapSource(fonteTxt),
        status: etapa === "frio" ? "contacted" : "new",
        lead_score: etapa === "frio" ? 30 : 15,
        qualification_notes: [
          `Origem ENERDY: ${fonteTxt || "—"}`,
          respTxt ? `Responsável: ${respTxt}` : null,
          valor ? `Valor estimado: R$ ${valor.toLocaleString("pt-BR")}` : null,
          n.kwp ? `${n.kwp} kWp` : null,
        ].filter(Boolean).join(" · "),
        assigned_to: "Miguel",
        created_by: MARKER,
      });
    } else {
      const stage = STAGE_MAP[etapa] || "qualification";
      opps.push({
        opportunity_name: nome,
        bu: "ENRD",
        stage,
        deal_value: valor,
        probability: STAGE_PROB[stage] ?? 40,
        owner: "Miguel",
        actual_close_date: stage === "closed_won" || stage === "closed_lost" ? dateOnly(n.fechado_em) : null,
        lost_reason: stage === "closed_lost" ? (n.fechamento_observacoes || `Origem ENERDY · resp: ${respTxt || "—"}`) : null,
        win_reason: stage === "closed_won" ? `resp: ${respTxt || "—"} · fonte: ${fonteTxt || "—"}` : null,
        created_by: MARKER,
      });
    }
  }

  console.log(`[4/4] ${opps.length} oportunidades + ${leads.length} leads novos · ${pulados} pulados${DRY ? " (DRY RUN)" : ""}.`);
  if (DRY) {
    const byStage = {};
    opps.forEach((o) => (byStage[o.stage] = (byStage[o.stage] || 0) + 1));
    console.log("  oportunidades por stage:", JSON.stringify(byStage));
    return;
  }
  await insertBatch("crm_opportunities", opps);
  await insertBatch("crm_leads", leads);
  console.log(`\nConcluído: ${opps.length} oportunidades + ${leads.length} leads na BU ENRD.`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
