#!/usr/bin/env bash
# setup-secrets.sh — configura GitHub Secrets e Vercel env vars de uma vez
# Requer: gh CLI + vercel CLI instalados e autenticados
# Uso: bash scripts/setup-secrets.sh

set -e

SUPABASE_URL="https://gqkgsoglgubmaborixfb.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa2dzb2dsZ3VibWFib3JpeGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDYzODQsImV4cCI6MjA5NDE4MjM4NH0.jcJ_qljaUZVXiYKKhfYJrr57GKmJ0aDIjFL1sdqFLT8"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxa2dzb2dsZ3VibWFib3JpeGZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYwNjM4NCwiZXhwIjoyMDk0MTgyMzg0fQ.M1o1TG_SbUHaw_d0ifAMAHVxGOJfV6dxDll2EmBoPPo"

echo "━━ 1/2 GitHub Secrets ━━"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY" --repo contato22/awq
gh secret set SUPABASE_ANON_KEY         --body "$SUPABASE_ANON_KEY"         --repo contato22/awq
echo "✅ GitHub Secrets configurados"

echo ""
echo "━━ 2/2 Vercel Environment Variables ━━"
echo "$SUPABASE_URL"              | vercel env add SUPABASE_URL              production --force
echo "$SUPABASE_URL"              | vercel env add NEXT_PUBLIC_SUPABASE_URL  production --force
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --force
echo "$SUPABASE_ANON_KEY"         | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force
echo "✅ Vercel env vars configuradas"

echo ""
echo "━━ Disparando re-deploy ━━"
vercel --prod --yes 2>/dev/null || echo "ℹ️  Re-deploy manual necessário no painel Vercel"

echo ""
echo "✅ Setup completo. Aguarde o deploy terminar e verifique as páginas."
