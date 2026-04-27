#!/usr/bin/env bash
# ─── AWQ EPM Platform — Supabase Deploy Script ────────────────────────────────
# Usage:
#   chmod +x deploy-supabase.sh
#   ./deploy-supabase.sh <PROJECT_REF> <DB_PASSWORD> <ACCESS_TOKEN>
#
# Where to get values:
#   PROJECT_REF   → supabase.com/dashboard/project/<REF>
#   DB_PASSWORD   → senha definida ao criar o projeto
#   ACCESS_TOKEN  → supabase.com → Account → Access Tokens → Generate

set -euo pipefail

PROJECT_REF="${1:-${SUPABASE_PROJECT_REF:-}}"
DB_PASSWORD="${2:-${SUPABASE_DB_PASSWORD:-}}"
ACCESS_TOKEN="${3:-${SUPABASE_ACCESS_TOKEN:-}}"

# ── Validate inputs ────────────────────────────────────────────────────────────
if [[ -z "$PROJECT_REF" || -z "$DB_PASSWORD" || -z "$ACCESS_TOKEN" ]]; then
  echo ""
  echo "❌  Credenciais faltando. Use:"
  echo ""
  echo "    ./deploy-supabase.sh PROJECT_REF DB_PASSWORD ACCESS_TOKEN"
  echo ""
  echo "Onde obter:"
  echo "  PROJECT_REF   → supabase.com/dashboard/project/<REF>"
  echo "  DB_PASSWORD   → senha definida ao criar o projeto"
  echo "  ACCESS_TOKEN  → supabase.com → Account → Access Tokens"
  exit 1
fi

echo ""
echo "══════════════════════════════════════════════════"
echo "  AWQ EPM Platform — Supabase Deploy"
echo "══════════════════════════════════════════════════"
echo ""

# ── 1. Authenticate ────────────────────────────────────────────────────────────
echo "▶ [1/5] Autenticando no Supabase..."
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
supabase login --no-browser 2>/dev/null || true

# ── 2. Link project ────────────────────────────────────────────────────────────
echo "▶ [2/5] Vinculando ao projeto $PROJECT_REF..."
supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD"

# ── 3. Apply schema ───────────────────────────────────────────────────────────
echo "▶ [3/5] Aplicando schema (32 tabelas + 11 views)..."
supabase db push --password "$DB_PASSWORD"

# ── 4. Deploy Edge Functions ──────────────────────────────────────────────────
echo "▶ [4/5] Deployando Edge Functions..."
supabase functions deploy get-cashflow   --no-verify-jwt
supabase functions deploy add-transaction --no-verify-jwt
supabase functions deploy get-accounts   --no-verify-jwt

# ── 5. Fetch credentials and write .env.local ─────────────────────────────────
echo "▶ [5/5] Configurando variáveis de ambiente..."

SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

# Fetch anon key and service role key via Management API
KEYS_JSON=$(curl -s \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys")

ANON_KEY=$(echo "$KEYS_JSON" | grep -o '"anon":"[^"]*"' | cut -d'"' -f4)
SERVICE_KEY=$(echo "$KEYS_JSON" | grep -o '"service_role":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$ANON_KEY" ]]; then
  echo ""
  echo "⚠️  Não foi possível buscar as keys automaticamente."
  echo "   Copie manualmente do dashboard: Settings → API"
  echo "   e preencha o .env.local gerado abaixo."
  ANON_KEY="COLE_AQUI_A_ANON_KEY"
  SERVICE_KEY="COLE_AQUI_A_SERVICE_ROLE_KEY"
fi

cat > .env.local << EOF
# ── Supabase EPM Platform ──────────────────────────────────────────────────────
# Gerado automaticamente por deploy-supabase.sh

SUPABASE_URL=${SUPABASE_URL}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}

NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
EOF

echo ""
echo "══════════════════════════════════════════════════"
echo "  ✅  Deploy concluído com sucesso!"
echo "══════════════════════════════════════════════════"
echo ""
echo "  Projeto:     https://${PROJECT_REF}.supabase.co"
echo "  Studio:      https://supabase.com/dashboard/project/${PROJECT_REF}"
echo "  .env.local:  criado (revise as keys se necessário)"
echo ""
echo "  Próximo passo:"
echo "    npm run dev          → testar localmente"
echo "    git push             → deploy no Vercel"
echo ""
