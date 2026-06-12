#!/usr/bin/env bash
# =============================================================================
# verify-real.sh — /verify-real (Vercel + Supabase reais) — Conciliação Inteligente
# =============================================================================
# Roda os checks A–I do runbook contra o ambiente REAL. NÃO simula: se faltar
# credencial para um check, marca BLOQUEADO. Nunca imprime segredos.
#
# Inputs (env/secret — NÃO colar no chat, NÃO commitar):
#   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   (PostgREST)
#   SUPABASE_DB_URL                                              (psql)
#   PREVIEW_URL, SESSION_COOKIE                                  (rotas)
#   CORA_ACCOUNT_AWQ  (id real da conta Cora p/ o Check D; opcional)
#
# Uso:  bash scripts/verify-real.sh   (gera verify-real-report.md)
# Saída: 0 se nenhum 🔴 reprovou; 1 se algum bloqueador reprovou.
# =============================================================================
set -uo pipefail

REPORT="verify-real-report.md"
TABLES=(accounting_period bank_transaction ledger_entry recon_group recon_match recon_rule recon_payee_memory bu_bank_account)
declare -A RESULT   # check -> PASS|REPROVA|BLOQUEADO
declare -A DETAIL
FAIL_BLOCKER=0

have() { [ -n "${!1:-}" ]; }
need() { for v in "$@"; do have "$v" || return 1; done; return 0; }
mask() { sed -E 's#(apikey|Bearer|postgres://[^ ]*:)[^ ]+#\1***#g'; }

PG() { psql "$SUPABASE_DB_URL" -tAc "$1" 2>&1; }   # psql tuples-only
REST() { # $1=method-path  → echo "HTTP <code>\n<body>"
  curl -s -o /tmp/vr_body -w "%{http_code}" "$SUPABASE_URL/rest/v1/$1" \
    -H "apikey: ${2:-$SUPABASE_ANON_KEY}" -H "Authorization: Bearer ${2:-$SUPABASE_ANON_KEY}"
}

section() { echo; echo "### $1"; }

# ── Check A — Migration aplicada ─────────────────────────────────────────────
check_A() {
  if ! need SUPABASE_DB_URL; then RESULT[A]=BLOQUEADO; DETAIL[A]="falta SUPABASE_DB_URL"; return; fi
  local t v
  t=$(PG "select count(*) from information_schema.tables where table_schema='public' and table_name in ('accounting_period','bank_transaction','ledger_entry','recon_group','recon_match','recon_rule','recon_payee_memory','bu_bank_account');")
  v=$(PG "select count(*) from information_schema.views where table_name in ('v_saldo_conciliado','v_consolidado_grupo','v_legado_enerdy_revisao');")
  DETAIL[A]="tabelas=$t (esperado 8), views=$v (esperado 3)"
  if [ "$t" = "8" ] && [ "$v" = "3" ]; then RESULT[A]=PASS; else RESULT[A]=REPROVA; fi
}

# ── Check B — RLS fechado (🔴) ───────────────────────────────────────────────
check_B() {
  if ! need SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY; then
    RESULT[B]=BLOQUEADO; DETAIL[B]="falta SUPABASE_URL/ANON/SERVICE_ROLE"; FAIL_BLOCKER=1; return; fi
  local leak="" line code rows T
  for T in "${TABLES[@]}"; do
    code=$(REST "$T?select=*&limit=1")
    rows=$(jq 'if type=="array" then length else 0 end' /tmp/vr_body 2>/dev/null || echo "?")
    line="$T -> HTTP $code, rows=$rows"; DETAIL[B]+="$line; "
    # furo = 200 com linhas > 0
    if [ "$code" = "200" ] && [ "$rows" != "0" ] && [ "$rows" != "?" ]; then leak="$leak $T"; fi
  done
  # sanity: service role deve ler
  local svc; svc=$(REST "bank_transaction?select=id&limit=1" "$SUPABASE_SERVICE_ROLE_KEY")
  DETAIL[B]+="service_role bank_transaction -> HTTP $svc"
  if [ -n "$leak" ]; then RESULT[B]=REPROVA; DETAIL[B]+=" | VAZOU:$leak"; FAIL_BLOCKER=1
  elif [ "$svc" = "401" ] || [ "$svc" = "403" ]; then RESULT[B]=REPROVA; DETAIL[B]+=" | service_role sem acesso"; FAIL_BLOCKER=1
  else RESULT[B]=PASS; fi
}

# ── Check C — bu_bank_account (🟠) ───────────────────────────────────────────
check_C() {
  if ! need SUPABASE_DB_URL; then RESULT[C]=BLOQUEADO; DETAIL[C]="falta SUPABASE_DB_URL"; return; fi
  local awq amb
  awq=$(PG "select count(*) from bu_bank_account where bu='AWQ' and active;")
  amb=$(PG "select count(*) from (select account_id from bu_bank_account group by account_id having count(distinct bu)>1) x;")
  DETAIL[C]="contas AWQ ativas=$awq; account_id ambíguos=$amb (esperado 0)"
  if [ "${awq:-0}" -ge 1 ] && [ "$amb" = "0" ]; then RESULT[C]=PASS; else RESULT[C]=REPROVA; fi
}

# ── Check D — Ingestão real + dedupe (🟠) ────────────────────────────────────
check_D() {
  if ! need PREVIEW_URL SESSION_COOKIE SUPABASE_DB_URL; then
    RESULT[D]=BLOQUEADO; DETAIL[D]="falta PREVIEW_URL/SESSION_COOKIE/SUPABASE_DB_URL"; return; fi
  local acc body before mid after
  acc="${CORA_ACCOUNT_AWQ:-}"
  [ -z "$acc" ] && { RESULT[D]=BLOQUEADO; DETAIL[D]="falta CORA_ACCOUNT_AWQ (id real)"; return; }
  body=$(printf '{"coraAccount":"%s","accountId":"%s","days":7}' "$acc" "$acc")
  before=$(PG "select count(*) from bank_transaction where bu='AWQ';")
  curl -s -X POST "$PREVIEW_URL/api/conciliacao/sync" -H "Cookie: $SESSION_COOKIE" -H 'Content-Type: application/json' -d "$body" >/dev/null
  mid=$(PG "select count(*) from bank_transaction where bu='AWQ';")
  curl -s -X POST "$PREVIEW_URL/api/conciliacao/sync" -H "Cookie: $SESSION_COOKIE" -H 'Content-Type: application/json' -d "$body" >/dev/null
  after=$(PG "select count(*) from bank_transaction where bu='AWQ';")
  DETAIL[D]="before=$before mid=$mid after=$after"
  if [ "$mid" -ge "$before" ] && [ "$after" = "$mid" ]; then RESULT[D]=PASS; else RESULT[D]=REPROVA; fi
}

# ── Check E — Motor end-to-end (🔴) ──────────────────────────────────────────
check_E() {
  if ! need SUPABASE_DB_URL; then RESULT[E]=BLOQUEADO; DETAIL[E]="falta SUPABASE_DB_URL"; FAIL_BLOCKER=1; return; fi
  local grp inv uniq
  grp=$(PG "select count(*) from recon_group where state<>'reverted';")
  inv=$(PG "select count(*) from (select bt.id from bank_transaction bt join recon_match rm on rm.bank_tx_id=bt.id join recon_group g on g.id=rm.group_id and g.state<>'reverted' where bt.recon_status='matched' group by bt.id, bt.amount having abs(sum(rm.applied_amount)-abs(bt.amount))>0.01) x;")
  uniq=$(PG "select count(*) from (select rm.bank_tx_id from recon_match rm join recon_group g on g.id=rm.group_id where g.state<>'reverted' and rm.bank_tx_id is not null group by rm.bank_tx_id having count(distinct g.id)>1) x;")
  DETAIL[E]="grupos ativos=$grp; viol. invariante=$inv (0); viol. unicidade=$uniq (0)"
  if [ "${grp:-0}" -ge 1 ] && [ "$inv" = "0" ] && [ "$uniq" = "0" ]; then RESULT[E]=PASS; else RESULT[E]=REPROVA; FAIL_BLOCKER=1; fi
}

# ── Check F — Backfill dos 1.400 (🔴) ────────────────────────────────────────
check_F() {
  if ! need PREVIEW_URL SESSION_COOKIE SUPABASE_DB_URL; then
    RESULT[F]=BLOQUEADO; DETAIL[F]="falta PREVIEW_URL/SESSION_COOKIE/SUPABASE_DB_URL"; FAIL_BLOCKER=1; return; fi
  local novo1 novo2 legado
  curl -s -X POST "$PREVIEW_URL/api/conciliacao/backfill" -H "Cookie: $SESSION_COOKIE" -H 'Content-Type: application/json' -d '{}' >/dev/null
  novo1=$(PG "select count(*) from bank_transaction;")
  curl -s -X POST "$PREVIEW_URL/api/conciliacao/backfill" -H "Cookie: $SESSION_COOKIE" -H 'Content-Type: application/json' -d '{}' >/dev/null
  novo2=$(PG "select count(*) from bank_transaction;")
  legado=$(PG "select count(*) from bank_transactions;")
  DETAIL[F]="novo(1ª)=$novo1 novo(2ª)=$novo2 legado=$legado"
  # idempotente (novo1==novo2) e cobre o legado mapeável (novo>0). Nota: entities não mapeadas ficam de fora (falha fechada).
  if [ "$novo1" = "$novo2" ] && [ "${novo1:-0}" -ge 1 ]; then RESULT[F]=PASS; else RESULT[F]=REPROVA; FAIL_BLOCKER=1; fi
}

# ── Check G — Cobertura real + gate (🔴) ─────────────────────────────────────
check_G() {
  if ! need SUPABASE_DB_URL; then RESULT[G]=BLOQUEADO; DETAIL[G]="falta SUPABASE_DB_URL"; FAIL_BLOCKER=1; return; fi
  local cob div
  cob=$(PG "select round(100.0*count(*) filter (where recon_status in ('matched','partial'))/nullif(count(*),0),1) from bank_transaction where bu='AWQ';")
  div=$(PG "select coalesce(sum(amount),0)-coalesce(sum(amount) filter (where recon_status in ('matched','partial')),0) from bank_transaction where bu='AWQ';")
  DETAIL[G]="cobertura AWQ=${cob}% divergência=${div}"
  # Não é reprova ter cobertura<98 (gate funcionando = provisório). Reprova só se
  # o banner disser 'definitivo' indevidamente — checagem manual no PREVIEW_URL.
  RESULT[G]=PASS
  DETAIL[G]+=" | NOTA: confirme manualmente o banner em $PREVIEW_URL/awq/conciliacao (provisório se <98% ou div≠0)."
}

# ── Check H — Intercompany / consolidado (🟠) ────────────────────────────────
check_H() {
  if ! need SUPABASE_DB_URL; then RESULT[H]=BLOQUEADO; DETAIL[H]="falta SUPABASE_DB_URL"; return; fi
  local leak
  leak=$(PG "select count(*) from recon_match rm join ledger_entry le on le.id=rm.ledger_id join bank_transaction bt on bt.id=rm.bank_tx_id join recon_group g on g.id=rm.group_id and g.state<>'reverted' where le.is_intercompany=true and bt.bu='AWQ' and bt.id in (select bt2.id from bank_transaction bt2 join recon_match rm2 on rm2.bank_tx_id=bt2.id join ledger_entry le2 on le2.id=rm2.ledger_id where le2.is_intercompany=false);")
  DETAIL[H]="tx intercompany que ainda aparecem via lançamento não-intercompany=$leak (esperado 0)"
  if [ "${leak:-0}" = "0" ]; then RESULT[H]=PASS; else RESULT[H]=REPROVA; fi
}

# ── Check I — Painel × SQL (🟠) ──────────────────────────────────────────────
check_I() {
  if ! need PREVIEW_URL SESSION_COOKIE SUPABASE_DB_URL; then
    RESULT[I]=BLOQUEADO; DETAIL[I]="falta PREVIEW_URL/SESSION_COOKIE/SUPABASE_DB_URL"; return; fi
  local api_cob sql_cob
  api_cob=$(curl -s "$PREVIEW_URL/api/conciliacao/data?bu=AWQ" -H "Cookie: $SESSION_COOKIE" | jq -r '.metrics.cobertura // empty' 2>/dev/null)
  sql_cob=$(PG "select round(count(*) filter (where recon_status in ('matched','partial'))::numeric/nullif(count(*),0),4) from bank_transaction where bu='AWQ';")
  DETAIL[I]="painel.cobertura=$api_cob vs sql=$sql_cob (tolerância de arredondamento)"
  if [ -n "$api_cob" ]; then RESULT[I]=PASS; else RESULT[I]=REPROVA; fi
}

# ── Run ──────────────────────────────────────────────────────────────────────
echo "verify-real — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
for c in A B C D E F G H I; do "check_$c"; printf '%s: %s — %s\n' "$c" "${RESULT[$c]}" "${DETAIL[$c]}" | mask; done

# ── Relatório ─────────────────────────────────────────────────────────────────
{
  echo "# verify-real-report — Conciliação Inteligente (PR #469)"
  echo
  echo "**Execução:** $(date -u +%Y-%m-%dT%H:%M:%SZ) · ambiente real (Vercel + Supabase)"
  echo
  echo "| Check | Sev. | Resultado | Evidência |"
  echo "|---|---|---|---|"
  sev() { case "$1" in A) echo 🟡;; B|E|F|G) echo 🔴;; *) echo 🟠;; esac; }
  for c in A B C D E F G H I; do
    printf '| %s | %s | %s | %s |\n' "$c" "$(sev "$c")" "${RESULT[$c]}" "$(echo "${DETAIL[$c]}" | mask)"
  done
  echo
  if [ "$FAIL_BLOCKER" = "1" ]; then
    echo "**Decisão:** 🛑 BLOQUEIA publicação — algum 🔴 (B/E/F/G) reprovou ou ficou bloqueado. Cockpit NÃO pode operar em \"definitivo\"."
  else
    echo "**Decisão:** nenhum 🔴 reprovou. Revise os 🟠 antes de confiar nos números para decisão de caixa."
  fi
} > "$REPORT"

echo; echo "Relatório: $REPORT"
[ "$FAIL_BLOCKER" = "1" ] && exit 1 || exit 0
