-- =============================================================================
-- BOOTSTRAP ÚNICO — Conciliação Inteligente (cole TUDO no Supabase SQL Editor)
-- =============================================================================
-- Faz, de uma vez e de forma idempotente:
--   1) migrations 003 + 004 + 005 (schema, RLS hardening, bu_bank_account, ENERDY)
--   2) backfill do legado bank_transactions -> bank_transaction (falha fechada)
--   3) fila de classificação do legado ENERDY (Fix 2)
-- Sem token, sem credencial exposta, seguro rodar mais de uma vez.
-- Projeto: kkhxxsrgsewjfvnnssyf
-- =============================================================================

-- ─────────────────────────── 003 ───────────────────────────
-- =============================================================================
-- Migration 003 — Conciliação Inteligente (motor de classificação + matching)
-- =============================================================================
-- Subseção de /awq/conciliacao. NÃO é "bater saldo": é um motor que atribui a
-- cada transação um estado + grau de confiança, auto-resolve o óbvio e enfileira
-- apenas a exceção para o humano.
--
-- Execute UMA VEZ no Supabase SQL Editor (Dashboard → SQL Editor → Run).
-- Todos os statements são idempotentes (IF NOT EXISTS / OR REPLACE / DROP IF
-- EXISTS) — seguro rodar múltiplas vezes.
--
-- Cobre: PR-1 do plano de entrega (8 objetos de tabela + 2 views + índices + RLS
-- por BU + lock de período). Critérios de aceite atendidos no nível do schema:
--   • Teste 7  (intercompany)  → view v_consolidado_grupo elimina is_intercompany
--   • Teste 8  (lock período)  → trigger enforce_period_lock bloqueia alteração
--   • Teste 11 (RLS por BU)    → policies bu_isolation via GUC app.current_bu
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- normalização de contraparte (N3)

-- =============================================================================
-- 1) Período contábil — lock de saldo histórico (imutável após fechamento)
-- =============================================================================
CREATE TABLE IF NOT EXISTS accounting_period (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu         TEXT NOT NULL CHECK (bu IN ('AWQ','ENRD')),
  ref_month  DATE NOT NULL,                          -- primeiro dia do mês
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  closed_at  TIMESTAMPTZ,
  closed_by  TEXT,
  UNIQUE (bu, ref_month)
);

-- =============================================================================
-- 2) Transação bancária (Cora) — imutável; status de conciliação materializado
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_transaction (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu           TEXT NOT NULL CHECK (bu IN ('AWQ','ENRD')),
  account_id   TEXT NOT NULL,
  posted_at    TIMESTAMPTZ NOT NULL,
  value_date   DATE GENERATED ALWAYS AS ((posted_at AT TIME ZONE 'America/Sao_Paulo')::date) STORED,
  amount       NUMERIC(14,2) NOT NULL,               -- + crédito / - débito
  direction    TEXT GENERATED ALWAYS AS (CASE WHEN amount >= 0 THEN 'IN' ELSE 'OUT' END) STORED,
  counterparty TEXT,
  counter_doc  TEXT,
  e2e_id       TEXT,                                  -- Pix endToEndId (chave determinística)
  txid         TEXT,                                  -- txid / nosso número
  raw_descr    TEXT,
  source       TEXT NOT NULL DEFAULT 'cora_api' CHECK (source IN ('cora_api','ofx','csv')),
  recon_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (recon_status IN ('unmatched','partial','matched','ignored')),
  ingested_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (bu, e2e_id)
);
CREATE INDEX IF NOT EXISTS idx_bank_tx_status ON bank_transaction (bu, recon_status, value_date);
CREATE INDEX IF NOT EXISTS idx_bank_tx_amount ON bank_transaction (amount);

-- =============================================================================
-- 3) Lançamento / razão (AP/AR + auto-classificado do banco)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ledger_entry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu              TEXT NOT NULL CHECK (bu IN ('AWQ','ENRD')),
  kind            TEXT NOT NULL CHECK (kind IN ('AR','AP','FEE','DIFF','TRANSFER')),
  due_date        DATE,
  amount          NUMERIC(14,2) NOT NULL,             -- valor esperado (absoluto)
  open_amount     NUMERIC(14,2) NOT NULL,             -- saldo ainda não conciliado
  categoria       TEXT NOT NULL,
  conta_contabil  TEXT NOT NULL,
  counterparty    TEXT,
  counter_doc     TEXT,
  doc_ref         TEXT,
  origem          TEXT NOT NULL DEFAULT 'documento' CHECK (origem IN ('documento','banco')),
  status          TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','parcial','conciliado','baixado')),
  is_intercompany BOOLEAN NOT NULL DEFAULT FALSE,
  period_id       UUID REFERENCES accounting_period(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_status       ON ledger_entry (bu, status, due_date);
CREATE INDEX IF NOT EXISTS idx_ledger_counterparty ON ledger_entry (bu, counterparty);

-- =============================================================================
-- 4) Grupo de conciliação (suporta 1:1, N:1, 1:N e parcial) — APPEND-ONLY
--    Reverter = novo registro com state='reverted', NUNCA DELETE.
-- =============================================================================
CREATE TABLE IF NOT EXISTS recon_group (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu          TEXT NOT NULL CHECK (bu IN ('AWQ','ENRD')),
  confidence  INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  method      TEXT NOT NULL CHECK (method IN ('deterministic','heuristic','fuzzy','memory','manual')),
  state       TEXT NOT NULL CHECK (state IN ('auto','suggested','weak','manual','reverted')),
  matched_by  TEXT DEFAULT 'engine',
  matched_at  TIMESTAMPTZ DEFAULT now(),
  reverted_at TIMESTAMPTZ,
  reverted_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_recon_group_bu ON recon_group (bu, state);

-- =============================================================================
-- 5) Itens do grupo (cada link banco<->lançamento com valor aplicado)
-- =============================================================================
CREATE TABLE IF NOT EXISTS recon_match (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID NOT NULL REFERENCES recon_group(id) ON DELETE CASCADE,
  bank_tx_id     UUID REFERENCES bank_transaction(id),
  ledger_id      UUID REFERENCES ledger_entry(id),
  applied_amount NUMERIC(14,2) NOT NULL,              -- quanto desta tx aplica neste lançamento
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recon_match_bank   ON recon_match (bank_tx_id);
CREATE INDEX IF NOT EXISTS idx_recon_match_ledger ON recon_match (ledger_id);

-- =============================================================================
-- 6) Regras de classificação (N1) — editável sem deploy
-- =============================================================================
CREATE TABLE IF NOT EXISTS recon_rule (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bu               TEXT CHECK (bu IN ('AWQ','ENRD')),  -- NULL = ambas
  priority         INT NOT NULL,
  match_field      TEXT NOT NULL CHECK (match_field IN ('counterparty','raw_descr','counter_doc')),
  pattern          TEXT NOT NULL,                      -- regex / ilike
  set_kind         TEXT,
  set_categoria    TEXT,
  set_conta        TEXT,
  set_intercompany BOOLEAN DEFAULT FALSE,
  active           BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_recon_rule_active ON recon_rule (active, priority);

-- =============================================================================
-- 7) Memória de aprendizado (N3) — contraparte → kind/categoria/conta
-- =============================================================================
CREATE TABLE IF NOT EXISTS recon_payee_memory (
  bu               TEXT NOT NULL CHECK (bu IN ('AWQ','ENRD')),
  counterparty_key TEXT NOT NULL,                      -- normalizado: lower(unaccent(trim()))
  kind             TEXT,
  categoria        TEXT,
  conta_contabil   TEXT,
  hit_count        INT DEFAULT 1,
  last_seen        TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (bu, counterparty_key)
);

-- =============================================================================
-- 8) VIEWS
-- =============================================================================

-- 8.a) Saldo conciliado por BU/mês — alimenta o gráfico EXISTENTE (não regredir)
CREATE OR REPLACE VIEW v_saldo_conciliado AS
SELECT
  bu,
  date_trunc('month', value_date)::date AS ref_month,
  sum(amount) FILTER (WHERE direction = 'IN'  AND recon_status IN ('matched','partial')) AS entradas,
  sum(amount) FILTER (WHERE direction = 'OUT' AND recon_status IN ('matched','partial')) AS saidas,
  sum(amount) FILTER (WHERE recon_status IN ('matched','partial'))                       AS resultado
FROM bank_transaction
GROUP BY 1, 2;

-- 8.b) Consolidação de grupo — elimina intercompany; ENRD não consolida operacional
CREATE OR REPLACE VIEW v_consolidado_grupo AS
SELECT
  date_trunc('month', bt.value_date)::date AS ref_month,
  sum(bt.amount) AS resultado_consolidado
FROM bank_transaction bt
LEFT JOIN recon_match  rm ON rm.bank_tx_id = bt.id
LEFT JOIN ledger_entry le ON le.id = rm.ledger_id
WHERE coalesce(le.is_intercompany, FALSE) = FALSE
  AND bt.bu = 'AWQ'
GROUP BY 1;

-- =============================================================================
-- 9) LOCK DE PERÍODO — saldo histórico imutável após fechamento (Teste 8)
--    Bloqueia UPDATE/DELETE de tx/lançamento cujo mês esteja closed/locked.
-- =============================================================================
CREATE OR REPLACE FUNCTION enforce_period_lock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_bu     TEXT;
  v_month  DATE;
  v_status TEXT;
BEGIN
  -- Mês/BU do registro afetado (usa OLD: bloqueamos sair de um período fechado)
  IF TG_TABLE_NAME = 'bank_transaction' THEN
    v_bu    := OLD.bu;
    v_month := date_trunc('month', OLD.value_date)::date;
  ELSE  -- ledger_entry
    v_bu    := OLD.bu;
    v_month := date_trunc('month', COALESCE(OLD.due_date, OLD.created_at::date))::date;
  END IF;

  SELECT status INTO v_status
  FROM accounting_period
  WHERE bu = v_bu AND ref_month = v_month;

  IF v_status IN ('closed','locked') THEN
    RAISE EXCEPTION 'Período % de % está %: saldo histórico imutável (reabra o período para alterar).',
      to_char(v_month, 'YYYY-MM'), v_bu, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_bank_transaction ON bank_transaction;
CREATE TRIGGER trg_lock_bank_transaction
  BEFORE UPDATE OR DELETE ON bank_transaction
  FOR EACH ROW EXECUTE FUNCTION enforce_period_lock();

DROP TRIGGER IF EXISTS trg_lock_ledger_entry ON ledger_entry;
CREATE TRIGGER trg_lock_ledger_entry
  BEFORE UPDATE OR DELETE ON ledger_entry
  FOR EACH ROW EXECUTE FUNCTION enforce_period_lock();

-- =============================================================================
-- 9.b) GRANTs — o app cai para a anon key como fallback (ver lib/financial-db.ts).
--      A RLS por BU (seção 10) atua POR CIMA destes grants; service_role bypassa.
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON
  accounting_period, bank_transaction, ledger_entry, recon_group,
  recon_match, recon_rule, recon_payee_memory
  TO anon, authenticated;
GRANT SELECT ON v_saldo_conciliado, v_consolidado_grupo TO anon, authenticated;

-- =============================================================================
-- 10) ROW-LEVEL SECURITY por BU (Teste 11)
--    Isolamento via GUC de sessão `app.current_bu` (setado pelo backend após
--    autenticar o usuário). Quando o GUC está vazio/ausente (ex.: service role
--    do backend), a policy é permissiva — o backend continua lendo tudo.
--    O service_role do Supabase também faz BYPASS RLS por padrão.
-- =============================================================================

-- recon_match não tem coluna bu própria → deriva via recon_group.
ALTER TABLE accounting_period  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transaction   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entry       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_group        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_match        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_rule         ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_payee_memory ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  -- Tabelas com coluna `bu` direta. recon_rule.bu pode ser NULL (= ambas).
  FOREACH tbl IN ARRAY ARRAY[
    'accounting_period','bank_transaction','ledger_entry','recon_group','recon_payee_memory'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS bu_isolation ON %I', tbl);
    EXECUTE format($f$
      CREATE POLICY bu_isolation ON %I FOR ALL
      USING (
        current_setting('app.current_bu', true) IS NULL
        OR current_setting('app.current_bu', true) = ''
        OR bu = current_setting('app.current_bu', true)
      )
      WITH CHECK (
        current_setting('app.current_bu', true) IS NULL
        OR current_setting('app.current_bu', true) = ''
        OR bu = current_setting('app.current_bu', true)
      )
    $f$, tbl);
  END LOOP;
END $$;

-- recon_rule: bu NULL vale para ambas as BUs.
DROP POLICY IF EXISTS bu_isolation ON recon_rule;
CREATE POLICY bu_isolation ON recon_rule FOR ALL
  USING (
    current_setting('app.current_bu', true) IS NULL
    OR current_setting('app.current_bu', true) = ''
    OR bu IS NULL
    OR bu = current_setting('app.current_bu', true)
  )
  WITH CHECK (
    current_setting('app.current_bu', true) IS NULL
    OR current_setting('app.current_bu', true) = ''
    OR bu IS NULL
    OR bu = current_setting('app.current_bu', true)
  );

-- recon_match: deriva BU do grupo pai.
DROP POLICY IF EXISTS bu_isolation ON recon_match;
CREATE POLICY bu_isolation ON recon_match FOR ALL
  USING (
    current_setting('app.current_bu', true) IS NULL
    OR current_setting('app.current_bu', true) = ''
    OR EXISTS (
      SELECT 1 FROM recon_group g
      WHERE g.id = recon_match.group_id
        AND g.bu = current_setting('app.current_bu', true)
    )
  )
  WITH CHECK (
    current_setting('app.current_bu', true) IS NULL
    OR current_setting('app.current_bu', true) = ''
    OR EXISTS (
      SELECT 1 FROM recon_group g
      WHERE g.id = recon_match.group_id
        AND g.bu = current_setting('app.current_bu', true)
    )
  );

-- =============================================================================
-- FIM — Migration 003
-- =============================================================================

-- ─────────────────────────── 004 ───────────────────────────
-- =============================================================================
-- Migration 004 — Conciliação Inteligente: RLS hardening + source 'legacy'
-- =============================================================================
-- Endurece a segurança das tabelas recon_* / bank_transaction:
--   • REVOKE de todos os privilégios do role `anon` (a anon key NÃO deve ler
--     dados financeiros). O backend usa service role (erpAdmin), que faz BYPASS
--     RLS — não é afetado.
--   • RLS fail-closed: sem contexto de BU (GUC app.current_bu vazio) → NENHUMA
--     linha visível (antes era permissivo). service_role continua bypassando.
--   • bank_transaction.source passa a aceitar 'legacy' (backfill do schema antigo).
--
-- Idempotente. Execute UMA VEZ no Supabase SQL Editor (após a migration 003).
-- =============================================================================

-- 1) source 'legacy' para o backfill ------------------------------------------
ALTER TABLE bank_transaction DROP CONSTRAINT IF EXISTS bank_transaction_source_check;
ALTER TABLE bank_transaction ADD  CONSTRAINT bank_transaction_source_check
  CHECK (source IN ('cora_api','ofx','csv','legacy'));

-- 2) REVOKE anon — fail-closed no nível de privilégio --------------------------
-- A anon key (role `anon`) não pode tocar nas tabelas recon_*. PostgREST passa a
-- responder 401/permission denied — exatamente o que a sonda de RLS espera.
REVOKE ALL ON
  accounting_period, bank_transaction, ledger_entry, recon_group,
  recon_match, recon_rule, recon_payee_memory
  FROM anon;
REVOKE ALL ON v_saldo_conciliado, v_consolidado_grupo FROM anon;

-- 3) RLS fail-closed para a role `authenticated` -------------------------------
-- (service_role faz BYPASS RLS por padrão; o backend continua lendo tudo.)
-- Sem app.current_bu setado, current_setting(...,true) = NULL → bu = NULL = NULL
-- → não-verdadeiro → linha negada. Fail-closed.
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'accounting_period','bank_transaction','ledger_entry','recon_group','recon_payee_memory'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS bu_isolation ON %I', tbl);
    EXECUTE format($f$
      CREATE POLICY bu_isolation ON %I FOR ALL TO authenticated
      USING      (bu = current_setting('app.current_bu', true))
      WITH CHECK (bu = current_setting('app.current_bu', true))
    $f$, tbl);
  END LOOP;
END $$;

-- recon_rule: bu pode ser NULL (vale p/ ambas) — fail-closed exige contexto.
DROP POLICY IF EXISTS bu_isolation ON recon_rule;
CREATE POLICY bu_isolation ON recon_rule FOR ALL TO authenticated
  USING (
    current_setting('app.current_bu', true) IS NOT NULL
    AND current_setting('app.current_bu', true) <> ''
    AND (bu IS NULL OR bu = current_setting('app.current_bu', true))
  )
  WITH CHECK (
    current_setting('app.current_bu', true) IS NOT NULL
    AND current_setting('app.current_bu', true) <> ''
    AND (bu IS NULL OR bu = current_setting('app.current_bu', true))
  );

-- recon_match: deriva a BU do grupo pai — fail-closed.
DROP POLICY IF EXISTS bu_isolation ON recon_match;
CREATE POLICY bu_isolation ON recon_match FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recon_group g
      WHERE g.id = recon_match.group_id
        AND g.bu = current_setting('app.current_bu', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recon_group g
      WHERE g.id = recon_match.group_id
        AND g.bu = current_setting('app.current_bu', true)
    )
  );

-- =============================================================================
-- FIM — Migration 004
-- =============================================================================

-- ─────────────────────────── 005 ───────────────────────────
-- =============================================================================
-- Migration 005 — Conciliação Inteligente: bu_bank_account + legado ENERDY
-- =============================================================================
-- Fix 1: mapeamento BU↔conta vira TABELA auditável (não mais parâmetro de body).
-- Fix 2: legado rotulado 'ENERDY' é SINALIZADO para classificação (não decidido).
--
-- Idempotente. Aplicar após 003 e 004. Não regride nada.
-- =============================================================================

-- ── Fix 1: bu_bank_account ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bu_bank_account (
  account_id text PRIMARY KEY,        -- id da conta (o mesmo account_id gravado em bank_transaction)
  bu         text NOT NULL CHECK (bu IN ('AWQ','ENRD')),
  label      text,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Seed das entidades LEGADAS conhecidas (não-sensível — já são constantes do app,
-- todas AWQ-side). Contas Cora reais NÃO são commitadas: o operador preenche o
-- placeholder abaixo no SQL Editor. Entidades fora desta lista (Intercompany,
-- Socio_PF, Unknown) ficam DE FORA de propósito → fail-closed no backfill.
INSERT INTO bu_bank_account (account_id, bu, label) VALUES
  ('AWQ_Holding', 'AWQ', 'AWQ Holding (legado)'),
  ('JACQES',      'AWQ', 'JACQES (legado)'),
  ('ENERDY',      'AWQ', 'ENERDY (legado — sujeito a reclassificação)'),
  ('Caza_Vision', 'AWQ', 'Caza Vision (legado)')
ON CONFLICT (account_id) DO NOTHING;

-- 🔧 INPUT do operador (rodar no SQL Editor, NÃO commitar IDs reais):
--   insert into bu_bank_account (account_id, bu, label) values
--     ('<CORA_ACCOUNT_AWQ>',  'AWQ',  'Cora AWQ')
--    ,('<CORA_ACCOUNT_ENRD>', 'ENRD', 'Cora Enerdy')   -- quando a conta da Enerdy entrar
--   on conflict (account_id) do nothing;

-- ── Fix 2: marcação do legado ENERDY em ledger_entry ─────────────────────────
ALTER TABLE ledger_entry ADD COLUMN IF NOT EXISTS legacy_label         text;
ALTER TABLE ledger_entry ADD COLUMN IF NOT EXISTS needs_classification boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_ledger_needs_classif ON ledger_entry (bu, needs_classification)
  WHERE needs_classification = true;

-- View de revisão: lançamentos legado ENERDY aguardando decisão contábil.
CREATE OR REPLACE VIEW v_legado_enerdy_revisao AS
SELECT le.id, le.bu, le.amount, le.due_date, le.counterparty, le.doc_ref,
       le.categoria, le.is_intercompany, le.needs_classification
FROM ledger_entry le
WHERE le.legacy_label = 'ENERDY' AND le.needs_classification = true
ORDER BY le.due_date;

-- RLS + grants coerentes com 003/004 (bu_bank_account é referência por BU).
ALTER TABLE bu_bank_account ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON bu_bank_account FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON bu_bank_account TO authenticated;
GRANT SELECT ON v_legado_enerdy_revisao TO authenticated;
REVOKE ALL ON v_legado_enerdy_revisao FROM anon;

DROP POLICY IF EXISTS bu_isolation ON bu_bank_account;
CREATE POLICY bu_isolation ON bu_bank_account FOR ALL TO authenticated
  USING      (bu = current_setting('app.current_bu', true))
  WITH CHECK (bu = current_setting('app.current_bu', true));

-- =============================================================================
-- FIM — Migration 005
-- =============================================================================

-- ─────────────────── BACKFILL (legado → novo) ───────────────────
-- BU resolvido por bu_bank_account (entity não mapeada NÃO entra). Dedupe (bu,e2e_id).
insert into bank_transaction (bu, account_id, posted_at, amount, counterparty, raw_descr, e2e_id, source)
select m.bu, bt.entity,
       (bt.transaction_date || ' 12:00:00-03')::timestamptz,
       case when bt.direction = 'debit' then -abs(bt.amount) else abs(bt.amount) end,
       bt.counterparty_name, bt.description_original, 'legacy:' || bt.id, 'legacy'
from bank_transactions bt
join bu_bank_account m on m.account_id = bt.entity and m.active
where bt.transaction_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
on conflict (bu, e2e_id) do nothing;

-- ─────────────────── Fila de classificação ENERDY (Fix 2) ───────────────────
-- ledger provisório por tx ENERDY (doc_ref carrega o id da tx p/ linkar). Idempotente.
insert into ledger_entry (bu,kind,amount,open_amount,categoria,conta_contabil,counterparty,due_date,doc_ref,origem,status,is_intercompany,legacy_label,needs_classification)
select bt.bu, case when bt.direction='IN' then 'AR' else 'AP' end, abs(bt.amount), 0,
       'a_classificar','a_classificar', bt.counterparty, bt.value_date,
       'enerdy:'||bt.id, 'banco','conciliado', false, 'ENERDY', true
from bank_transaction bt
where bt.account_id='ENERDY' and bt.bu='AWQ'
  and not exists (select 1 from recon_match m where m.bank_tx_id = bt.id);

do $$
declare r record; gid uuid;
begin
  for r in select le.id le_id, le.amount, substring(le.doc_ref from 8)::uuid tx_id
           from ledger_entry le
           where le.legacy_label='ENERDY' and le.needs_classification and le.doc_ref like 'enerdy:%'
             and not exists (select 1 from recon_match m where m.ledger_id = le.id)
  loop
    insert into recon_group (bu,confidence,method,state,matched_by)
      values ('AWQ',0,'manual','suggested','backfill-enerdy') returning id into gid;
    insert into recon_match (group_id, bank_tx_id, ledger_id, applied_amount)
      values (gid, r.tx_id, r.le_id, r.amount);
    update bank_transaction set recon_status='matched' where id = r.tx_id;
  end loop;
end $$;

-- Conferência:
select bu, count(*) total, count(*) filter (where recon_status in ('matched','partial')) conciliado,
       count(*) filter (where recon_status='unmatched') excecoes from bank_transaction group by bu order by bu;
select count(*) as enerdy_aguardando_classificacao from v_legado_enerdy_revisao;
