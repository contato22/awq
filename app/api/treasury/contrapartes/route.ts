// ─── GET/POST/DELETE /api/treasury/contrapartes ───────────────────────────────
//
// Cadastro de clientes e fornecedores (contrapartes).
// GET  ?q=&papel=&bu=&status=  → list / search
// GET  ?id=                    → get one
// POST { action: "upsert", contraparte }     → upsert
// POST { action: "soft_delete", id }         → soft delete

import { NextRequest, NextResponse } from "next/server";
import {
  listContrapartesDB,
  getContraparteDB,
  upsertContraparteDB,
  softDeleteContraparteDB,
  initContraparteDB,
} from "@/lib/contraparte-db";
import type { Contraparte } from "@/lib/contraparte-types";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initContraparteDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const sp     = req.nextUrl.searchParams;
    const id     = sp.get("id");
    if (id) {
      const c = await getContraparteDB(id);
      return c ? ok(c) : err("Not found", 404);
    }
    return ok(await listContrapartesDB({
      papel:  sp.get("papel")  ?? undefined,
      bu:     sp.get("bu")     ?? undefined,
      status: sp.get("status") ?? undefined,
      q:      sp.get("q")      ?? undefined,
    }));
  } catch (e) {
    return err(String(e), 500);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const body = await req.json();
    const { action } = body;

    if (action === "upsert") {
      const c = body.contraparte as Contraparte;
      if (!c?.id) return err("contraparte.id required");
      await upsertContraparteDB(c);
      return ok({ id: c.id });
    }

    if (action === "soft_delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await softDeleteContraparteDB(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
