#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────────────────
# Lança 4 clientes JACQES no CRM + PPM, autenticado como awqmac@gmail.com (Danilo)
#
# Uso:
#   BASE_URL=https://awq-brown.vercel.app \
#   EMAIL=awqmac@gmail.com PASSWORD='Eqoa.me22' \
#   bash scripts/seed-jacqes-clients-as-danilo.sh
#
# Requisitos: curl + jq
# ───────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE_URL="${BASE_URL:-https://awq-brown.vercel.app}"
EMAIL="${EMAIL:-awqmac@gmail.com}"
PASSWORD="${PASSWORD:-Eqoa.me22}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

CURL=(curl -sS -b "$JAR" -c "$JAR" -H "Accept: application/json")
TODAY=$(date +%Y-%m-%d)
ONE_YEAR=$(date -d "+1 year" +%Y-%m-%d 2>/dev/null || date -v+1y +%Y-%m-%d)
OWNER="Danilo Jaques Jacinto"

step() { printf "\n▶ %s\n" "$*"; }
fail() { printf "✗ %s\n" "$*" >&2; exit 1; }

# ─── 1. CSRF ──────────────────────────────────────────────────────────────────
step "Fetching CSRF token"
CSRF=$("${CURL[@]}" "$BASE_URL/api/auth/csrf" | jq -r .csrfToken)
[ -n "$CSRF" ] && [ "$CSRF" != "null" ] || fail "CSRF token vazio"
echo "  csrf=${CSRF:0:16}…"

# ─── 2. Login NextAuth (Credentials) ──────────────────────────────────────────
step "Logging in as $EMAIL"
LOGIN=$("${CURL[@]}" -X POST "$BASE_URL/api/auth/callback/credentials?json=true" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "json=true" \
  --data-urlencode "callbackUrl=$BASE_URL/jacqes")
echo "  login response: $LOGIN"

SESSION=$("${CURL[@]}" "$BASE_URL/api/auth/session")
USER_EMAIL=$(echo "$SESSION" | jq -r '.user.email // empty')
USER_ROLE=$(echo "$SESSION"  | jq -r '.user.role  // empty')
[ "$USER_EMAIL" = "$EMAIL" ] || fail "Login falhou (session=$SESSION)"
echo "  session: email=$USER_EMAIL role=$USER_ROLE"

# ─── 3. Helpers ───────────────────────────────────────────────────────────────
post_client() {
  local nome="$1" ticket="$2" segmento="$3"
  "${CURL[@]}" -X POST "$BASE_URL/api/jacqes/crm/clientes" \
    -H "Content-Type: application/json" \
    --data @<(cat <<JSON
{
  "nome": "$nome",
  "segmento": "$segmento",
  "produto_ativo": "Retainer mensal",
  "ticket_mensal": $ticket,
  "inicio_relacao": "$TODAY",
  "owner": "$OWNER",
  "status_conta": "Ativo",
  "health_score": 80,
  "churn_risk": "Baixo",
  "observacoes": "Cliente lançado por $OWNER em $TODAY"
}
JSON
)
}

post_ppm_project() {
  local nome="$1" ticket="$2"
  # Retainer mensal → projeção de 12 meses para budget_revenue
  local annual=$(awk "BEGIN{printf \"%.2f\", $ticket*12}")
  local cost=$(awk   "BEGIN{printf \"%.2f\", $ticket*12*0.40}")  # 40% custo
  "${CURL[@]}" -X POST "$BASE_URL/api/ppm/projects" \
    -H "Content-Type: application/json" \
    --data @<(cat <<JSON
{
  "project_name": "JACQES — Retainer: $nome",
  "bu_code": "JACQES",
  "customer_name": "$nome",
  "project_type": "retainer",
  "service_category": "consulting",
  "contract_type": "retainer",
  "start_date": "$TODAY",
  "planned_end_date": "$ONE_YEAR",
  "budget_revenue": $annual,
  "budget_cost": $cost,
  "billing_frequency": "monthly",
  "project_manager": "$OWNER",
  "description": "Contrato de retainer mensal de R\$ $ticket. Lançado por $OWNER em $TODAY.",
  "phase": "execution",
  "status": "active",
  "health_status": "green",
  "priority": "medium"
}
JSON
)
}

# ─── 4. Carga ─────────────────────────────────────────────────────────────────
declare -a CLIENTS=(
  "Escola Centro de Ensino Moderno (CEM)|3200|Educação"
  "Tatiana Simões|1790|Pessoa Física"
  "André Vieira|2300|Pessoa Física"
  "Dermo Ativo|1790|Saúde / Estética"
)

for entry in "${CLIENTS[@]}"; do
  IFS='|' read -r nome ticket segmento <<<"$entry"
  step "CRM ← $nome (R\$ $ticket/mês)"
  RESP=$(post_client "$nome" "$ticket" "$segmento")
  echo "  $RESP"
  CID=$(echo "$RESP" | jq -r '.id // empty')
  [ -n "$CID" ] || echo "  ⚠ sem id no response — pode ter falhado"

  step "PPM ← Retainer: $nome"
  PRESP=$(post_ppm_project "$nome" "$ticket")
  echo "  $PRESP"
done

step "Done — verificar em $BASE_URL/jacqes/crm/clientes e $BASE_URL/awq/ppm"
