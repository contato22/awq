// ─── GET/POST /api/awq/erp/assets — Fixed Assets ─────────────────────────────
//
// GET  → { success: true, data: FixedAsset[] }
// POST { action: "upsert", asset: FixedAsset } → upsert one asset
// POST { action: "delete", id: string }        → delete one asset

import { NextRequest, NextResponse } from "next/server";
import {
  getFixedAssets,
  upsertFixedAsset,
  deleteFixedAsset,
  initERPDB,
  type FixedAsset,
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
    return ok(await getFixedAssets(bu));
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
      const asset = body.asset as FixedAsset;
      if (!asset?.id) return err("asset.id required");
      await upsertFixedAsset(asset);
      return ok({ id: asset.id });
    }

    if (action === "delete") {
      const { id } = body as { id: string };
      if (!id) return err("id required");
      await deleteFixedAsset(id);
      return ok({ id });
    }

    return err(`Unknown action: ${action}`);
  } catch (e) {
    return err(String(e), 500);
  }
}
