#!/usr/bin/env bash
# setup-secrets.sh — configura GitHub Secrets e Vercel env vars de uma vez
# Requer: gh CLI + vercel CLI instalados e autenticados
# Uso:
#   export SUPABASE_URL=...
#   export SUPABASE_ANON_KEY=...
#   export SUPABASE_SERVICE_ROLE_KEY=...
#   bash scripts/setup-secrets.sh
#
# Nunca grave a service_role neste arquivo. A chave que já passou pelo git
# precisa ser rotacionada no dashboard do Supabase (o histórico não esquece).

set -euo pipefail

: "${SUPABASE_URL:?Exporte SUPABASE_URL antes de rodar.}"
: "${SUPABASE_ANON_KEY:?Exporte SUPABASE_ANON_KEY antes de rodar.}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Exporte SUPABASE_SERVICE_ROLE_KEY antes de rodar.}"

echo "━━ 1/2 GitHub Secrets ━━"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY" --repo contato22/awq
gh secret set SUPABASE_ANON_KEY         --body "$SUPABASE_ANON_KEY"         --repo contato22/awq
echo "GitHub Secrets configurados"

echo ""
echo "━━ 2/2 Vercel Environment Variables ━━"
echo "$SUPABASE_URL"              | vercel env add SUPABASE_URL              production --force
echo "$SUPABASE_URL"              | vercel env add NEXT_PUBLIC_SUPABASE_URL  production --force
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --force
echo "$SUPABASE_ANON_KEY"         | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force
echo "Vercel env vars configuradas"

echo ""
echo "━━ Disparando re-deploy ━━"
vercel --prod --yes 2>/dev/null || echo "Re-deploy manual necessário no painel Vercel"

echo ""
echo "Setup completo. Aguarde o deploy terminar e verifique as páginas."
