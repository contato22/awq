// ─── GET/POST /api/awq/grc/policies — GRC Policies ────────────────────────────
//
// GET  → list all policies (optionally filtered by ?bu=)
// POST { action: "upsert", policy: GRCPolicy } → upsert one policy
// POST { action: "delete", id: string }        → delete one policy

import { NextRequest, NextResponse } from "next/server";
import {
  getGRCPolicies,
  upsertGRCPolicy,
  deleteGRCPolicy,
  initGRCDB,
  type GRCPolicy,
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
    return ok(await getGRCPolicies(bu));
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
      const policy = body.policy as GRCPolicy;
      if (!policy?.id) return err("policy.id required");
      await upsertGRCPolicy(policy);
      return ok({ id: policy.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteGRCPolicy(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
