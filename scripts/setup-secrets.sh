#!/usr/bin/env bash
# setup-secrets.sh — configura GitHub Secrets e Vercel env vars de uma vez
# Requer: gh CLI + vercel CLI instalados e autenticados
#
# Uso:
#   export SUPABASE_URL="https://<projeto>.supabase.co"
#   export SUPABASE_ANON_KEY="<anon-jwt>"
#   export SUPABASE_SERVICE_ROLE_KEY="<service-role-jwt>"
#   bash scripts/setup-secrets.sh
#
# SEGURANÇA: nunca commitar segredos neste arquivo. Os valores DEVEM vir do
# ambiente do operador (Vercel Dashboard / 1Password / etc). Versões antigas
# deste script tinham service_role keys hardcoded e foram comprometidas —
# se vier de pre-2026-06, rotacione todas as chaves no Supabase Dashboard.

set -euo pipefail

: "${SUPABASE_URL:?SUPABASE_URL não setado. Exporte antes de rodar.}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY não setado. Exporte antes de rodar.}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY não setado. Exporte antes de rodar.}"

REPO="${GITHUB_REPO:-contato22/awq}"

echo "━━ 1/2 GitHub Secrets ($REPO) ━━"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY" --repo "$REPO"
gh secret set SUPABASE_ANON_KEY         --body "$SUPABASE_ANON_KEY"         --repo "$REPO"
echo "✅ GitHub Secrets configurados"

echo ""
echo "━━ 2/2 Vercel Environment Variables ━━"
printf '%s' "$SUPABASE_URL"              | vercel env add SUPABASE_URL                   production --force
printf '%s' "$SUPABASE_URL"              | vercel env add NEXT_PUBLIC_SUPABASE_URL       production --force
printf '%s' "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY      production --force
printf '%s' "$SUPABASE_ANON_KEY"         | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY  production --force
echo "✅ Vercel env vars configuradas"

echo ""
echo "━━ Disparando re-deploy ━━"
vercel --prod --yes 2>/dev/null || echo "ℹ️  Re-deploy manual necessário no painel Vercel"

echo ""
echo "✅ Setup completo. Aguarde o deploy terminar e verifique as páginas."
