-- GRC Module — Governance · Risk · Compliance
-- Run this in: Supabase Dashboard → SQL Editor

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

-- Enable RLS and allow all authenticated + anon reads/writes (adjust per policy)
alter table grc_risks    enable row level security;
alter table grc_controls enable row level security;
alter table grc_policies enable row level security;
alter table grc_audits   enable row level security;

-- Permissive policies (MVP) — tighten per-role later
create policy "anon read risks"    on grc_risks    for select using (true);
create policy "anon write risks"   on grc_risks    for all    using (true) with check (true);
create policy "anon read controls" on grc_controls for select using (true);
create policy "anon write controls" on grc_controls for all   using (true) with check (true);
create policy "anon read policies" on grc_policies for select using (true);
create policy "anon write policies" on grc_policies for all   using (true) with check (true);
create policy "anon read audits"   on grc_audits   for select using (true);
create policy "anon write audits"  on grc_audits   for all    using (true) with check (true);
