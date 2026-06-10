#!/usr/bin/env bash
# Seed AR entries for JACQES clients — Jun to Dec 2026
# Run once: bash scripts/seed-jacqes-ar-2026.sh

BASE_URL="${AR_SEED_BASE_URL:-https://awq-brown.vercel.app}"
ENDPOINT="$BASE_URL/api/epm/ar"

post_ar() {
  local customer="$1"
  local amount="$2"
  local due_date="$3"
  local account_code="$4"

  local payload
  payload=$(cat <<JSON
{
  "bu_code": "JACQES",
  "customer_name": "$customer",
  "description": "Serviço recorrente JACQES — $due_date",
  "category": "Serviço Recorrente",
  "due_date": "$due_date",
  "issue_date": "$due_date",
  "gross_amount": $amount,
  "account_code": "$account_code",
  "iss_rate": 0.05,
  "source_system": "seed-2026"
}
JSON
)

  echo "→ $customer  R\$ $amount  venc $due_date"
  local resp
  resp=$(curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$payload")
  local ok
  ok=$(echo "$resp" | grep -o '"success":true')
  if [ -n "$ok" ]; then
    echo "  ✓ criado"
  else
    echo "  ✗ erro: $resp"
  fi
}

echo ""
echo "=== CEM — R\$ 3.200 (Tier 3) — venc dia 5 ==="
for month in 06 07 08 09 10 11 12; do
  post_ar "CEM" 3200 "2026-${month}-05" "1.1.2.1.1.3"
done

echo ""
echo "=== ANDRÉ VIEIRA — R\$ 2.300 (Custom/Enterprise) — venc dia 15 ==="
for month in 06 07 08 09 10 11 12; do
  post_ar "ANDRÉ VIEIRA" 2300 "2026-${month}-15" "1.1.2.1.1.4"
done

echo ""
echo "=== CARDIO CAT — R\$ 1.790 (Tier 2) — venc dia 5 ==="
for month in 06 07 08 09 10 11 12; do
  post_ar "CARDIO CAT" 1790 "2026-${month}-05" "1.1.2.1.1.2"
done

echo ""
echo "Done. Total de 21 lançamentos JACQES Jun–Dez 2026."
echo "MRR: R\$ 7.290 | ARR (7 meses): R\$ 51.030"
