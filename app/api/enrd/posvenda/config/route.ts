// GET/PUT /api/enrd/posvenda/config — parâmetros de custeio editáveis.
// GET: config efetiva (DEFAULT + override). PUT: salva override. Auth via middleware.

import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/enrd-posvenda-db";
import { DEFAULT_POSVENDA_CONFIG, type PosVendaConfig } from "@/lib/enrd-posvenda-config";
import { requireSession } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const config = await getConfig();
  return NextResponse.json({ ok: true, config, defaults: DEFAULT_POSVENDA_CONFIG });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  const userEmail = auth.email ?? null;
  try {
    const body = (await req.json()) as Partial<PosVendaConfig>;
    // Merge sobre o DEFAULT — evita gravar config parcial inconsistente.
    const merged: PosVendaConfig = { ...DEFAULT_POSVENDA_CONFIG, ...(await getConfig()), ...body };
    await saveConfig(merged, userEmail);
    return NextResponse.json({ ok: true, config: merged });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
