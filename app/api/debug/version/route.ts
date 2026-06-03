// GET /api/debug/version
// Retorna informações do deploy ativo para diagnosticar staleness do Vercel.
// Bumpe DEPLOY_MARKER a cada PR significativo — assim você sabe qual versão o
// browser está vendo. Se o marker no JSON for diferente do esperado, o deploy
// não promoveu — vá em Vercel Dashboard → Deployments → Promote latest.

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bumpe a cada feature/fix que precise ser verificada no front.
const DEPLOY_MARKER = "v5-itau-btg-staticcards-offlinepanel-2026-06-03";

export async function GET() {
  return NextResponse.json({
    deployMarker:    DEPLOY_MARKER,
    timestamp:       new Date().toISOString(),
    commitSha:       process.env.VERCEL_GIT_COMMIT_SHA ?? "local-or-not-set",
    commitRef:       process.env.VERCEL_GIT_COMMIT_REF ?? "local-or-not-set",
    commitMessage:   process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
    commitAuthor:    process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN ?? null,
    deploymentUrl:   process.env.VERCEL_URL ?? null,
    deploymentEnv:   process.env.VERCEL_ENV ?? null,
    nodeEnv:         process.env.NODE_ENV,
    expectedFeatures: {
      staticBankCards_ItauBTG:  true,   // PR #272 — sidebar Contas bancárias
      itauBTGDropdownOptions:    true,   // PR #281 — board account selector
      offlineBanksPanel:         true,   // PR #284 — painel abaixo do Cora
      seedItauExtractRoute:      true,   // PR #286 — POST /api/setup/seed-itau-extract
    },
  });
}
