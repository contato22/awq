import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROJECT_URL = process.env.NEXT_PUBLIC_GRC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.GRC_SUPABASE_SERVICE_ROLE_KEY ?? "";

const MIGRATION_SQL = `
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
create policy if not exists "anon_all_risks"     on grc_risks    for all using (true) with check (true);
create policy if not exists "anon_all_controls"  on grc_controls for all using (true) with check (true);
create policy if not exists "anon_all_policies"  on grc_policies for all using (true) with check (true);
create policy if not exists "anon_all_audits"    on grc_audits   for all using (true) with check (true);
`;

export async function runGrcMigration(): Promise<{ ok: boolean; detail: string }> {
  if (!PROJECT_URL || !SERVICE_KEY) {
    return { ok: false, detail: "env vars GRC_SUPABASE_* não configurados" };
  }

  const res = await fetch(`${PROJECT_URL}/rest/v1/sql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: MIGRATION_SQL }),
  });

  if (res.ok) return { ok: true, detail: "migração executada com sucesso" };

  const body = await res.text();
  return { ok: false, detail: `HTTP ${res.status}: ${body.slice(0, 400)}` };
}

export async function GET() {
  try {
    const result = await runGrcMigration();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, detail: String(e instanceof Error ? e.message : e) },
      { status: 500 }
    );
  }
}
