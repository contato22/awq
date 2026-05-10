// ─── GET/POST /api/awq/grc/audits — GRC Audits ────────────────────────────────
//
// GET  → list all audits (optionally filtered by ?bu=)
// POST { action: "upsert", audit: GRCAudit } → upsert one audit
// POST { action: "delete", id: string }      → delete one audit

import { NextRequest, NextResponse } from "next/server";
import {
  getGRCAudits,
  upsertGRCAudit,
  deleteGRCAudit,
  initGRCDB,
  type GRCAudit,
} from "@/lib/grc-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initGRCDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    return ok(await getGRCAudits(bu));
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
      const audit = body.audit as GRCAudit;
      if (!audit?.id) return err("audit.id required");
      await upsertGRCAudit(audit);
      return ok({ id: audit.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteGRCAudit(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
