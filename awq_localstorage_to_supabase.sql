-- ─── localStorage → Supabase migration ───────────────────────────────────────
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- All tables use text PKs that match the IDs generated client-side.

-- AWQ Venture — custom deals created via /awq-venture/deals/novo
CREATE TABLE IF NOT EXISTS venture_custom_deals (
  id            text PRIMARY KEY,
  company_name  text NOT NULL DEFAULT '',
  cnpj          text DEFAULT '',
  sector        text DEFAULT '',
  location      text DEFAULT '',
  deal_type     text DEFAULT '',
  stage         text DEFAULT '',
  ticket        numeric DEFAULT 0,
  assignee      text DEFAULT '',
  risk_level    text DEFAULT '',
  priority      text DEFAULT '',
  send_status   text DEFAULT '',
  tese          text DEFAULT '',
  structura     text DEFAULT '',
  fee           text DEFAULT '',
  earnin        text DEFAULT '',
  conditions    text DEFAULT '',
  next_steps    text DEFAULT '',
  notes         text DEFAULT '',
  contact_name  text DEFAULT '',
  contact_email text DEFAULT '',
  contact_phone text DEFAULT '',
  website       text DEFAULT '',
  created_at    text DEFAULT '',
  updated_at    text DEFAULT ''
);

-- AWQ Venture — field overrides + notes + audit log for static deal cards
CREATE TABLE IF NOT EXISTS venture_deal_overrides (
  deal_id    text PRIMARY KEY,
  data       jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- AWQ Venture — client negotiation rounds for SharePage
CREATE TABLE IF NOT EXISTS venture_deal_responses (
  deal_id    text PRIMARY KEY,
  rounds     jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz DEFAULT now()
);

-- AWQ Bank — accounts + embedded transaction history
CREATE TABLE IF NOT EXISTS awq_bank_accounts (
  id              text PRIMARY KEY,
  bank            text NOT NULL DEFAULT '',
  name            text NOT NULL DEFAULT '',
  color           text DEFAULT '',
  current_balance numeric DEFAULT 0,
  last_updated    text DEFAULT '',
  transactions    jsonb DEFAULT '[]'
);

-- AWQ Financial — AP/AR items
CREATE TABLE IF NOT EXISTS awq_apar_items (
  id                    text PRIMARY KEY,
  type                  text NOT NULL,
  bu                    text NOT NULL DEFAULT 'awq',
  description           text NOT NULL DEFAULT '',
  entity                text DEFAULT '',
  amount                numeric NOT NULL DEFAULT 0,
  due_date              text DEFAULT '',
  status                text DEFAULT 'pending',
  category              text DEFAULT '',
  created_at            text DEFAULT '',
  financial_link_status text,
  financial_link_note   text,
  financial_link_source text
);
