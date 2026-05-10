// ─── GET/POST /api/awq/erp/contracts — ERP Contracts ─────────────────────────
//
// GET  → { success: true, data: ERPContract[] }
// POST { action: "upsert", contract: ERPContract } → upsert one contract
// POST { action: "delete", id: string }            → delete one contract

import { NextRequest, NextResponse } from "next/server";
import {
  getERPContracts,
  upsertERPContract,
  deleteERPContract,
  initERPDB,
  type ERPContract,
} from "@/lib/erp-db";

export const runtime = "nodejs";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initERPDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await ensureDB();
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    return ok(await getERPContracts(bu));
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
      const contract = body.contract as ERPContract;
      if (!contract?.id) return err("contract.id required");
      await upsertERPContract(contract);
      return ok({ id: contract.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteERPContract(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
