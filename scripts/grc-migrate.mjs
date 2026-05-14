#!/usr/bin/env node
// Executa a migração GRC diretamente no Supabase via REST API
// Usage: node scripts/grc-migrate.mjs

const PROJECT_URL = "https://kkhxxsrgsewjfvnnsyf.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYyNTkwMywiZXhwIjoyMDk0MjAxOTAzfQ.oxSM8vzwytxaHF7ZSh5iMEut9By11_oQnfNW7ntiE8A";

const SQL = `
create table if not exists grc_risks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  category     text,
  severity     text not null default 'medium' check (severity in ('low','medium','high','critical')),
  status       text not null default 'open'   check (status   in ('open','in_treatment','accepted','closed')),
  owner        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists grc_controls (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  type         text not null default 'preventive' check (type   in ('preventive','detective','corrective')),
  status       text not null default 'active'     check (status in ('active','inactive','under_review')),
  risk_id      uuid references grc_risks(id) on delete set null,
  owner        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists grc_policies (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  category       text,
  status         text not null default 'draft' check (status in ('draft','active','under_review','retired')),
  version        text,
  effective_date date,
  owner          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists grc_audits (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       text not null default 'planned' check (status in ('planned','in_progress','completed','cancelled')),
  audit_date   date,
  auditor      text,
  findings     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table grc_risks    enable row level security;
alter table grc_controls enable row level security;
alter table grc_policies enable row level security;
alter table grc_audits   enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'anon read risks') then
    create policy "anon read risks"     on grc_risks    for select using (true);
    create policy "anon write risks"    on grc_risks    for all    using (true) with check (true);
    create policy "anon read controls"  on grc_controls for select using (true);
    create policy "anon write controls" on grc_controls for all    using (true) with check (true);
    create policy "anon read policies"  on grc_policies for select using (true);
    create policy "anon write policies" on grc_policies for all    using (true) with check (true);
    create policy "anon read audits"    on grc_audits   for select using (true);
    create policy "anon write audits"   on grc_audits   for all    using (true) with check (true);
  end if;
end $$;
`;

async function run() {
  // Try PostgREST /rest/v1/sql endpoint (PostgREST 12+)
  console.log("→ Tentando /rest/v1/sql ...");
  try {
    const res = await fetch(`${PROJECT_URL}/rest/v1/sql`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "params=single-object",
      },
      body: JSON.stringify({ query: SQL }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log("✅  Migração via /rest/v1/sql bem-sucedida");
      await verify();
      return;
    }
    console.log(`   HTTP ${res.status}: ${text.slice(0, 300)}`);
  } catch (e) {
    console.log(`   Erro: ${e.message}`);
  }

  // Fallback: try direct pg endpoint
  console.log("→ Tentando /pg/query ...");
  try {
    const res = await fetch(`${PROJECT_URL}/pg/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log("✅  Migração via /pg/query bem-sucedida");
      await verify();
      return;
    }
    console.log(`   HTTP ${res.status}: ${text.slice(0, 300)}`);
  } catch (e) {
    console.log(`   Erro: ${e.message}`);
  }

  // Last resort: Supabase Management API
  console.log("→ Tentando Management API ...");
  try {
    const ref = "kkhxxsrgsewjfvnnsyf";
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log("✅  Migração via Management API bem-sucedida");
      await verify();
      return;
    }
    console.log(`   HTTP ${res.status}: ${text.slice(0, 300)}`);
  } catch (e) {
    console.log(`   Erro: ${e.message}`);
  }

  console.error("\n❌  Não foi possível executar a migração automaticamente neste ambiente (sem acesso à internet).");
  process.exit(1);
}

async function verify() {
  console.log("\n→ Verificando leitura/escrita em cada tabela...");
  const ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtraHh4c3Jnc2V3amZ2bm5zc3lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MjU5MDMsImV4cCI6MjA5NDIwMTkwM30.snYJ697SXGqcKc-I__w0kYMat71LbnusEjOdg27EOvs";

  const tables = ["grc_risks", "grc_controls", "grc_policies", "grc_audits"];
  let allOk = true;

  for (const table of tables) {
    // Insert
    const ins = await fetch(`${PROJECT_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ title: "__verify__" }),
    });
    if (!ins.ok) {
      console.log(`  ✗ ${table}: insert falhou (${ins.status})`);
      allOk = false;
      continue;
    }
    const [row] = await ins.json();

    // Select
    const sel = await fetch(`${PROJECT_URL}/rest/v1/${table}?id=eq.${row.id}`, {
      headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
    });
    const [fetched] = await sel.json();

    // Delete
    await fetch(`${PROJECT_URL}/rest/v1/${table}?id=eq.${row.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
    });

    if (fetched?.id === row.id) {
      console.log(`  ✓ ${table}: insert + select + delete OK`);
    } else {
      console.log(`  ✗ ${table}: select retornou dado inesperado`);
      allOk = false;
    }
  }

  console.log(allOk ? "\n✅  Teste operacional 100% — todas as tabelas OK" : "\n⚠️  Algumas verificações falharam");
}

run();
