/**
 * seed-enrd-crm-from-gestao.mjs
 *
 * Puxa os clientes do portal gestão.enerdy (app de montagem, tabela `clientes`)
 * e lança no CRM da BU ENRD do AWQ (crm_accounts + crm_contacts), bu="ENRD".
 *
 * Idempotente: pula contas cujo nome já existe em ENRD (match normalizado).
 * Não apaga nada. Owner = Miguel (pós-venda).
 *
 * Env: ENERDY_USER, ENERDY_PASS (conta com leitura no app de montagem).
 * Uso: node scripts/seed-enrd-crm-from-gestao.mjs   (--dry para simular)
 */

const DRY = process.argv.includes("--dry");

// ── Fonte: gestão.enerdy (app montagem) ──────────────────────────────────────
const ENERDY_URL = process.env.ENERDY_SUPABASE_URL || "https://gxgvucnkldzcktdzkkdv.supabase.co";
const ENERDY_ANON =
  process.env.ENERDY_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4Z3Z1Y25rbGR6Y2t0ZHpra2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODgzOTIsImV4cCI6MjA4ODA2NDM5Mn0.lT1GPmJOU3v12O5RvscEFFSUrf4JeLd77F0j34SiW4Q";
const EMAIL =
  process.env.ENERDY_EMAIL ||
  `${(process.env.ENERDY_USER || "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")}@${process.env.ENERDY_EMAIL_DOMAIN || "enerdy.local"}`;
const PASSWORD = process.env.ENERDY_PASS || "";

// ── Destino: ERP AWQ (CRM) ───────────────────────────────────────────────────
const ERP_URL = process.env.NEXT_PUBLIC_ERP_SUPABASE_URL || "https://kkhxxsrgsewjfvnnssyf.supabase.co";
const ERP_KEY =
  process.env.ERP_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_ERP_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjU5MDMsImV4cCI6MjA5NDIwMTkwM30.snYJ697SXGqcKc-I__w0kYMat71LbnusEjOdg27EOvs";

const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

async function enerdyLogin() {
  const res = await fetch(`${ENERDY_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ENERDY_ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`Login gestão falhou: ${j.msg || j.error_code || res.status}`);
  return j.access_token;
}

async function fetchClientes(token) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${ENERDY_URL}/rest/v1/clientes?select=*`, {
      headers: { apikey: ENERDY_ANON, Authorization: `Bearer ${token}`, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`Ler clientes: ${res.status} ${await res.text()}`);
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
  return text ? JSON.parse(text) : null; // POST sem return=representation devolve corpo vazio
}

async function main() {
  if (!PASSWORD || !process.env.ENERDY_USER) {
    console.error("ERRO: defina ENERDY_USER e ENERDY_PASS.");
    process.exit(1);
  }
  console.log(`[1/4] Login no gestão como ${EMAIL}...`);
  const token = await enerdyLogin();

  console.log("[2/4] Lendo clientes do gestão...");
  const clientes = await fetchClientes(token);
  console.log(`  ${clientes.length} clientes na origem.`);

  console.log("[3/4] Lendo contas ENRD já existentes no CRM (dedupe)...");
  const existing = await erp("crm_accounts?select=account_name&bu=eq.ENRD");
  const seen = new Set(existing.map((a) => norm(a.account_name)));
  console.log(`  ${seen.size} contas ENRD já no CRM.`);

  console.log(`[4/4] Lançando contas + contatos${DRY ? " (DRY RUN)" : ""}...`);
  let criadas = 0, puladas = 0, contatos = 0;
  for (const c of clientes) {
    const nome = (c.nome || "").trim();
    if (!nome) { puladas++; continue; }
    if (seen.has(norm(nome))) { puladas++; continue; }
    seen.add(norm(nome));
    if (DRY) { criadas++; continue; }

    const [acc] = await erp("crm_accounts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        account_name: nome,
        industry: "Energia Solar",
        address_street: c.endereco || null,
        account_type: "customer",
        bu: "ENRD",
        owner: "Miguel",
        created_by: "import:gestao-enerdy",
      }),
    });
    criadas++;
    if (c.telefone) {
      await erp("crm_contacts", {
        method: "POST",
        body: JSON.stringify({
          account_id: acc.account_id,
          full_name: nome,
          phone: String(c.telefone),
          is_primary_contact: true,
        }),
      });
      contatos++;
    }
  }
  console.log(`\nConcluído: ${criadas} contas criadas · ${contatos} contatos · ${puladas} puladas (já existiam/sem nome).`);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
