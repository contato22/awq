// GET/PUT /api/ma/vesting — termos do vesting AWQ↔Enerdy (BU ENRD).
// GET: config + progresso REAL (valor acumulado vem do Cora, via reconciliação
// — mesma fonte do resto do BI). PUT: salva termos (fato contratual — nunca
// estimado; ver lib/awq-ma-vesting.ts).

import { NextRequest, NextResponse } from "next/server";
import {
  getVestingConfig,
  saveVestingConfig,
  getVestingProgressoReal,
  DEFAULT_VESTING_CONFIG,
  type VestingConfig,
} from "@/lib/awq-ma-vesting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const config = await getVestingConfig();
  const progresso = await getVestingProgressoReal(config);
  return NextResponse.json({ ok: true, config, progresso });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const userEmail = req.headers.get("x-user-email") ?? null;
  try {
    const body = (await req.json()) as Partial<VestingConfig>;
    const merged: VestingConfig = { ...DEFAULT_VESTING_CONFIG, ...(await getVestingConfig()), ...body };
    await saveVestingConfig(merged, userEmail);
    return NextResponse.json({ ok: true, config: merged, progresso: await getVestingProgressoReal(merged) });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
