// ─── GET /api/cora/balance ────────────────────────────────────────────────────
// Returns the current available balance from the Cora bank account.
// Supports both the main account (AWQ Holding) and the JACQES account
// via separate env var sets (CORA_JACQES_*).

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { fetchCoraBalance, isCoraConfigured, fetchCoraBalanceForAccount } from "@/lib/cora-api";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!authToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

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

  try {
    const balance = account === "JACQES"
      ? await fetchCoraBalanceForAccount("JACQES")
      : await fetchCoraBalance();

    return NextResponse.json({ account, ...balance });
  } catch (err) {
    console.error("[GET /api/cora/balance]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao buscar saldo da Cora" },
      { status: 502 },
    );
  }
}
