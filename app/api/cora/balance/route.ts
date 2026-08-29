// ─── GET /api/cora/balance —————————————————————————————————————————————————————————————
// Returns the current available balance from the Cora bank account.
// Supports both the main account (AWQ Holding) and the JACQES account
// via separate env var sets (CORA_JACQES_*).
// Returns isFallback=true when JACQES has no own credentials (shares AWQ Holding account).

import { NextRequest, NextResponse } from "next/server";
import { fetchCoraBalance, isCoraConfigured, fetchCoraBalanceForAccount, isCoraJacqesConfigured, isCoraEnerdyConfigured, type CoraAccount } from "@/lib/cora-api";
import { getAuthIdentity, unauthorized } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth — re-decodifica JWT direto (não confia em headers do middleware)
  const identity = await getAuthIdentity(req);
  if (!identity) return unauthorized();

  if (!isCoraConfigured()) {
    return NextResponse.json(
      {
        error: "Integração Cora não configurada.",
        hint: "Configure CORA_CLIENT_ID, CORA_CERT e CORA_KEY no painel do Vercel.",
      },
      { status: 501 },
    );
  }

  const account = req.nextUrl.searchParams.get("account") ?? "AWQ_Holding";

  const knownAccounts: CoraAccount[] = ["AWQ_Holding", "JACQES", "ENERDY"];
  const resolvedAccount: CoraAccount = knownAccounts.includes(account as CoraAccount)
    ? (account as CoraAccount)
    : "AWQ_Holding";

  try {
    const balance = resolvedAccount !== "AWQ_Holding"
      ? await fetchCoraBalanceForAccount(resolvedAccount)
      : await fetchCoraBalance();

    const isFallback =
      (resolvedAccount === "JACQES" && !isCoraJacqesConfigured()) ||
      (resolvedAccount === "ENERDY" && !isCoraEnerdyConfigured());
    return NextResponse.json({ account: resolvedAccount, ...balance, isFallback });
  } catch (err) {
    console.error("[GET /api/cora/balance]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao buscar saldo da Cora" },
      { status: 502 },
    );
  }
}
